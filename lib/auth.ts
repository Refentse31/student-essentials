import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "donor" | "unfunded";

export interface AppProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  student_number: string | null;
  avatar_url: string | null;
  verification_status: "none" | "pending" | "approved" | "rejected";
  suspended: boolean;
  notification_pref?: boolean;
}

export interface AuthState {
  loading: boolean;
  user: User | null;
  profile: AppProfile | null;
  roles: AppRole[];
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    loading: true,
    user: null,
    profile: null,
    roles: [],
  });

  useEffect(() => {
    let active = true;

    const load = async (user: User | null) => {
      if (!user) {
        if (active) setState({ loading: false, user: null, profile: null, roles: [] });
        return;
      }
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (!active) return;
      setState({
        loading: false,
        user,
        profile: (profile as AppProfile) ?? null,
        roles: (roleRows ?? []).map((r: { role: AppRole }) => r.role),
      });
    };

    supabase.auth.getUser().then(({ data }) => load(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session?.user ?? null);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  return state;
}

export function hasRole(roles: AppRole[], role: AppRole) {
  return roles.includes(role);
}

export function displayName(p: AppProfile | null, fallback = "Student") {
  if (!p) return fallback;
  const n = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
  return n || p.email || fallback;
}
