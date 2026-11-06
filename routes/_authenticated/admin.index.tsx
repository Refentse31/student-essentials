import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { Users, Package, FileCheck, AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin — Student Essentials" }] }),
  component: AdminDash,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "12px",
  color: "var(--popover-foreground)",
} as const;

function AdminDash() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"], enabled: isAdmin,
    queryFn: async () => {
      const [users, donors, verified, pendVer, pendDon, pendReq, prioReq, avail, collected] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role","donor"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("verification_status","approved"),
        supabase.from("verifications").select("id", { count: "exact", head: true }).eq("status","pending"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("status","pending"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("status","pending"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("is_priority", true).eq("status","pending"),
        supabase.from("donations").select("id", { count: "exact", head: true }).eq("status","approved"),
        supabase.from("requests").select("id", { count: "exact", head: true }).eq("status","collected"),
      ]);
      return { users: users.count ?? 0, donors: donors.count ?? 0, verified: verified.count ?? 0, pendVer: pendVer.count ?? 0, pendDon: pendDon.count ?? 0, pendReq: pendReq.count ?? 0, prioReq: prioReq.count ?? 0, avail: avail.count ?? 0, collected: collected.count ?? 0 };
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["admin-charts"], enabled: isAdmin,
    queryFn: async () => {
      const [{ data: donations }, { data: requests }] = await Promise.all([
        supabase.from("donations").select("category,created_at"),
        supabase.from("requests").select("donation_id,created_at,donations(category)"),
      ]);
      const byMonth: Record<string, { month: string; donations: number; requests: number }> = {};
      const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}`;
      const ensure = (k: string) => byMonth[k] ?? (byMonth[k] = { month: k, donations: 0, requests: 0 });
      (donations ?? []).forEach(d => ensure(monthKey(new Date(d.created_at))).donations++);
      (requests ?? []).forEach(r => ensure(monthKey(new Date(r.created_at))).requests++);
      const monthly = Object.values(byMonth).sort((a,b) => a.month.localeCompare(b.month)).slice(-6);

      const donCat: Record<string, number> = {};
      (donations ?? []).forEach(d => donCat[d.category] = (donCat[d.category] ?? 0) + 1);
      const reqCat: Record<string, number> = {};
      (requests ?? []).forEach(r => { const c = r.donations?.category; if (c) reqCat[c] = (reqCat[c] ?? 0) + 1; });
      return {
        monthly,
        donCat: Object.entries(donCat).map(([name, value]) => ({ name, value })),
        reqCat: Object.entries(reqCat).map(([name, value]) => ({ name, value })),
      };
    },
  });

  if (!isAdmin) return <DashLayout><Card className="p-12 text-center text-muted-foreground">Admin access only.</Card></DashLayout>;

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Admin overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats?.users ?? 0} icon={Users} />
        <StatCard label="Verified students" value={stats?.verified ?? 0} icon={CheckCircle2} accent="success" />
        <StatCard label="Pending verifications" value={stats?.pendVer ?? 0} icon={FileCheck} accent="warning" />
        <StatCard label="Pending donations" value={stats?.pendDon ?? 0} icon={Package} accent="warning" />
        <StatCard label="Pending requests" value={stats?.pendReq ?? 0} icon={Clock} accent="warning" />
        <StatCard label="Priority requests" value={stats?.prioReq ?? 0} icon={AlertTriangle} accent="destructive" />
        <StatCard label="Items available" value={stats?.avail ?? 0} icon={Package} />
        <StatCard label="Items collected" value={stats?.collected ?? 0} icon={CheckCircle2} accent="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-6 shadow-card">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Activity by month</h2>
            <span className="text-[11px] text-muted-foreground">last 6 months</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.monthly ?? []} margin={{ top: 4, right: 8, left: -18, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} strokeDasharray="0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={38} allowDecimals={false} />
                <Tooltip cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }} contentStyle={tooltipStyle} />
                <Legend iconType="square" iconSize={8} />
                <Bar dataKey="donations" fill="var(--chart-1)" barSize={14} />
                <Bar dataKey="requests" fill="var(--chart-2)" barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 shadow-card">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top requested categories</h2>
            <span className="text-[11px] text-muted-foreground">all time</span>
          </div>
          <div className="mt-5 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData?.reqCat ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={1}
                  stroke="var(--card)"
                  strokeWidth={1}
                >
                  {(chartData?.reqCat ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconType="square" iconSize={8} />
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <AIInsightsPanel />

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/admin/verifications"><Button variant="outline"><FileCheck className="mr-2 h-4 w-4" />Review verifications</Button></Link>
        <Link to="/admin/donations"><Button variant="outline"><Package className="mr-2 h-4 w-4" />Review donations</Button></Link>
        <Link to="/admin/requests"><Button variant="outline"><Clock className="mr-2 h-4 w-4" />Review requests</Button></Link>
        <Link to="/admin/users"><Button variant="outline"><Users className="mr-2 h-4 w-4" />Manage users</Button></Link>
        <Link to="/admin/reports"><Button variant="outline"><Sparkles className="mr-2 h-4 w-4" />Reports</Button></Link>
      </div>
    </DashLayout>
  );
}

function AIInsightsPanel() {
  const [insights, setInsights] = useState<{ summary: string; predictions: string[] } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { aiAdminInsights } = await import("@/lib/ai.functions");
        setInsights(await aiAdminInsights());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);
  return (
    <Card className="mt-6 p-6 shadow-card">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" />AI insights & predictions</h2>
      {loading ? <p className="mt-2 text-sm text-muted-foreground">Crunching the numbers…</p>
      : !insights ? <p className="mt-2 text-sm text-muted-foreground">Insights unavailable.</p>
      : (
        <>
          <p className="mt-3 text-sm">{insights.summary}</p>
          {insights.predictions.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {insights.predictions.map((p,i) => <li key={i}>{p}</li>)}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
