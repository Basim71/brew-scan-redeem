import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "cashier";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, loading };
}

export function useRole() {
  const { session, loading } = useSession();
  const [role, setRole] = useState<AppRole | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (loading) return;
    if (!session) {
      setRole(null); setBranchId(null); setReady(true); return;
    }
    supabase.from("user_roles").select("role, branch_id").eq("user_id", session.user.id).maybeSingle()
      .then(({ data }) => {
        setRole((data?.role as AppRole) ?? null);
        setBranchId(data?.branch_id ?? null);
        setReady(true);
      });
  }, [session, loading]);
  return { session, role, branchId, ready };
}