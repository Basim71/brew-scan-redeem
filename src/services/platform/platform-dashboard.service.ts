import { supabase } from "@/integrations/supabase/client";

export type PlatformMetrics = {
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  newCompaniesThisMonth: number;
  openCases: number;
  awaitingApproval: number;
  activeSessions: number;
  upcomingTraining: number;
  activeStaff: number;
};

export const EMPTY_PLATFORM_METRICS: PlatformMetrics = {
  totalCompanies: 0,
  activeCompanies: 0,
  suspendedCompanies: 0,
  newCompaniesThisMonth: 0,
  openCases: 0,
  awaitingApproval: 0,
  activeSessions: 0,
  upcomingTraining: 0,
  activeStaff: 0,
};

type Count = { count: number | null; error: { message: string } | null };

export async function fetchPlatformMetrics(): Promise<{ metrics: PlatformMetrics; error: string | null }> {
  const s = supabase as any;
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);
  const now = new Date().toISOString();

  const [total, active, suspended, newThisMonth, openCases, awaiting, sessions, training, staff] =
    (await Promise.all([
      s.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "company"),
      s.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "company").eq("status", "active"),
      s.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "company").neq("status", "active"),
      s.from("organizations").select("id", { count: "exact", head: true }).eq("organization_type", "company").gte("created_at", startOfMonth.toISOString()),
      s.from("customer_success_cases").select("id", { count: "exact", head: true }).not("status", "in", "(closed,cancelled,resolved)"),
      s.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      s.from("support_sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
      s.from("support_requests").select("id", { count: "exact", head: true }).eq("type", "training").gte("scheduled_at", now),
      s.from("platform_staff").select("id", { count: "exact", head: true }).eq("status", "active"),
    ])) as Count[];

  const first = [total, active, suspended, newThisMonth, openCases, awaiting, sessions, training, staff].find((r) => r.error);
  return {
    metrics: {
      totalCompanies: total.count ?? 0,
      activeCompanies: active.count ?? 0,
      suspendedCompanies: suspended.count ?? 0,
      newCompaniesThisMonth: newThisMonth.count ?? 0,
      openCases: openCases.count ?? 0,
      awaitingApproval: awaiting.count ?? 0,
      activeSessions: sessions.count ?? 0,
      upcomingTraining: training.count ?? 0,
      activeStaff: staff.count ?? 0,
    },
    error: first?.error?.message ?? null,
  };
}

export type ActivityRow = {
  id: string | number;
  action: string;
  actor_user_id: string | null;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
};

export async function fetchRecentActivity(limit = 20): Promise<ActivityRow[]> {
  const { data } = await (supabase as any)
    .from("support_activity_log")
    .select("id,action,actor_user_id,target_type,target_id,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ActivityRow[];
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const { error } = await (supabase as any)
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}