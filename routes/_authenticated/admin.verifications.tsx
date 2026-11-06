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
import { useServerFn } from "@tanstack/react-start";
import { adminDeleteVerification } from "@/lib/admin.functions";
import { notifyUsers } from "@/lib/notify";
import { ReasonDialog, ConfirmDialog } from "@/components/ReasonDialog";

export const Route = createFileRoute("/_authenticated/admin/verifications")({
  head: () => ({ meta: [{ title: "Verifications — Admin" }] }),
  component: VerifyAdmin,
});

function VerifyAdmin() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");
  const { data } = useQuery({
    queryKey: ["admin-verifications"], enabled: isAdmin,
    queryFn: async () => (await supabase.from("verifications").select("*, profiles!verifications_user_profile_fk(first_name,last_name,email)").order("created_at",{ascending:false})).data ?? [],
  });

  const act = async (id: string, user_id: string, status: "approved"|"rejected", note?: string) => {
    const { error } = await supabase.from("verifications").update({ status, review_note: note ?? null, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await supabase.from("notifications").insert({
      user_id, type: status === "approved" ? "verification_approved" : "verification_rejected",
      title: status === "approved" ? "Verification approved!" : "Verification rejected",
      body: note ?? (status === "approved" ? "You can now request items." : "Please review and resubmit."),
      link: "/verify",
    });
    qc.invalidateQueries({ queryKey: ["admin-verifications"] });
    toast.success(`Marked ${status}`);
  };

  const deleteFn = useServerFn(adminDeleteVerification);
  const removeVerification = async (id: string, user_id: string) => {
    try {
      await deleteFn({ data: { verificationId: id } });
      await notifyUsers([user_id], {
        type: "verification_rejected",
        title: "Verification submission removed",
        body: "An administrator permanently removed your verification submission. You may submit a new one.",
        link: "/verify",
      });
      qc.invalidateQueries({ queryKey: ["admin-verifications"] });
      toast.success("Verification deleted permanently");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  if (!isAdmin) return <DashLayout><Card className="p-12 text-center">Admin only</Card></DashLayout>;

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Verifications</h1>
      {!data?.length ? <Card className="p-12 text-center text-muted-foreground">No verifications submitted.</Card> :
        <div className="space-y-3">
          {data.map((v) => (
            <Card key={v.id} className="p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{v.profiles?.first_name} {v.profiles?.last_name}</span>
                    <Badge variant="secondary">{v.profiles?.email}</Badge>
                    <Badge className="capitalize">{v.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Student # {v.student_number} · {format(new Date(v.created_at),"MMM d, yyyy")}</div>
                  <p className="mt-2 text-sm"><strong>Motivation:</strong> {v.motivation}</p>
                  <p className="text-sm"><strong>Financial status:</strong> {v.financial_status}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {v.status === "pending" && (
                    <>
                      <ReasonDialog
                        triggerLabel="Reject"
                        title="Reject this verification"
                        description="The student will see this reason and can resubmit."
                        confirmLabel="Reject student"
                        onConfirm={async (r) => { await act(v.id, v.user_id, "rejected", r); }}
                      />
                      <Button size="sm" className="bg-gradient-primary text-primary-foreground" onClick={() => act(v.id, v.user_id, "approved")}>Approve</Button>
                    </>
                  )}
                  {v.status === "approved" && (
                    <ReasonDialog
                      triggerLabel="Disapprove"
                      title="Disapprove this student"
                      description="They will lose the ability to request items or send messages until verified again."
                      confirmLabel="Disapprove student"
                      onConfirm={async (r) => { await act(v.id, v.user_id, "rejected", r); }}
                    />
                  )}
                  <ConfirmDialog
                    triggerLabel="Delete"
                    title="Delete this verification permanently?"
                    description="This cannot be undone. The student may submit a new verification."
                    confirmLabel="Delete permanently"
                    onConfirm={() => removeVerification(v.id, v.user_id)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      }
    </DashLayout>
  );
}
