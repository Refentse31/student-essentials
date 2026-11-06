import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, Clock, XCircle, MessageSquare, Bell, Upload, Search, FileCheck, Sparkles, Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Student Essentials" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, roles } = useAuth();
  const isUnfunded = roles.includes("unfunded");
  const isDonor = roles.includes("donor");
  const uid = user?.id;

  const { data: counts } = useQuery({
    queryKey: ["dash-counts", uid, isUnfunded ? "u" : "d"],
    enabled: !!uid,
    queryFn: async () => {
      if (isUnfunded) {
        const [approved, pending, collected, monthCount, priority] = await Promise.all([
          supabase.from("requests").select("id", { count: "exact", head: true }).eq("requester_id", uid!).eq("status", "approved"),
          supabase.from("requests").select("id", { count: "exact", head: true }).eq("requester_id", uid!).eq("status", "pending"),
          supabase.from("requests").select("id", { count: "exact", head: true }).eq("requester_id", uid!).eq("status", "collected"),
          supabase.from("requests").select("id", { count: "exact", head: true }).eq("requester_id", uid!).gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).neq("status","cancelled"),
          supabase.from("requests").select("id", { count: "exact", head: true }).eq("requester_id", uid!).eq("is_priority", true),
        ]);
        return {
          approved: approved.count ?? 0,
          pending: pending.count ?? 0,
          received: collected.count ?? 0,
          remaining: Math.max(0, 3 - (monthCount.count ?? 0)),
          priority: priority.count ?? 0,
        };
      }
      const [my, ap, pe, re] = await Promise.all([
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", uid!),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", uid!).eq("status","approved"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", uid!).eq("status","pending"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("donor_id", uid!).eq("status","rejected"),
      ]);
      return { my: my.count ?? 0, approved: ap.count ?? 0, pending: pe.count ?? 0, rejected: re.count ?? 0 };
    },
  });

  const { data: notif } = useQuery({
    queryKey: ["notif-unread", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid!).eq("read", false)).count ?? 0,
  });

  return (
    <DashLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Welcome back, {profile?.first_name || "Student"} 👋</h1>
        {isUnfunded && profile?.verification_status !== "approved" && (
          <Link to="/verify">
            <Button variant="outline" className="border-warning text-warning"><FileCheck className="mr-2 h-4 w-4" />
              {profile?.verification_status === "pending" ? "Verification pending" : "Get verified"}
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isDonor && (
          <>
            <StatCard label="My donations" value={counts?.my ?? 0} icon={Package} />
            <StatCard label="Approved" value={counts?.approved ?? 0} icon={CheckCircle2} accent="success" />
            <StatCard label="Pending" value={counts?.pending ?? 0} icon={Clock} accent="warning" />
            <StatCard label="Rejected" value={counts?.rejected ?? 0} icon={XCircle} accent="destructive" />
          </>
        )}
        {isUnfunded && (
          <>
            <StatCard label="Approved requests" value={counts?.approved ?? 0} icon={CheckCircle2} accent="success" />
            <StatCard label="Pending requests" value={counts?.pending ?? 0} icon={Clock} accent="warning" />
            <StatCard label="Items received" value={counts?.received ?? 0} icon={Package} />
            <StatCard label="Remaining this month" value={counts?.remaining ?? 3} icon={Sparkles} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold">Quick actions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {isDonor && <Link to="/donate"><Button className="bg-gradient-primary text-primary-foreground"><Upload className="mr-2 h-4 w-4" />Upload donation</Button></Link>}
            {isUnfunded && <Link to="/browse-items"><Button className="bg-gradient-primary text-primary-foreground"><Search className="mr-2 h-4 w-4" />Browse items</Button></Link>}
            <Link to="/messages"><Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" />Messages</Button></Link>
            <Link to="/notifications"><Button variant="outline"><Bell className="mr-2 h-4 w-4" />Notifications {notif ? <Badge className="ml-2 bg-destructive text-destructive-foreground">{notif}</Badge> : null}</Button></Link>
          </div>
        </Card>

        {isUnfunded && <AIRecommendations />}
        {isDonor && (
          <Card className="p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-warning" />Thank you</h2>
            <p className="mt-2 text-sm text-muted-foreground">Every approved donation goes to a verified student in real need. Pickup is always at the <strong>Campus Library</strong>.</p>
          </Card>
        )}
      </div>
    </DashLayout>
  );
}

function AIRecommendations() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-recs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { aiRecommendItems } = await import("@/lib/ai.functions");
      return aiRecommendItems();
    },
  });

  return (
    <Card className="p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" />Recommended for you</h2>
      {isLoading ? <p className="mt-2 text-sm text-muted-foreground">AI is finding items that match you…</p>
        : !data?.items?.length ? <p className="mt-2 text-sm text-muted-foreground">Browse a few items so we can recommend better matches.</p>
        : (
        <ul className="mt-3 space-y-2">
          {data.items.slice(0,5).map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
              <div>
                <div className="font-medium">{it.item_name}</div>
                <div className="text-xs text-muted-foreground capitalize">{it.category} · {it.reason}</div>
              </div>
              <Link to="/browse-items"><Button size="sm" variant="outline">View</Button></Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
