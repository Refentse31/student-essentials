import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAuth, displayName } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Upload, Package, MessageSquare, Bell, History, User, LogOut,
  Search, Shield, FileCheck, Heart, Menu, X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard }

export function DashLayout({ children }: { children: ReactNode }) {
  const { user, profile, roles } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isAdmin = roles.includes("admin");
  const isUnfunded = roles.includes("unfunded");

  const items: NavItem[] = isAdmin
    ? [
        { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { to: "/admin/verifications", label: "Verifications", icon: FileCheck },
        { to: "/admin/donations", label: "Donations", icon: Package },
        { to: "/admin/requests", label: "Requests", icon: Shield },
        { to: "/admin/users", label: "Users", icon: User },
        { to: "/admin/reports", label: "Reports", icon: History },
        { to: "/browse-items", label: "Browse Items", icon: Search },
        { to: "/notifications", label: "Notifications", icon: Bell },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/profile", label: "Profile", icon: User },
      ]
    : isUnfunded
    ? [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/browse-items", label: "Browse Items", icon: Search },
        { to: "/my-requests", label: "My Requests", icon: Package },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/notifications", label: "Notifications", icon: Bell },
        { to: "/verify", label: "Verification", icon: FileCheck },
        { to: "/profile", label: "Profile", icon: User },
      ]
    : [
        { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/donate", label: "Upload Donation", icon: Upload },
        { to: "/my-donations", label: "My Donations", icon: Package },
        { to: "/browse-items", label: "Browse Items", icon: Search },
        { to: "/messages", label: "Messages", icon: MessageSquare },
        { to: "/notifications", label: "Notifications", icon: Bell },
        { to: "/profile", label: "Profile", icon: User },
      ];


  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform md:static md:inset-auto md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-[110%]"}`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-soft">
              <Heart className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Essentials</span>
          </Link>
        </div>
        <nav className="max-h-[calc(100vh-8.5rem)] space-y-1 overflow-y-auto p-3 pb-6">
          {items.map((it) => {
            const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground border-l-2 border-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-3">
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div>
              <div className="text-xs text-muted-foreground">{isAdmin ? "Admin" : isUnfunded ? "Unfunded student" : "Donor student"}</div>
              <div className="text-sm font-semibold leading-tight">{displayName(profile)}</div>
            </div>
          </div>
          <div className="hidden text-xs text-muted-foreground sm:block">{user?.email}</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
