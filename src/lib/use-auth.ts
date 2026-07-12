import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "cashier";

type UseSessionResult = {
  session: Session | null;
  loading: boolean;
};

type UseRoleResult = {
  session: Session | null;
  role: AppRole | null;
  branchId: string | null;
  ready: boolean;
  error: string | null;
};

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function loadInitialSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!alive) return;

      if (error) {
        console.error("[useSession] getSession error:", error);
      }

      setSession(data.session);
      setLoading(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setLoading(false);
      },
    );

    loadInitialSession();

    return () => {
      alive = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export function useRole(): UseRoleResult {
  const { session, loading } = useSession();

  const [role, setRole] = useState<AppRole | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function loadRole() {
      if (loading) return;

      setReady(false);
      setError(null);

      if (!session?.user?.id) {
        setRole(null);
        setBranchId(null);
        setReady(true);
        return;
      }

      const { data, error: roleError } = await supabase
        .from("user_roles")
        .select("role, branch_id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!alive) return;

      if (roleError) {
        console.error("[useRole] role read error:", roleError);
        setRole(null);
        setBranchId(null);
        setError(roleError.message);
        setReady(true);
        return;
      }

      setRole((data?.role as AppRole) ?? null);
      setBranchId(data?.branch_id ?? null);
      setReady(true);
    }

    loadRole();

    return () => {
      alive = false;
    };
  }, [session?.user?.id, loading]);

  return {
    session,
    role,
    branchId,
    ready,
    error,
  };
}
