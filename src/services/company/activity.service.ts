import { supabase } from "@/integrations/supabase/client";

export type ActivitySeverity = "info" | "warning" | "critical";

export type ActivityRow = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor_label: string | null;
  action: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  severity: ActivitySeverity;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

const SELECT =
  "id,organization_id,actor_user_id,actor_label,action,category,entity_type,entity_id,entity_label,severity,metadata,ip_address,user_agent,created_at";

export type ActivityFilters = {
  category?: string | "all";
  severity?: ActivitySeverity | "all";
  actorUserId?: string | null;
  search?: string;
  from?: string | null;
  to?: string | null;
  limit?: number;
};

export async function listActivity(
  organizationId: string,
  filters: ActivityFilters = {},
): Promise<ActivityRow[]> {
  let query = (supabase as any)
    .from("organization_activity_log")
    .select(SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 250);

  if (filters.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters.severity && filters.severity !== "all") query = query.eq("severity", filters.severity);
  if (filters.actorUserId) query = query.eq("actor_user_id", filters.actorUserId);
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as ActivityRow[];
  const term = filters.search?.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter((row) =>
    [row.action, row.entity_label, row.actor_label, row.category, JSON.stringify(row.metadata)]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term)),
  );
}

/** Fire-and-forget audit trail entry. Never blocks the calling UI action. */
export async function recordActivity(input: {
  organizationId: string;
  action: string;
  category?: string;
  entityType?: string | null;
  entityId?: string | null;
  entityLabel?: string | null;
  severity?: ActivitySeverity;
  metadata?: Record<string, unknown>;
  actorLabel?: string | null;
}): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const actorUserId = auth.user?.id ?? null;
    if (!actorUserId) return;
    await (supabase as any).from("organization_activity_log").insert({
      organization_id: input.organizationId,
      actor_user_id: actorUserId,
      actor_label: input.actorLabel ?? auth.user?.email ?? null,
      action: input.action,
      category: input.category ?? "general",
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      entity_label: input.entityLabel ?? null,
      severity: input.severity ?? "info",
      metadata: input.metadata ?? {},
      user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 300),
    });
  } catch {
    /* activity logging must never break the action it describes */
  }
}

/** Records the sign-in timestamp on every membership of the current user. */
export async function touchMemberLogin(): Promise<void> {
  try {
    await (supabase as any).rpc("touch_member_login");
  } catch {
    /* non-critical */
  }
}
