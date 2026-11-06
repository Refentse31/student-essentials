import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { generateRecoveryPhrase } from "@/lib/recovery";
import { saveRecoveryPhrase } from "@/lib/recovery.functions";
import { toast } from "sonner";
import { Heart } from "lucide-react";

const searchSchema = z.object({ tab: z.enum(["login", "register"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Login or register — Student Essentials" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  // register state
  const [regRole, setRegRole] = useState<"donor" | "unfunded">("donor");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [reg, setReg] = useState({
    student_number: "", first_name: "", last_name: "", email: "", phone: "", password: "", confirm: "",
  });

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPw });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const onForgot = () => navigate({ to: "/reset-password" });

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reg.password.length < 6) return toast.error("Password must be at least 6 characters.");
    if (reg.password !== reg.confirm) return toast.error("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: reg.email,
      password: reg.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: reg.first_name, last_name: reg.last_name,
          student_number: reg.student_number, phone: reg.phone,
          role: regRole,
        },
      },
    });
    if (error) { setLoading(false); return toast.error(error.message); }
    const newPhrase = generateRecoveryPhrase();
    try {
      await saveRecoveryPhrase({ data: { phrase: newPhrase } });
      setPhrase(newPhrase);
    } catch {
      toast.error("Account created, but we couldn't generate a recovery phrase.");
      navigate({ to: "/dashboard" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <section className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6">
        <Card className="p-6 shadow-elegant">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-soft">
              <Heart className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold">Welcome</h1>
            <p className="text-sm text-muted-foreground">Sign in or create your student account</p>
          </div>

          <Tabs defaultValue={tab ?? "login"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={onLogin} className="space-y-3">
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" required value={loginPw} onChange={(e) => setLoginPw(e.target.value)} />
                </div>
                <div className="text-right">
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={onForgot}>
                    Forgot password?
                  </button>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={onRegister} className="space-y-3">
                <div>
                  <Label>I am a</Label>
                  <Select value={regRole} onValueChange={(v) => setRegRole(v as "donor" | "unfunded")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="donor">Donor Student</SelectItem>
                      <SelectItem value="unfunded">Unfunded Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First name</Label><Input required value={reg.first_name} onChange={(e) => setReg({ ...reg, first_name: e.target.value })} /></div>
                  <div><Label>Last name</Label><Input required value={reg.last_name} onChange={(e) => setReg({ ...reg, last_name: e.target.value })} /></div>
                </div>
                <div><Label>Student number</Label><Input required value={reg.student_number} onChange={(e) => setReg({ ...reg, student_number: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" required value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={reg.phone} onChange={(e) => setReg({ ...reg, phone: e.target.value })} /></div>
                <div><Label>Password</Label><Input type="password" required value={reg.password} onChange={(e) => setReg({ ...reg, password: e.target.value })} /></div>
                <div><Label>Confirm password</Label><Input type="password" required value={reg.confirm} onChange={(e) => setReg({ ...reg, confirm: e.target.value })} /></div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={loading}>
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </section>
      <Footer />

      <Dialog open={!!phrase} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Save your recovery phrase</DialogTitle>
            <DialogDescription>
              These 4 words are the only way to reset your password without email. Write them down and
              keep them somewhere safe — they will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-center font-mono text-lg tracking-wide">
            {phrase}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => { void navigator.clipboard.writeText(phrase ?? ""); toast.success("Copied"); }}
            >
              Copy phrase
            </Button>
            <Button
              className="bg-gradient-primary text-primary-foreground"
              onClick={() => { setPhrase(null); navigate({ to: "/dashboard" }); }}
            >
              I've saved it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
