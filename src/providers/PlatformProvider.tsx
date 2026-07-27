import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

export type PlatformRole =
  | "platform_owner"
  | "platform_admin"
  | "support_level_1"
  | "support_level_2"
  | "support_level_3";

export type PlatformProfile = {
  id: string;
  fullName: string;
  email: string;
  role: PlatformRole;
  status: string;
};

type PlatformContextValue = {
  session: Session | null;
  profile: PlatformProfile | null;
  ready: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type PlatformProfileRow = {
  platform_member_id: string;
  full_name: string | null;
  email: string | null;
  platform_role: PlatformRole;
  user_status: string | null;
};

const PlatformContext = createContext<PlatformContextValue | null>(null);

function normalizeProfile(row: PlatformProfileRow): PlatformProfile {
  return {
    id: row.platform_member_id,
    fullName: row.full_name?.trim() || "KOB Team",
    email: row.email?.trim() || "",
    role: row.platform_role,
    status: row.user_status || "active",
  };
}

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlatformProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setReady(false);
    setError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const nextSession = sessionData.session;
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        return;
      }

      const { data, error: rpcError } = await (
        supabase as unknown as {
          rpc: (
            name: string,
          ) => Promise<{ data: PlatformProfileRow[] | PlatformProfileRow | null; error: Error | null }>;
        }
      ).rpc("get_my_platform_profile");

      if (rpcError) throw rpcError;

      const row = Array.isArray(data) ? data[0] : data;
      setProfile(row ? normalizeProfile(row) : null);
    } catch (refreshError) {
      setProfile(null);
      setError(refreshError instanceof Error ? refreshError.message : "تعذر تحميل حساب المنصة.");
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      queueMicrotask(() => void refresh());
    });

    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<PlatformContextValue>(
    () => ({ session, profile, ready, error, refresh }),
    [error, profile, ready, refresh, session],
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error("usePlatform must be used inside PlatformProvider");
  }
  return context;
}
