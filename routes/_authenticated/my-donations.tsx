import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { DonationEditDialog } from "@/components/DonationEditDialog";

export const Route = createFileRoute("/_authenticated/my-donations")({
  head: () => ({ meta: [{ title: "My donations" }] }),
  component: MyDonations,
});

const statusColor: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  collected: "bg-primary/10 text-primary",
  reserved: "bg-accent text-accent-foreground",
};

const reqStatusColor: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  approved: "bg-success/15 text-success",
  rejected: "bg-destructive/10 text-destructive",
  collected: "bg-primary/10 text-primary",
  cancelled: "bg-muted text-muted-foreground",
};

function MyDonations() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["my-donations", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("donations").select("*").eq("donor_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const donationIds = (data ?? []).map((d) => d.id);
  const { data: requests } = useQuery({
    queryKey: ["donation-requests", donationIds.join(",")], enabled: donationIds.length > 0,
    queryFn: async () => {
      const { data: reqs } = await supabase.from("requests").select("*").in("donation_id", donationIds).neq("status", "cancelled").order("created_at", { ascending: false });
      const requesterIds = Array.from(new Set((reqs ?? []).map((r) => r.requester_id)));
      const { data: profs } = requesterIds.length
        ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", requesterIds)
        : { data: [] as { id: string; first_name: string | null; last_name: string | null; email: string | null }[] };
      const nameById = new Map(profs?.map((p) => [p.id, `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email || p.id.slice(0, 8)]));
      return (reqs ?? []).map((r) => ({ ...r, requester_name: nameById.get(r.requester_id) ?? r.requester_id.slice(0, 8) }));
    },
  });

  const requestsByDonation = new Map<string, typeof requests>();
  (requests ?? []).forEach((r) => {
    const arr = requestsByDonation.get(r.donation_id) ?? [];
    arr.push(r);
    requestsByDonation.set(r.donation_id, arr);
  });

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">My donations</h1>
      {!data?.length ? (
        <Card className="p-12 text-center text-muted-foreground">You haven't uploaded any donations yet.</Card>
      ) : (
        <div className="space-y-4">
          {data.map((d) => {
            const reqs = requestsByDonation.get(d.id) ?? [];
            return (
              <Card key={d.id} className="p-5 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{d.item_name}</span>
                      <Badge className={statusColor[d.status] ?? ""}>{d.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.category} · Qty {d.quantity} · Uploaded {format(new Date(d.created_at), "MMM d, yyyy")}
                    </div>
                    {d.rejection_reason && <div className="mt-1 text-xs text-destructive">Note: {d.rejection_reason}</div>}
                  </div>
                  {d.status !== "collected" && (
                    <DonationEditDialog donation={d} invalidateKeys={["my-donations"]} />
                  )}
                </div>

                {reqs.length > 0 && (
                  <div className="mt-4 border-t border-border pt-3">
                    <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Requests ({reqs.length})</div>
                    <div className="space-y-2">
                      {reqs.map((r) => (
                        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{r.requester_name}</span>
                            <Badge className={reqStatusColor[r.status]}>{r.status}</Badge>
                            <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d")}</span>
                          </div>
                          {(r.status === "approved" || r.status === "collected") && (
                            <Link to="/messages" search={{ to: r.requester_id }}>
                              <Button size="sm" variant="outline"><MessageSquare className="mr-1 h-3 w-3" />Message</Button>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </DashLayout>
  );
}
