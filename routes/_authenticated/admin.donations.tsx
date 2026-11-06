import { itemImageSrc } from "@/lib/itemImage";
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
import { adminDeleteDonation } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import { notifyUsers } from "@/lib/notify";
import { ReasonDialog, ConfirmDialog } from "@/components/ReasonDialog";

export const Route = createFileRoute("/_authenticated/admin/donations")({
  head: () => ({ meta: [{ title: "Donations — Admin" }] }),
  component: DonationsAdmin,
});

function DonationsAdmin() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const { data } = useQuery({
    queryKey: ["admin-donations"], enabled: isAdmin,
    queryFn: async () => (await supabase.from("donations").select("*, profiles!donations_donor_profile_fk(first_name,last_name,email)").order("created_at",{ascending:false})).data ?? [],
  });

  const act = async (id: string, donor_id: string, name: string, status: "approved"|"rejected", reason?: string) => {
    const { error } = await supabase.from("donations").update({ status, rejection_reason: reason ?? null, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id: donor_id, type: status === "approved" ? "donation_approved" : "donation_rejected",
      title: status === "approved" ? `Donation approved: ${name}` : `Donation rejected: ${name}`,
      body: reason ?? null, link: "/my-donations",
    });
    qc.invalidateQueries({ queryKey: ["admin-donations"] });
    toast.success(`Marked ${status}`);
  };

  const deleteFn = useServerFn(adminDeleteDonation);
  const removeItem = async (id: string, donor_id: string, name: string) => {
    try {
      await deleteFn({ data: { donationId: id } });
      await notifyUsers([donor_id], {
        type: "donation_rejected",
        title: `Item removed: ${name}`,
        body: "An administrator permanently removed this item from the platform.",
        link: "/my-donations",
      });
      qc.invalidateQueries({ queryKey: ["admin-donations"] });
      toast.success("Item deleted permanently");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (!isAdmin) return <DashLayout><Card className="p-12 text-center">Admin only</Card></DashLayout>;

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Donations</h1>
      <div className="grid gap-3">
        {(data ?? []).map((d) => (
          <Card key={d.id} className="flex flex-wrap items-center gap-4 p-4 shadow-card">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {d.image_url && <img src={itemImageSrc(d.image_url)!} alt={d.item_name} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{d.item_name}</span>
                <Badge variant="secondary" className="capitalize">{d.category}</Badge>
                <Badge className="capitalize">{d.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {d.profiles?.first_name} {d.profiles?.last_name} · {d.profiles?.email} · {format(new Date(d.created_at),"MMM d")}
              </div>
              {d.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>}
            </div>
            <div className="flex gap-2">
              {d.status === "approved" && (
                <ReasonDialog
                  triggerLabel="Disapprove"
                  title="Disapprove this item"
                  description="The donor will be notified with this reason."
                  confirmLabel="Disapprove item"
                  onConfirm={async (r) => { await act(d.id, d.donor_id, d.item_name, "rejected", r); }}
                />
              )}
              <ConfirmDialog
                triggerLabel="Delete"
                title={`Permanently delete "${d.item_name}"?`}
                description="This cannot be undone."
                confirmLabel="Delete permanently"
                onConfirm={() => removeItem(d.id, d.donor_id, d.item_name)}
              />
              {d.status === "pending" && (
                <>
                  <ReasonDialog
                    triggerLabel="Reject"
                    title="Reject this item"
                    description="The donor will see this reason."
                    confirmLabel="Reject item"
                    onConfirm={async (r) => { await act(d.id, d.donor_id, d.item_name, "rejected", r); }}
                  />
                  <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => act(d.id, d.donor_id, d.item_name, "approved")}>Approve</Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {!data?.length && <Card className="p-12 text-center text-muted-foreground">No donations yet.</Card>}
      </div>
    </DashLayout>
  );
}
