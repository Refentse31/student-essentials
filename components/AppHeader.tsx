import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth, displayName } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Heart, LogOut, Menu, X, ArrowRight } from "lucide-react";
import { useState } from "react";

export function AppHeader() {
  const { user, profile, roles } = useAuth();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const dashLink = roles.includes("admin") ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="w-full border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-soft">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Student Essentials</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground">Home</Link>
          <Link to="/browse" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground">Browse</Link>
          <a href="/#how" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground">How it works</a>
          <a href="/#faq" className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-secondary hover:text-foreground">FAQ</a>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Link to={dashLink}>
                <Button variant="ghost" size="sm" className="rounded-md">{displayName(profile)}</Button>
              </Link>
              <Button size="sm" variant="outline" className="rounded-md" onClick={signOut}><LogOut className="mr-1 h-4 w-4" />Logout</Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm" className="rounded-md">Login</Button></Link>
              <Link to="/auth" search={{ tab: "register" }}>
                <Button size="sm" className="rounded-md bg-gradient-primary text-primary-foreground shadow-soft hover:opacity-90">
                  Register <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>

        <button className="rounded-md p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto max-w-7xl border-b border-border bg-background md:hidden">
          <div className="flex flex-col gap-1 p-3">
            <Link to="/" className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>Home</Link>
            <Link to="/browse" className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>Browse Items</Link>
            <a href="/#how" className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>How it works</a>
            <a href="/#faq" className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>FAQ</a>
            {user ? (
              <>
                <Link to={dashLink} className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>Dashboard</Link>
                <button onClick={signOut} className="rounded-md px-3 py-2 text-left hover:bg-secondary">Logout</button>
              </>
            ) : (
              <>
                <Link to="/auth" className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>Login</Link>
                <Link to="/auth" search={{ tab: "register" }} className="rounded-md px-3 py-2 hover:bg-secondary" onClick={() => setOpen(false)}>Register</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
