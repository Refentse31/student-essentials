import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useEffect } from "react";
import { generateRecoveryPhrase } from "@/lib/recovery";
import { avatarSrc, initialsOf } from "@/lib/avatarImage";
import { saveRecoveryPhrase, hasRecoveryPhrase } from "@/lib/recovery.functions";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile" }] }),
  component: Profile,
});

function Profile() {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    notification_pref: true,
  });
  const [pwd, setPwd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasPhrase, setHasPhrase] = useState<boolean | null>(null);
  const [newPhrase, setNewPhrase] = useState<string | null>(null);

  // Keep the form in sync once the saved profile arrives
  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      phone: profile.phone ?? "",
      notification_pref: profile.notification_pref ?? true,
    });
    setAvatarUrl(profile.avatar_url ?? null);
  }, [profile]);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!user) return;
    hasRecoveryPhrase({ data: undefined }).then((r) => setHasPhrase(r.exists)).catch(() => setHasPhrase(null));
  }, [user]);

  const createPhrase = async () => {
    const phrase = generateRecoveryPhrase();
    try {
      await saveRecoveryPhrase({ data: { phrase } });
      setNewPhrase(phrase);
      setHasPhrase(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create recovery phrase");
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      let avatar_url = avatarUrl;
      if (file) {
        const path = `${user.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,"_")}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
        setAvatarUrl(avatar_url);
        setFile(null);
      }
      const { error } = await supabase.from("profiles").update({ ...form, avatar_url }).eq("id", user.id);
      if (error) throw error;
      if (pwd.length >= 6) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: pwd });
        if (pwErr) throw pwErr;
        setPwd("");
      }
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
      <Card className="max-w-2xl p-6 shadow-card">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={preview ?? avatarSrc(avatarUrl)} alt="Profile picture" />
              <AvatarFallback>{initialsOf(form.first_name, form.last_name, profile?.email)}</AvatarFallback>
            </Avatar>
            <div>
              <Label>Profile picture</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="mt-1 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {avatarUrl || preview ? "Change picture" : "Upload picture"}
                </Button>
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Undo choice
                  </Button>
                )}
                {(avatarUrl || file) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      setFile(null);
                      setAvatarUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove picture
                  </Button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {file
                  ? `${file.name} — click Save changes to upload it.`
                  : avatarUrl
                  ? "JPG or PNG. You can change or remove your picture."
                  : "No picture saved. JPG or PNG."}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>First name</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>Last name</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label className="cursor-pointer">In-app notifications</Label>
            <Switch checked={form.notification_pref} onCheckedChange={(v) => setForm({ ...form, notification_pref: v })} />
          </div>
          <div><Label>New password (leave blank to keep)</Label><Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
          <Button type="submit" disabled={saving} className="bg-gradient-primary text-primary-foreground">{saving ? "Saving…" : "Save changes"}</Button>
        </form>
      </Card>

      <Card className="mt-6 max-w-2xl p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Recovery phrase</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A 4-word phrase lets you reset your password without email. Store it somewhere safe.
        </p>
        {newPhrase ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4 text-center font-mono text-lg tracking-wide">
            {newPhrase}
          </div>
        ) : hasPhrase ? (
          <p className="mt-4 text-sm">A recovery phrase is already saved for this account.</p>
        ) : (
          <Button type="button" variant="outline" className="mt-4" onClick={createPhrase} disabled={hasPhrase === null}>
            Generate my recovery phrase
          </Button>
        )}
      </Card>
    </DashLayout>
  );
}
