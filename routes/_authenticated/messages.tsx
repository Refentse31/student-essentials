import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarSrc, initialsOf } from "@/lib/avatarImage";
import { useState, useMemo, useEffect, useRef } from "react";
import { MessageSquare, Send, Shield } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

const searchSchema = z.object({ to: z.string().uuid().optional(), pair: z.string().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: Messages,
});

type Msg = { id: string; sender_id: string; receiver_id: string; body: string; created_at: string };

function Messages() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isUnfunded = roles.includes("unfunded");
  const canMessage = isAdmin || !isUnfunded || profile?.verification_status === "approved";
  const search = Route.useSearch();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(search.to ?? null); // for user: partner id; for admin: "a|b"
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (search.to && !isAdmin) setSelected(search.to);
    if (search.pair && isAdmin) setSelected(search.pair);
  }, [search.to, search.pair, isAdmin]);

  // For non-admin: fetch messages involving the user
  const { data: mine } = useQuery({
    queryKey: ["messages-mine", user?.id], enabled: !!user && !isAdmin,
    queryFn: async () => ((await supabase.from("messages").select("*").or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`).order("created_at", { ascending: true })).data ?? []) as Msg[],
  });

  // For admin: fetch all messages
  const { data: allMsgs } = useQuery({
    queryKey: ["messages-all-admin"], enabled: !!user && isAdmin,
    queryFn: async () => ((await supabase.from("messages").select("*").order("created_at", { ascending: true })).data ?? []) as Msg[],
  });

  // Threads for user
  const userThreads = useMemo(() => {
    if (isAdmin) return [];
    const map = new Map<string, { partner: string; last: string; created: string }>();
    (mine ?? []).forEach((m) => {
      const partner = m.sender_id === user?.id ? m.receiver_id : m.sender_id;
      const existing = map.get(partner);
      if (!existing || existing.created < m.created_at) map.set(partner, { partner, last: m.body, created: m.created_at });
    });
    // Seed a thread from ?to= even without messages yet
    if (search.to && !map.has(search.to)) {
      map.set(search.to, { partner: search.to, last: "Start a conversation…", created: new Date(0).toISOString() });
    }
    return Array.from(map.values()).sort((a, b) => b.created.localeCompare(a.created));
  }, [mine, user, isAdmin, search.to]);

  // Threads for admin: pair keys "a|b" (sorted uuids)
  const adminThreads = useMemo(() => {
    if (!isAdmin) return [];
    const map = new Map<string, { pair: string; a: string; b: string; last: string; created: string; count: number }>();
    (allMsgs ?? []).forEach((m) => {
      const [a, b] = [m.sender_id, m.receiver_id].sort();
      const key = `${a}|${b}`;
      const existing = map.get(key);
      if (!existing) map.set(key, { pair: key, a, b, last: m.body, created: m.created_at, count: 1 });
      else {
        existing.count++;
        if (existing.created < m.created_at) { existing.last = m.body; existing.created = m.created_at; }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.created.localeCompare(a.created));
  }, [allMsgs, isAdmin]);

  const partnerIds = useMemo(() => {
    if (isAdmin) return Array.from(new Set(adminThreads.flatMap((t) => [t.a, t.b])));
    return Array.from(new Set([...userThreads.map((t) => t.partner), ...(user ? [user.id] : [])]));
  }, [isAdmin, adminThreads, userThreads, user]);

  const { data: profiles } = useQuery({
    queryKey: ["thread-profiles", partnerIds.join(",")], enabled: partnerIds.length > 0,
    queryFn: async () => (await supabase.from("profiles").select("id,first_name,last_name,email,avatar_url").in("id", partnerIds)).data ?? [],
  });

  const avatarOf = (id: string) => {
    const p = profiles?.find((p) => p.id === id);
    return avatarSrc(p?.avatar_url);
  };

  const initialsFor = (id: string) => {
    const p = profiles?.find((p) => p.id === id);
    return initialsOf(p?.first_name, p?.last_name, p?.email ?? id);
  };

  const PersonAvatar = ({ id, className = "h-8 w-8" }: { id: string; className?: string }) => (
    <Avatar className={className}>
      <AvatarImage src={avatarOf(id)} alt="" />
      <AvatarFallback className="text-[10px]">{initialsFor(id)}</AvatarFallback>
    </Avatar>
  );

  const nameOf = (id: string) => {
    const p = profiles?.find((p) => p.id === id);
    if (!p) return id.slice(0, 8);
    const n = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
    return n || p.email || id.slice(0, 8);
  };

  // Conversation messages for selected
  const conv = useMemo(() => {
    if (!selected) return [];
    if (isAdmin) {
      const [a, b] = selected.split("|");
      return (allMsgs ?? []).filter((m) =>
        (m.sender_id === a && m.receiver_id === b) || (m.sender_id === b && m.receiver_id === a)
      );
    }
    return (mine ?? []).filter((m) => m.sender_id === selected || m.receiver_id === selected);
  }, [selected, isAdmin, allMsgs, mine]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [conv.length]);

  const send = async () => {
    if (!user || !selected || !draft.trim() || isAdmin) return;
    if (!canMessage) { toast.error("Your account must be verified by an administrator before you can send messages."); return; }
    const body = draft.trim(); setDraft("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, receiver_id: selected, body });
    if (error) { toast.error(error.message); setDraft(body); return; }
    await supabase.from("notifications").insert({ user_id: selected, type: "message_received", title: "New message", body: body.slice(0, 80), link: "/messages" });
    qc.invalidateQueries({ queryKey: ["messages-mine"] });
  };

  const headerTitle = (() => {
    if (!selected) return "";
    if (isAdmin) {
      const [a, b] = selected.split("|");
      return `${nameOf(a)} ↔ ${nameOf(b)}`;
    }
    return nameOf(selected);
  })();

  return (
    <DashLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        {isAdmin && <Badge className="bg-primary/10 text-primary"><Shield className="mr-1 h-3 w-3" />Admin — viewing all conversations</Badge>}
      </div>
      <Card className="grid h-[70vh] grid-cols-1 overflow-hidden shadow-card md:grid-cols-[300px_1fr]">
        <div className="overflow-y-auto border-r border-border bg-muted/20">
          {isAdmin ? (
            !adminThreads.length ? (
              <EmptyList label="No conversations on the platform yet" />
            ) : adminThreads.map((t) => (
              <button key={t.pair} onClick={() => setSelected(t.pair)} className={`flex w-full items-center gap-3 border-b border-border p-3 text-left text-sm hover:bg-accent ${selected === t.pair ? "bg-accent" : ""}`}>
                <div className="flex -space-x-2">
                  <PersonAvatar id={t.a} className="h-8 w-8 ring-2 ring-background" />
                  <PersonAvatar id={t.b} className="h-8 w-8 ring-2 ring-background" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{nameOf(t.a)} ↔ {nameOf(t.b)}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{t.last}</span>
                  <span className="text-[10px] text-muted-foreground">{t.count} message{t.count === 1 ? "" : "s"}</span>
                </div>
              </button>
            ))
          ) : (
            !userThreads.length ? (
              <EmptyList label="No conversations yet" />
            ) : userThreads.map((t) => (
              <button key={t.partner} onClick={() => setSelected(t.partner)} className={`flex w-full items-center gap-3 border-b border-border p-3 text-left text-sm hover:bg-accent ${selected === t.partner ? "bg-accent" : ""}`}>
                <PersonAvatar id={t.partner} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{nameOf(t.partner)}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{t.last}</span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border p-3 font-medium">
                {isAdmin ? (
                  <div className="flex -space-x-2">
                    <PersonAvatar id={selected.split("|")[0]} className="h-7 w-7 ring-2 ring-background" />
                    <PersonAvatar id={selected.split("|")[1]} className="h-7 w-7 ring-2 ring-background" />
                  </div>
                ) : (
                  <PersonAvatar id={selected} className="h-7 w-7" />
                )}
                <span className="truncate">{headerTitle}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {!conv.length && <div className="text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</div>}
                {conv.map((m) => {
                  const mineMsg = !isAdmin && m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex items-end gap-2 ${mineMsg ? "justify-end" : "justify-start"}`}>
                      {!mineMsg && <PersonAvatar id={m.sender_id} className="h-7 w-7 shrink-0" />}
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mineMsg ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        {isAdmin && <div className="mb-1 text-[10px] font-medium opacity-80">{nameOf(m.sender_id)}</div>}
                        <div>{m.body}</div>
                        <div className="mt-1 text-[10px] opacity-70">{format(new Date(m.created_at), "MMM d, HH:mm")}</div>
                      </div>
                      {mineMsg && <PersonAvatar id={user!.id} className="h-7 w-7 shrink-0" />}
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {isAdmin ? (
                <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
                  Read-only admin view. Admins cannot send messages in a user conversation.
                </div>
              ) : canMessage ? (
                <div className="flex items-center gap-2 border-t border-border p-3">
                  <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" />
                  <Button onClick={send} className="bg-gradient-primary text-primary-foreground"><Send className="h-4 w-4" /></Button>
                </div>
              ) : (
                <div className="border-t border-border p-3 text-center text-sm text-muted-foreground">
                  Your account must be approved before you can send messages.
                </div>
              )}
            </>
          )}
        </div>
      </Card>
      {!isAdmin && !userThreads.length && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Tip: open an approved request or donation and use the <Link to="/my-requests" className="text-primary underline">Message</Link> button to start a chat.
        </p>
      )}
    </DashLayout>
  );
}

function EmptyList({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
      <MessageSquare className="mb-2 h-8 w-8" />{label}
    </div>
  );
}
