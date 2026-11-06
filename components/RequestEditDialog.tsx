import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notifyAdmins, notifyUsers } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

export interface EditableRequest {
  id: string;
  is_priority: boolean;
  priority_reason: string | null;
}

export function RequestEditDialog({ request, invalidateKeys, donorId, itemName }: {
  request: EditableRequest;
  invalidateKeys: string[];
  donorId?: string | null;
  itemName?: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPriority, setIsPriority] = useState(request.is_priority);
  const [reason, setReason] = useState(request.priority_reason ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("requests").update({
      is_priority: isPriority,
      priority_reason: isPriority ? (reason || null) : null,
    }).eq("id", request.id);
    if (error) { setSaving(false); return toast.error(error.message); }

    const label = itemName ? `: ${itemName}` : "";
    await notifyAdmins({
      type: "priority_review",
      title: `Request updated${label}`,
      body: "A student changed the details of a pending request.",
      link: "/admin/requests",
    });
    if (donorId) {
      await notifyUsers([donorId], {
        type: "item_requested",
        title: `Request updated${label}`,
        body: "The student changed the details of their request for your item.",
        link: "/my-donations",
      });
    }
    setSaving(false);
    invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    toast.success("Request updated");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="mr-1 h-3 w-3" />Edit</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit request</DialogTitle></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPriority} onCheckedChange={(v) => setIsPriority(Boolean(v))} />
            Mark as priority (urgent need)
          </label>
          <div>
            <Label>Motivation / reason</Label>
            <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain your need" />
          </div>
          <Button type="submit" disabled={saving} className="w-full bg-gradient-primary text-primary-foreground">{saving ? "Saving…" : "Save changes"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
