import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";
import { normalizePhrase } from "@/lib/recovery";

function hashPhrase(phrase: string) {
  return createHash("sha256").update(normalizePhrase(phrase)).digest("hex");
}

/** Verify a recovery phrase and set a new password. Public by design (that's the point of the phrase). */
export const resetPasswordWithPhrase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().email(),
        phrase: z.string().min(4),
        newPassword: z.string().min(6).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();

    let userId: string | null = null;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (profile) userId = profile.id;

    if (!userId) {
      // Fall back to the auth users list (profile row may be missing or have a different email)
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);
      if (found) userId = found.id;
    }

    if (!userId) return { ok: false as const, error: "Email and recovery phrase do not match." };

    const { data: row } = await supabaseAdmin
      .from("recovery_phrases")
      .select("phrase_hash")
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "No recovery phrase is saved for this account." };
    if (row.phrase_hash !== hashPhrase(data.phrase))
      return { ok: false as const, error: "Email and recovery phrase do not match." };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: data.newPassword,
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });


/** Store (or replace) the hashed recovery phrase for the signed-in user's account. */
export const saveRecoveryPhrase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ phrase: z.string().min(4) }).parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("recovery_phrases")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) throw new Error("A recovery phrase already exists for this account.");

    const { error } = await supabaseAdmin
      .from("recovery_phrases")
      .insert({ user_id: userId, phrase_hash: hashPhrase(data.phrase) });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Whether the signed-in user already has a recovery phrase saved. */
export const hasRecoveryPhrase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("recovery_phrases")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { exists: !!data };
  });
