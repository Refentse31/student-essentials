import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notifyAdmins } from "@/lib/notify";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({ meta: [{ title: "Verification — Student Essentials" }] }),
  component: Verify,
});

function Verify() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ student_number: profile?.student_number ?? "", motivation: "", financial_status: "" });
  const [file, setFile] = useState<File | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);

  const { data: latest, refetch } = useQuery({
    queryKey: ["my-verification", user?.id], enabled: !!user,
    queryFn: async () => (await supabase.from("verifications").select("*").eq("user_id", user!.id).order("created_at",{ ascending:false }).limit(1).maybeSingle()).data,
  });

  // prefill the form with the pending submission so the student can edit it
  if (latest && latest.status === "pending" && loadedId !== latest.id) {
    setLoadedId(latest.id);
    setForm({
      student_number: latest.student_number ?? "",
      motivation: latest.motivation ?? "",
      financial_status: latest.financial_status ?? "",
    });
  }

  const isEditing = latest?.status === "pending";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      let proof_url: string | null = isEditing ? (latest?.proof_url ?? null) : null;
      if (file) {
        const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,"_")}`;
        const { error: upErr } = await supabase.storage.from("verification-proof").upload(path, file);
        if (upErr) throw upErr;
        proof_url = path;
      }
      const payload = {
        student_number: form.student_number,
        motivation: form.motivation,
        financial_status: form.financial_status,
        proof_url,
      };
      const { error } = isEditing
        ? await supabase.from("verifications").update(payload).eq("id", latest!.id)
        : await supabase.from("verifications").insert({ user_id: user.id, ...payload });
      if (error) throw error;
      await notifyAdmins({
        type: "verification_approved",
        title: isEditing ? "Verification submission edited" : "New verification submitted",
        body: isEditing ? "A student updated their pending verification — please review it again." : null,
        link: "/admin/verifications",
      });
      toast.success(isEditing ? "Verification updated. Awaiting admin review." : "Verification submitted. Awaiting admin review.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Verification</h1>

      {latest && (
        <Card className="mb-4 flex items-center gap-3 p-4 shadow-card">
          {latest.status === "approved" ? <CheckCircle2 className="h-5 w-5 text-success" /> :
           latest.status === "rejected" ? <XCircle className="h-5 w-5 text-destructive" /> :
           <Clock className="h-5 w-5 text-warning" />}
          <div className="flex-1">
            <div className="font-medium">Current status: <Badge className="ml-2 capitalize">{latest.status}</Badge></div>
            {latest.review_note && <div className="text-sm text-muted-foreground">{latest.review_note}</div>}
          </div>
        </Card>
      )}

      {latest?.status !== "approved" && (
        <Card className="max-w-2xl p-6 shadow-card">
          {isEditing && (
            <p className="mb-4 rounded-md bg-warning/10 p-2 text-xs text-warning">
              Your submission is still pending. You can edit it below — saving notifies the admin to review it again.
            </p>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div><Label>Student number</Label><Input required value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} /></div>
            <div><Label>Proof of registration (PDF or image)</Label><Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
            <div><Label>Motivation</Label><Textarea required rows={3} value={form.motivation} onChange={(e) => setForm({ ...form, motivation: e.target.value })} placeholder="Why do you need help?" /></div>
            <div><Label>Financial status</Label><Textarea required rows={3} value={form.financial_status} onChange={(e) => setForm({ ...form, financial_status: e.target.value })} placeholder="Briefly describe your current financial situation." /></div>
            <Button type="submit" disabled={loading} className="bg-gradient-primary text-primary-foreground">{loading ? "Saving…" : isEditing ? "Save changes" : "Submit for verification"}</Button>
          </form>
        </Card>
      )}
    </DashLayout>
  );
}
