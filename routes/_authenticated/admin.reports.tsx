import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin" }] }),
  component: Reports,
});

function Reports() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const { data } = useQuery({
    queryKey: ["report-data"], enabled: isAdmin,
    queryFn: async () => {
      const [donations, requests, profiles, verifications, ratings] = await Promise.all([
        supabase.from("donations").select("*"),
        supabase.from("requests").select("*, donations(item_name,category)"),
        supabase.from("profiles").select("*"),
        supabase.from("verifications").select("*"),
        supabase.from("ratings").select("stars"),
      ]);
      return {
        donations: donations.data ?? [],
        requests: requests.data ?? [],
        profiles: profiles.data ?? [],
        verifications: verifications.data ?? [],
        ratings: ratings.data ?? [],
      };
    },
  });

  const buildPdf = (title: string, rows: string[][], headers: string[]) => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(title, 14, 18);
    doc.setFontSize(10); doc.text(`Generated ${format(new Date(), "PPpp")}`, 14, 24);
    let y = 34;
    doc.setFont("helvetica", "bold");
    headers.forEach((h, i) => doc.text(h, 14 + i * 45, y));
    doc.setFont("helvetica", "normal"); y += 6;
    doc.line(14, y - 3, 196, y - 3);
    rows.slice(0, 40).forEach((r) => {
      r.forEach((c, i) => doc.text(String(c).slice(0, 22), 14 + i * 45, y));
      y += 6;
      if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`${title.toLowerCase().replace(/\s+/g,"_")}.pdf`);
  };

  if (!isAdmin) return <DashLayout><Card className="p-12 text-center">Admin only</Card></DashLayout>;

  const reports = [
    { title: "Donation Report", build: () => buildPdf("Donation Report",
      (data?.donations ?? []).map(d => [d.item_name, d.category, d.status, format(new Date(d.created_at),"yyyy-MM-dd")]),
      ["Item","Category","Status","Date"]) },
    { title: "Request Report", build: () => buildPdf("Request Report",
      (data?.requests ?? []).map(r => [r.donations?.item_name ?? "—", r.status, r.is_priority ? "yes" : "no", format(new Date(r.created_at),"yyyy-MM-dd")]),
      ["Item","Status","Priority","Date"]) },
    { title: "Student Report", build: () => buildPdf("Student Report",
      (data?.profiles ?? []).map(p => [`${p.first_name ?? ""} ${p.last_name ?? ""}`, p.email ?? "", p.verification_status]),
      ["Name","Email","Verification"]) },
    { title: "Verification Report", build: () => buildPdf("Verification Report",
      (data?.verifications ?? []).map(v => [v.student_number, v.status, format(new Date(v.created_at),"yyyy-MM-dd")]),
      ["Student #","Status","Date"]) },
    { title: "Collection Report", build: () => buildPdf("Collection Report",
      (data?.requests ?? []).filter(r=>r.status==="collected").map(r => [r.donations?.item_name ?? "—", format(new Date(r.collected_at ?? r.created_at),"yyyy-MM-dd")]),
      ["Item","Collected on"]) },
    { title: "Priority Request Report", build: () => buildPdf("Priority Requests",
      (data?.requests ?? []).filter(r => r.is_priority).map(r => [r.donations?.item_name ?? "—", r.status, format(new Date(r.created_at),"yyyy-MM-dd")]),
      ["Item","Status","Date"]) },
    { title: "Most Donated Categories", build: () => {
      const counts: Record<string, number> = {};
      (data?.donations ?? []).forEach(d => counts[d.category] = (counts[d.category] ?? 0) + 1);
      buildPdf("Most Donated Categories", Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n]) => [c, String(n)]), ["Category","Count"]);
    } },
    { title: "Most Requested Items", build: () => {
      const counts: Record<string, number> = {};
      (data?.requests ?? []).forEach(r => { const n = r.donations?.item_name; if (n) counts[n] = (counts[n] ?? 0) + 1; });
      buildPdf("Most Requested Items", Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([c,n]) => [c, String(n)]), ["Item","Count"]);
    } },
    { title: "Monthly Activity Report", build: () => {
      const m: Record<string, { d: number; r: number }> = {};
      (data?.donations ?? []).forEach(d => { const k = format(new Date(d.created_at), "yyyy-MM"); m[k] = m[k] ?? { d: 0, r: 0 }; m[k].d++; });
      (data?.requests ?? []).forEach(r => { const k = format(new Date(r.created_at), "yyyy-MM"); m[k] = m[k] ?? { d: 0, r: 0 }; m[k].r++; });
      buildPdf("Monthly Activity", Object.entries(m).sort().map(([k,v]) => [k, String(v.d), String(v.r)]), ["Month","Donations","Requests"]);
    } },
    { title: "User Activity Report", build: () => {
      const dCount: Record<string,number> = {};
      (data?.donations ?? []).forEach(d => dCount[d.donor_id] = (dCount[d.donor_id] ?? 0) + 1);
      const rCount: Record<string,number> = {};
      (data?.requests ?? []).forEach(r => rCount[r.requester_id] = (rCount[r.requester_id] ?? 0) + 1);
      const rows = (data?.profiles ?? []).map(p => [`${p.first_name ?? ""} ${p.last_name ?? ""}`, String(dCount[p.id] ?? 0), String(rCount[p.id] ?? 0)]);
      buildPdf("User Activity", rows, ["User","Donations","Requests"]);
    } },
  ];

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Reports</h1>
      <p className="mb-4 text-sm text-muted-foreground">Click any report to download a PDF.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map(r => (
          <Card key={r.title} className="flex items-center justify-between gap-3 p-5 shadow-card">
            <span className="font-medium">{r.title}</span>
            <Button size="sm" onClick={r.build} className="bg-gradient-primary text-primary-foreground"><Download className="mr-1 h-4 w-4" />PDF</Button>
          </Card>
        ))}
      </div>
    </DashLayout>
  );
}
