import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle, MessageSquare, Star } from "lucide-react";
import { RequestEditDialog } from "@/components/RequestEditDialog";
import { notifyAdmins, notifyUsers } from "@/lib/notify";

export const Route = createFileRoute("/_authenticated/my-requests")({
  head: () => ({ meta: [{ title: "My requests" }] }),
  component: MyRequests,
});

const statusColor: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  collected: "bg-primary/10 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

function MyRequests() {
  const { user, profile } = useAuth();
  const isApproved = profile?.verification_status === "approved";
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-requests", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("requests").select("*, donations(*)").eq("requester_id", user!.id).order("created_at",{ ascending:false })).data ?? [],
  });

  const cancel = async (id: string, itemName: string, donorId?: string | null) => {
    if (!confirm(`Cancel your request for "${itemName}"? The donor and admin will be notified.`)) return;
    const { error } = await supabase.from("requests").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    await notifyAdmins({
      type: "priority_review",
      title: `Request cancelled: ${itemName}`,
      body: "A student no longer needs this item.",
      link: "/admin/requests",
    });
    if (donorId) {
      await notifyUsers([donorId], {
        type: "item_requested",
        title: `Request cancelled: ${itemName}`,
        body: "The student no longer needs this item — it is available again.",
        link: "/my-donations",
      });
    }
    toast.success("Request cancelled");
    qc.invalidateQueries({ queryKey: ["my-requests"] });
  };

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">My requests</h1>
      {!data?.length ? (
        <Card className="p-12 text-center text-muted-foreground">No requests yet. Browse items and request what you need.</Card>
      ) : (
        <div className="grid gap-3">
          {data.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-4 shadow-card">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{r.donations?.item_name ?? "Item removed"}</span>
                  {r.is_priority && <Badge className="bg-warning/15 text-warning"><AlertTriangle className="mr-1 h-3 w-3" />Priority</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">Requested {format(new Date(r.created_at), "MMM d, yyyy")}</div>
                {r.rejection_reason && <div className="mt-1 text-xs text-destructive">Reason: {r.rejection_reason}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusColor[r.status]}>{r.status}</Badge>
                {r.status === "pending" && (
                  <RequestEditDialog request={r} invalidateKeys={["my-requests"]} donorId={r.donations?.donor_id} itemName={r.donations?.item_name} />
                )}
                {(r.status === "pending" || r.status === "approved") && (
                  <Button size="sm" variant="outline" onClick={() => cancel(r.id, r.donations?.item_name ?? "this item", r.donations?.donor_id)}>Cancel</Button>
                )}
                {isApproved && (r.status === "approved" || r.status === "collected") && r.donations?.donor_id && (
                  <Link to="/messages" search={{ to: r.donations.donor_id }}>
                    <Button size="sm" variant="outline"><MessageSquare className="mr-1 h-3 w-3" />Message donor</Button>
                  </Link>
                )}
                {r.status === "collected" && r.donations && <RateDialog requestId={r.id} rateeId={r.donations.donor_id} />}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashLayout>
  );
}

function RateDialog({ requestId, rateeId }: { requestId: string; rateeId: string }) {
  const { user } = useAuth();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const submit = async () => {
    if (!user) return;
    const { error } = await supabase.from("ratings").insert({ request_id: requestId, rater_id: user.id, ratee_id: rateeId, stars, comment });
    if (error) toast.error(error.message); else { toast.success("Thanks for rating!"); setOpen(false); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Star className="mr-1 h-3 w-3" />Rate donor</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Rate this donor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => setStars(n)} type="button">
                <Star className={`h-7 w-7 ${n <= stars ? "fill-warning text-warning" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Optional comment" value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button onClick={submit} className="w-full bg-gradient-primary text-primary-foreground">Submit rating</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
