import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

const ORGANIZATION_STORAGE_KEY = "kob.activeOrganization";

export type OrganizationRole = "owner" | "admin" | "manager" | "cashier";

export type ActiveOrganization = {
  id: string;
  code: string;
  nameAr: string | null;
  nameEn: string | null;
  slug: string | null;
  status: string;
};

type OrganizationMembership = {
  id: string;
  role: OrganizationRole;
  status: string;
};

type OrganizationContextValue = {
  session: Session | null;
  organization: ActiveOrganization | null;
  membership: OrganizationMembership | null;
  role: OrganizationRole | null;
  branchId: string | null;
  ready: boolean;
  error: string | null;
  activateOrganization: (organization: ActiveOrganization) => Promise<OrganizationMembership>;
  clearOrganization: () => void;
  refresh: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

function readStoredOrganization(): ActiveOrganization | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ORGANIZATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveOrganization;
    return parsed?.id && parsed?.code ? parsed : null;
  } catch {
    return null;
  }
}

function storeOrganization(organization: ActiveOrganization | null) {
  if (typeof window === "undefined") return;
  if (!organization) {
    window.localStorage.removeItem(ORGANIZATION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ORGANIZATION_STORAGE_KEY, JSON.stringify(organization));
}

function mapVerificationRow(row: any): {
  organization: ActiveOrganization;
  membership: OrganizationMembership;
} {
  return {
    organization: {
      id: row.organization_id,
      code: row.organization_code,
      nameAr: row.organization_name_ar ?? null,
      nameEn: row.organization_name_en ?? null,
      slug: row.organization_slug ?? null,
      status: row.organization_status,
    },
    membership: {
      id: row.membership_id,
      role: row.member_role as OrganizationRole,
      status: row.member_status,
    },
  };
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [organization, setOrganization] = useState<ActiveOrganization | null>(null);
  const [membership, setMembership] = useState<OrganizationMembership | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearOrganization = useCallback(() => {
    storeOrganization(null);
    setOrganization(null);
    setMembership(null);
    setBranchId(null);
    setError(null);
  }, []);

  const verifyOrganization = useCallback(async (
    target: ActiveOrganization,
  ): Promise<OrganizationMembership> => {
    const db = supabase as any;
    const { data, error: verifyError } = await db.rpc("verify_organization_login", {
      requested_organization_id: target.id,
    });

    if (verifyError) throw new Error(verifyError.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("هذا الحساب غير مرتبط بهذه الشركة.");
    if (row.organization_status !== "active") {
      throw new Error("حساب الشركة موقوف. يرجى التواصل مع إدارة منصة KOB.");
    }
    if (row.member_status !== "active") {
      throw new Error("عضويتك في هذه الشركة غير نشطة.");
    }

    const mapped = mapVerificationRow(row);

    const { data: legacyRole } = await db
      .from("user_roles")
      .select("branch_id")
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .eq("organization_id", mapped.organization.id)
      .maybeSingle();

    storeOrganization(mapped.organization);
    setOrganization(mapped.organization);
    setMembership(mapped.membership);
    setBranchId(legacyRole?.branch_id ?? null);
    setError(null);

    return mapped.membership;
  }, []);

  const activateOrganization = useCallback(async (target: ActiveOrganization) => {
    setReady(false);
    try {
      return await verifyOrganization(target);
    } finally {
      setReady(true);
    }
  }, [verifyOrganization]);

  const refresh = useCallback(async () => {
    setReady(false);
    setError(null);

    const { data, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setSession(null);
      clearOrganization();
      setError(sessionError.message);
      setReady(true);
      return;
    }

    const currentSession = data.session;
    setSession(currentSession);

    if (!currentSession) {
      clearOrganization();
      setReady(true);
      return;
    }

    const stored = readStoredOrganization();
    if (!stored) {
      setOrganization(null);
      setMembership(null);
      setBranchId(null);
      setReady(true);
      return;
    }

    try {
      await verifyOrganization(stored);
    } catch (verificationError) {
      clearOrganization();
      setError(verificationError instanceof Error ? verificationError.message : "تعذر التحقق من الشركة.");
    } finally {
      setReady(true);
    }
  }, [clearOrganization, verifyOrganization]);

  useEffect(() => {
    void refresh();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        clearOrganization();
        setReady(true);
        return;
      }
      queueMicrotask(() => void refresh());
    });

    return () => data.subscription.unsubscribe();
  }, [clearOrganization, refresh]);

  const value = useMemo<OrganizationContextValue>(() => ({
    session,
    organization,
    membership,
    role: membership?.role ?? null,
    branchId,
    ready,
    error,
    activateOrganization,
    clearOrganization,
    refresh,
  }), [
    activateOrganization,
    branchId,
    clearOrganization,
    error,
    membership,
    organization,
    ready,
    refresh,
    session,
  ]);

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganization must be used inside OrganizationProvider");
  return context;
}
