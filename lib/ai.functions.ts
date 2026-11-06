import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface ChatMessage { role: "system" | "user"; content: string }

async function callLovableAI(messages: ChatMessage[]): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0,200)}`);
  }
  const j = await res.json() as { choices: { message: { content: string } }[] };
  return j.choices[0]?.message?.content ?? "{}";
}

export interface RecommendItem { id: string; item_name: string; category: string; reason: string }

export const aiRecommendItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: RecommendItem[] }> => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: history }, { data: available }] = await Promise.all([
      supabase.from("profiles").select("verification_status").eq("id", userId).maybeSingle(),
      supabase.from("requests").select("donation_id, donations(category,item_name)").eq("requester_id", userId).limit(20),
      supabase.from("donations").select("id,item_name,category,description").eq("status","approved").limit(40),
    ]);

    if (!available?.length) return { items: [] };

    const hist = (history ?? []).map(h => h.donations?.category).filter(Boolean);
    const prompt = `You are an assistant matching free donations to a verified student in need.
Previously requested categories: ${hist.join(", ") || "none"}

Available items (id | name | category | desc):
${available.map(a => `${a.id} | ${a.item_name} | ${a.category} | ${(a.description ?? "").slice(0,60)}`).join("\n")}

Pick up to 5 most useful items. Return strict JSON:
{ "items": [{ "id": "...", "reason": "short why (max 12 words)" }] }`;

    try {
      const content = await callLovableAI([
        { role: "system", content: "You return only valid JSON. No prose." },
        { role: "user", content: prompt },
      ]);
      const parsed = JSON.parse(content) as { items: { id: string; reason: string }[] };
      const lookup = new Map(available.map(a => [a.id, a]));
      const items: RecommendItem[] = [];
      for (const p of parsed.items ?? []) {
        const a = lookup.get(p.id);
        if (a) items.push({ id: a.id, item_name: a.item_name, category: a.category as string, reason: p.reason });
      }
      return { items };
    } catch (e) {
      console.error("AI recommend failed", e);
      // Fallback: simple category-match
      const fallback = available.slice(0, 5).map(a => ({ id: a.id, item_name: a.item_name, category: a.category, reason: "Newly available" }));
      return { items: fallback };
    }
  });

export interface InsightOutput { summary: string; predictions: string[] }

export const aiAdminInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InsightOutput> => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const [{ data: dCat }, { data: rCat }, { data: recentReq }] = await Promise.all([
      supabase.from("donations").select("category,status,created_at").gte("created_at", new Date(Date.now() - 90*86400000).toISOString()),
      supabase.from("requests").select("donation_id,created_at,is_priority"),
      supabase.from("requests").select("donations(category)").gte("created_at", new Date(Date.now() - 30*86400000).toISOString()).limit(200),
    ]);

    const donByCat: Record<string,number> = {};
    (dCat ?? []).forEach(d => { donByCat[d.category] = (donByCat[d.category] ?? 0) + 1; });
    const reqByCat: Record<string,number> = {};
    (recentReq ?? []).forEach(r => { const c = r.donations?.category; if (c) reqByCat[c] = (reqByCat[c] ?? 0) + 1; });

    const prompt = `You are analyzing a campus donation platform.
Donations by category (last 90 days): ${JSON.stringify(donByCat)}
Requests by category (last 30 days): ${JSON.stringify(reqByCat)}
Total requests: ${recentReq?.length ?? 0}. Priority requests: ${(rCat ?? []).filter(r => r.is_priority).length}.

Return strict JSON: { "summary": "2-sentence overview", "predictions": ["...","..."] }
Up to 5 short predictions about likely future demand (food, books, winter clothes, exam period, etc.).`;

    try {
      const content = await callLovableAI([
        { role: "system", content: "You return only valid JSON. No prose." },
        { role: "user", content: prompt },
      ]);
      return JSON.parse(content) as InsightOutput;
    } catch (e) {
      console.error("AI insights failed", e);
      return { summary: "AI insights are temporarily unavailable.", predictions: [] };
    }
  });
