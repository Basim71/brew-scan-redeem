import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type PlatformRole = "platform_owner" | "platform_admin" | "support_level_1" | "support_level_2" | "support_level_3";
export type PlatformProfile = { id: string; fullName: string; email: string; role: PlatformRole; status: string };

type ContextValue = { session: Session | null; profile: PlatformProfile | null; ready: boolean; error: string | null; refresh: () => Promise<void> };
const PlatformContext = createContext<ContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReady(false); setError(null);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (!data.session) { setProfile(null); setReady(true); return; }
    const { data: rows, error: rpcError } = await (supabase as any).rpc("get_my_platform_profile");
    if (rpcError) { setError(rpcError.message); setProfile(null); setReady(true); return; }
    const row = Array.isArray(rows) ? rows[0] : rows;
    setProfile(row ? { id: row.platform_member_id, fullName: row.full_name, email: row.email, role: row.platform_role, status: row.user_status } : null);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); queueMicrotask(() => void refresh()); });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo(() => ({ session, profile, ready, error, refresh }), [session, profile, ready, error, refresh]);
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const value = useContext(PlatformContext);
  if (!value) throw new Error("usePlatform must be used inside PlatformProvider");
  return value;
}
