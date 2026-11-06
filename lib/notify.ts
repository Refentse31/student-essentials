import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type NotifType = Database["public"]["Enums"]["notification_type"];

export interface NotifyPayload {
  type: NotifType;
  title: string;
  body?: string | null;
  link?: string | null;
}

export async function notifyUsers(userIds: string[], n: NotifyPayload) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return;
  await supabase.from("notifications").insert(
    ids.map((user_id) => ({ user_id, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null })),
  );
}

export async function notifyAdmins(n: NotifyPayload) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.rpc as any)("notify_admins", {
    _type: n.type, _title: n.title, _body: n.body ?? null, _link: n.link ?? null,
  });
}
