import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { RequestEditDialog } from "@/components/RequestEditDialog";
import { ReasonDialog } from "@/components/ReasonDialog";

export const Route = createFileRoute("/_authenticated/admin/requests")({
  head: () => ({ meta: [{ title: "Requests — Admin" }] }),
  component: RequestsAdmin,
});

function RequestsAdmin() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const { data } = useQuery({
    queryKey: ["admin-requests"], enabled: isAdmin,
    queryFn: async () => (await supabase.from("requests")
      .select("*, donations(item_name,category,donor_id), profiles!requests_requester_profile_fk(first_name,last_name,email)")
      .order("is_priority", { ascending: false })
      .order("created_at", { ascending: false })).data ?? [],
  });

  const setStatus = async (id: string, requester_id: string, item_name: string, status: "approved"|"rejected"|"collected", reason?: string) => {
    const updates: { status: typeof status; reviewed_at: string; rejection_reason?: string | null; collected_at?: string } = { status, reviewed_at: new Date().toISOString() };
    if (status === "rejected") updates.rejection_reason = reason ?? null;
    if (status === "collected") updates.collected_at = new Date().toISOString();
    const { error } = await supabase.from("requests").update(updates).eq("id", id);
    if (error) return toast.error(error.message);


    const notifMap = { approved: "request_approved", rejected: "request_rejected", collected: "item_collected" } as const;
    await supabase.from("notifications").insert({
      user_id: requester_id, type: notifMap[status],
      title: `Request ${status}: ${item_name}`,
      body: reason ?? (status === "collected" ? "Marked collected at Campus Library." : null),
      link: "/my-requests",
    });
    const donorId = data?.find((x) => x.id === id)?.donations?.donor_id;
    if (donorId && status !== "rejected") {
      await supabase.from("notifications").insert({
        user_id: donorId, type: notifMap[status],
        title: status === "approved" ? `Request approved for your item: ${item_name}` : `Your item was collected: ${item_name}`,
        body: status === "approved" ? "You can now message the student." : "Thank you for donating!",
        link: "/my-donations",
      });
    }
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
    toast.success(`Marked ${status}`);
  };

  if (!isAdmin) return <DashLayout><Card className="p-12 text-center">Admin only</Card></DashLayout>;

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Requests</h1>
      <div className="space-y-3">
        {(data ?? []).map((r) => (
          <Card key={r.id} className={`p-4 shadow-card ${r.is_priority ? "border-warning/60 bg-warning/5" : ""}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.donations?.item_name ?? "Item"}</span>
                  <Badge variant="secondary" className="capitalize">{r.donations?.category}</Badge>
                  <Badge className="capitalize">{r.status}</Badge>
                  {r.is_priority && <Badge className="bg-warning/15 text-warning"><AlertTriangle className="mr-1 h-3 w-3" />Priority</Badge>}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.profiles?.first_name} {r.profiles?.last_name} · {format(new Date(r.created_at),"MMM d")}
                </div>
                {r.priority_reason && <div className="mt-1 text-sm">Reason: {r.priority_reason}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.status !== "cancelled" && <RequestEditDialog request={r} invalidateKeys={["admin-requests"]} />}
                {r.status === "pending" && <>
                  <ReasonDialog
                    triggerLabel="Reject"
                    title="Reject this request"
                    description="The student will see this reason on their requests page."
                    confirmLabel="Reject request"
                    onConfirm={async (reason) => { await setStatus(r.id, r.requester_id, r.donations?.item_name ?? "Item", "rejected", reason); }}
                  />
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => setStatus(r.id, r.requester_id, r.donations?.item_name ?? "Item", "approved")}>Approve</Button>
                </>}
                {r.status === "approved" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, r.requester_id, r.donations?.item_name ?? "Item", "collected")}>Mark collected</Button>}
              </div>
            </div>
          </Card>
        ))}
        {!data?.length && <Card className="p-12 text-center text-muted-foreground">No requests yet.</Card>}
      </div>
    </DashLayout>
  );
}
