import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [active, setActive] = useState<Notif | null>(null);
  const { data } = useQuery({
    queryKey: ["notifications", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at",{ ascending:false })).data ?? [],
  });

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    toast.success("All marked as read");
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  const open = async (n: Notif) => {
    setActive(n);
    if (!n.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
    }
  };

  return (
    <DashLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Notifications</h1>
        <Button variant="outline" onClick={markAll}><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>
      </div>
      {!data?.length ? (
        <Card className="flex flex-col items-center gap-2 p-12 text-muted-foreground"><Bell className="h-8 w-8" />No notifications yet</Card>
      ) : (
        <div className="space-y-2">
          {data.map((n) => (
            <Card
              key={n.id}
              onClick={() => void open(n)}
              className={`flex cursor-pointer items-start gap-3 p-4 shadow-card transition-colors hover:bg-accent/40 ${!n.read ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <Bell className="mt-0.5 h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="line-clamp-2 text-sm text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); void remove(n.id); }}><Trash2 className="h-4 w-4" /></Button>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.title}</DialogTitle>
            <DialogDescription>
              {active ? formatDistanceToNow(new Date(active.created_at), { addSuffix: true }) : ""}
            </DialogDescription>
          </DialogHeader>
          {active?.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{active.body}</p>}
          <DialogFooter className="gap-2">
            {active?.link && (
              <Button onClick={() => { setActive(null); navigate({ to: active.link! }); }}>
                Open related page
              </Button>
            )}
            <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashLayout>
  );
}
