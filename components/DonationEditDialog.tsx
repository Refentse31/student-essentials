import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdmins } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

const CATEGORIES = ["books","food","clothing","shoes","stationery","toiletries","bedding","electronics","kitchen","other"];

export interface EditableDonation {
  id: string;
  donor_id: string;
  item_name: string;
  category: string;
  description: string | null;
  condition: string;
  quantity: number;
  image_url: string | null;
  status: string;
}

export function DonationEditDialog({ donation, invalidateKeys }: { donation: EditableDonation; invalidateKeys: string[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    item_name: donation.item_name,
    category: donation.category,
    description: donation.description ?? "",
    condition: donation.condition,
    quantity: donation.quantity,
  });
  const [file, setFile] = useState<File | null>(null);
  const wasApproved = donation.status === "approved";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let image_url = donation.image_url;
      if (file) {
        const path = `${donation.donor_id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("donation-images").upload(path, file);
        if (upErr) throw upErr;
        image_url = supabase.storage.from("donation-images").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("donations").update({
        item_name: form.item_name,
        category: form.category as never,
        description: form.description || null,
        condition: form.condition as never,
        quantity: form.quantity,
        image_url,
        // any edit sends the item back through admin approval
        status: "pending" as never,
        reviewed_at: null,
        rejection_reason: null,
      }).eq("id", donation.id);
      if (error) throw error;

      await notifyAdmins({
        type: "new_donation",
        title: `Item edited — needs review: ${form.item_name}`,
        body: wasApproved
          ? "A previously approved item was edited and is awaiting re-approval."
          : "A pending item was edited and is awaiting review.",
        link: "/admin/donations",
      });

      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(wasApproved ? "Item updated — sent back for admin re-approval" : "Item updated");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="mr-1 h-3 w-3" />Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit item</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          {wasApproved && (
            <p className="rounded-md bg-warning/10 p-2 text-xs text-warning">
              This item is approved. Saving changes will return it to pending and notify an admin to re-approve it.
            </p>
          )}
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
            <div><Label>Replace image</Label><Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-gradient-primary text-primary-foreground">{saving ? "Saving…" : "Save changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
