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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { notifyAdmins } from "@/lib/notify";

export const Route = createFileRoute("/_authenticated/donate")({
  head: () => ({ meta: [{ title: "Upload donation — Student Essentials" }] }),
  component: Donate,
});

const CATEGORIES = ["books","food","clothing","shoes","stationery","toiletries","bedding","electronics","kitchen","other"];

function Donate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    item_name: "", category: "books", description: "",
    condition: "good", quantity: 1,
  });
  const [file, setFile] = useState<File | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,"_")}`;
        const { error: upErr } = await supabase.storage.from("donation-images").upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("donation-images").getPublicUrl(path);
        image_url = pub.publicUrl;
      }
      const { error } = await supabase.from("donations").insert({
        donor_id: user.id,
        item_name: form.item_name,
        category: form.category as never,
        description: form.description || null,
        condition: form.condition as never,
        quantity: form.quantity,
        image_url,
      });
      if (error) throw error;
      await notifyAdmins({ type: "new_donation", title: "New donation pending review", body: form.item_name, link: "/admin/donations" });
      toast.success("Donation submitted successfully. Awaiting admin approval.");
      navigate({ to: "/my-donations" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally { setLoading(false); }
  };

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Upload a donation</h1>
      <Card className="max-w-2xl p-6 shadow-card">
        <form onSubmit={submit} className="space-y-4">
          <div><Label>Item name</Label><Input required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="like_new">Like new</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })} /></div>
            <div><Label>Image</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Pickup location: <strong>Campus Library</strong> (fixed for all donations)</span>
          </div>
          <Button type="submit" disabled={loading} className="bg-gradient-primary text-primary-foreground">
            {loading ? "Submitting…" : "Submit donation"}
          </Button>
        </form>
      </Card>
    </DashLayout>
  );
}
