import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashLayout } from "@/components/DashLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { adminDeleteUser } from "@/lib/admin.functions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — Admin" }] }),
  component: UsersAdmin,
});

function UsersAdmin() {
  const { roles } = useAuth();
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin");

  const { data } = useQuery({
    queryKey: ["admin-users"], enabled: isAdmin,
    queryFn: async () => {
      const { data: profs } = await supabase.from("profiles").select("*").order("created_at",{ascending:false});
      const { data: roleRows } = await supabase.from("user_roles").select("user_id,role");
      const map = new Map<string,string[]>();
      (roleRows ?? []).forEach(r => { const arr = map.get(r.user_id) ?? []; arr.push(r.role); map.set(r.user_id, arr); });
      return (profs ?? []).map(p => ({ ...p, roles: map.get(p.id) ?? [] }));
    },
  });

  const toggleSuspend = async (id: string, suspended: boolean) => {
    const { error } = await supabase.from("profiles").update({ suspended: !suspended }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`User ${!suspended ? "suspended" : "reactivated"}`); qc.invalidateQueries({ queryKey: ["admin-users"] }); }
  };

  const removeUser = async (id: string) => {
    try {
      await adminDeleteUser({ data: { userId: id } });
      toast.success("User permanently removed");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove user");
    }
  };


  if (!isAdmin) return <DashLayout><Card className="p-12 text-center">Admin only</Card></DashLayout>;

  return (
    <DashLayout>
      <h1 className="mb-6 font-display text-2xl font-bold">Users</h1>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Roles</th><th className="p-3">Verification</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {(data ?? []).map(u => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3 font-medium">{u.first_name} {u.last_name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3"><div className="flex gap-1">{u.roles.map((r: string) => <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>)}</div></td>
                <td className="p-3 capitalize">{u.verification_status}</td>
                <td className="p-3">{u.suspended ? <Badge className="bg-destructive/10 text-destructive">Suspended</Badge> : <Badge className="bg-success/15 text-success">Active</Badge>}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleSuspend(u.id, u.suspended)}>{u.suspended ? "Reactivate" : "Suspend"}</Button>
                    {!u.roles.includes("admin") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">Remove</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Permanently remove this user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This deletes {u.first_name} {u.last_name} ({u.email}) and all of their donations, requests, messages, and account data. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeUser(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove permanently</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashLayout>
  );
}
