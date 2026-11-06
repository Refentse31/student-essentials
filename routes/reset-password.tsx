import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { resetPasswordWithPhrase } from "@/lib/recovery.functions";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Recover your account — Student Essentials" },
      { name: "description", content: "Reset your Student Essentials password using your 4-word recovery phrase — no email needed." },
      { property: "og:title", content: "Recover your account — Student Essentials" },
      { property: "og:description", content: "Reset your password instantly with your 4-word recovery phrase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phrase, setPhrase] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters.");
    if (pw !== confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    try {
      const res = await resetPasswordWithPhrase({ data: { email, phrase, newPassword: pw } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Password updated! You can sign in now.");
      navigate({ to: "/auth", search: { tab: "login" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Recovery failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6">
        <Card className="p-6 shadow-elegant">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
              <KeyRound className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold">Recover your account</h1>
            <p className="text-sm text-muted-foreground">
              Enter the 4-word recovery phrase you saved when you registered.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Recovery phrase</Label>
              <Input
                required
                placeholder="e.g. maple harbor violet quartz"
                className="font-mono"
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
              />
            </div>
            <div>
              <Label>New password</Label>
              <Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
              {loading ? "Verifying…" : "Verify phrase & update password"}
            </Button>
          </form>
        </Card>
      </section>
      <Footer />
    </div>
  );
}
