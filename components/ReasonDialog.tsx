import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type BtnVariant = "default" | "outline" | "destructive" | "secondary" | "ghost";

/** In-app dialog that collects a written reason before an action. */
export function ReasonDialog({
  triggerLabel, title, description, placeholder = "Write the reason…", confirmLabel = "Confirm",
  variant = "outline", triggerClassName, confirmClassName, onConfirm, icon,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  variant?: BtnVariant;
  triggerClassName?: string;
  confirmClassName?: string;
  icon?: ReactNode;
  onConfirm: (reason: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return toast.error("Please give a reason first.");
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setOpen(false);
      setReason("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReason(""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className={triggerClassName}>{icon}{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="reason-field">Reason</Label>
            <Textarea id="reason-field" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className={confirmClassName}>{busy ? "Saving…" : confirmLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** In-app confirmation dialog (replaces window.confirm). */
export function ConfirmDialog({
  triggerLabel, title, description, confirmLabel = "Confirm", variant = "destructive", triggerClassName, onConfirm, icon,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: BtnVariant;
  triggerClassName?: string;
  icon?: ReactNode;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant} className={triggerClassName}>{icon}{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onConfirm(); setOpen(false); } finally { setBusy(false); } }}
          >{busy ? "Working…" : confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
