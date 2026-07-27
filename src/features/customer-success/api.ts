import { supabase } from "@/integrations/supabase/client";
import type {
  CaseEvent,
  CaseFeedback,
  CaseMessage,
  CustomerSuccessCase,
  SupportRequest,
  SupportSession,
} from "./types";

function mapCase(row: any): CustomerSuccessCase {
  return {
    id: row.id,
    caseNumber: row.case_number,
    organizationId: row.organization_id,
    createdByMemberId: row.created_by_member_id,
    assignedPlatformMemberId: row.assigned_platform_member_id,
    category: row.category,
    priority: row.priority,
    status: row.status,
    title: row.title,
    description: row.description,
    sessionPreference: row.session_preference,
    requestedAt: row.requested_at,
    firstResponseAt: row.first_response_at,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    scheduledAt: row.scheduled_at,
    allowView: row.allow_view,
    allowTemporaryEdit: row.allow_temporary_edit,
    allowVoice: row.allow_voice,
    allowRecording: row.allow_recording,
    organization: row.organization ?? null,
  };
}

const CASE_SELECT = `
  id, case_number, organization_id, created_by_member_id,
  assigned_platform_member_id, category, priority, status,
  title, description, session_preference, requested_at,
  first_response_at, resolved_at, closed_at, scheduled_at,
  allow_view, allow_temporary_edit, allow_voice, allow_recording,
  organization:organizations(name_ar,name_en)
`;

export async function listCases(organizationId?: string): Promise<CustomerSuccessCase[]> {
  let query = (supabase as any)
    .from("customer_success_cases")
    .select(CASE_SELECT)
    .order("requested_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapCase);
}

export async function getCase(caseId: string): Promise<CustomerSuccessCase> {
  const { data, error } = await (supabase as any)
    .from("customer_success_cases")
    .select(CASE_SELECT)
    .eq("id", caseId)
    .single();
  if (error) throw error;
  return mapCase(data);
}

export async function createCase(input: {
  organizationId: string;
  createdByMemberId: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  sessionPreference: string;
  scheduledAt?: string | null;
  allowView: boolean;
  allowTemporaryEdit: boolean;
  allowVoice: boolean;
  allowRecording: boolean;
}) {
  const { data, error } = await (supabase as any)
    .from("customer_success_cases")
    .insert({
      organization_id: input.organizationId,
      created_by_member_id: input.createdByMemberId,
      category: input.category,
      priority: input.priority,
      title: input.title.trim(),
      description: input.description.trim(),
      session_preference: input.sessionPreference,
      scheduled_at: input.scheduledAt || null,
      allow_view: input.allowView,
      allow_temporary_edit: input.allowTemporaryEdit,
      allow_voice: input.allowVoice,
      allow_recording: input.allowRecording,
    })
    .select("id, case_number")
    .single();
  if (error) throw error;
  return data as { id: string; case_number: string };
}

export async function updateCase(caseId: string, patch: Record<string, unknown>) {
  const { error } = await (supabase as any)
    .from("customer_success_cases")
    .update(patch)
    .eq("id", caseId);
  if (error) throw error;
}

export async function addCaseMessage(caseId: string, body: string, visibility: "shared" | "internal" = "shared") {
  const { error } = await (supabase as any)
    .from("customer_success_case_messages")
    .insert({ case_id: caseId, body: body.trim(), visibility });
  if (error) throw error;
}

export async function listCaseMessages(caseId: string): Promise<CaseMessage[]> {
  const { data, error } = await (supabase as any)
    .from("customer_success_case_messages")
    .select("id,case_id,sender_user_id,body,visibility,created_at")
    .eq("case_id", caseId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, caseId: r.case_id, senderUserId: r.sender_user_id,
    body: r.body, visibility: r.visibility, createdAt: r.created_at,
  }));
}

export async function listCaseEvents(caseId: string): Promise<CaseEvent[]> {
  const { data, error } = await (supabase as any)
    .from("customer_success_case_events")
    .select("id,case_id,actor_user_id,event_type,from_status,to_status,metadata,created_at")
    .eq("case_id", caseId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id, caseId: r.case_id, actorUserId: r.actor_user_id,
    eventType: r.event_type, fromStatus: r.from_status, toStatus: r.to_status,
    metadata: r.metadata ?? {}, createdAt: r.created_at,
  }));
}

export async function getCaseFeedback(caseId: string): Promise<CaseFeedback | null> {
  const { data, error } = await (supabase as any)
    .from("customer_success_feedback")
    .select("id,case_id,rating,resolved,comment,created_at")
    .eq("case_id", caseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id, caseId: data.case_id, rating: data.rating,
    resolved: data.resolved, comment: data.comment, createdAt: data.created_at,
  };
}

export async function submitCaseFeedback(input: {
  caseId: string;
  memberId: string;
  rating: number;
  resolved: boolean;
  comment?: string;
}) {
  const { error } = await (supabase as any)
    .from("customer_success_feedback")
    .insert({
      case_id: input.caseId,
      submitted_by_member_id: input.memberId,
      rating: input.rating,
      resolved: input.resolved,
      comment: input.comment?.trim() || null,
    });
  if (error) throw error;
}

function mapSupportRequest(r: any): SupportRequest {
  return {
    id: r.id,
    organizationId: r.organization_id,
    requestedBy: r.requested_by,
    type: r.type,
    priority: r.priority,
    status: r.status,
    subject: r.subject,
    description: r.description,
    requestedStartAt: r.requested_start_at,
    scheduledAt: r.scheduled_at,
    durationMinutes: r.duration_minutes,
    requestedMode: r.requested_mode,
    allowVoice: r.allow_voice,
    allowRecording: r.allow_recording,
    decisionNote: r.decision_note,
    decidedAt: r.decided_at,
    rescheduleNote: r.reschedule_note,
    assignedPlatformMemberId: r.assigned_platform_member_id,
    createdAt: r.created_at,
  };
}

const SUPPORT_REQUEST_SELECT =
  "id,organization_id,requested_by,type,priority,status,subject,description,requested_start_at,scheduled_at,duration_minutes,requested_mode,allow_voice,allow_recording,decision_note,decided_at,reschedule_note,assigned_platform_member_id,created_at";

export async function listSupportRequestsForOrganization(organizationId: string): Promise<SupportRequest[]> {
  const { data, error } = await (supabase as any)
    .from("support_requests")
    .select(SUPPORT_REQUEST_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSupportRequest);
}

export async function createSupportRequest(input: {
  organizationId: string;
  type: "support" | "training";
  subject: string;
  description?: string;
  priority?: "normal" | "high" | "urgent";
  requestedStartAt?: string | null;
  durationMinutes?: number;
  requestedMode?: "view" | "assist" | "edit";
  allowVoice?: boolean;
  allowRecording?: boolean;
  assignedPlatformMemberId?: string | null;
}) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("no_session");
  const { data, error } = await (supabase as any)
    .from("support_requests")
    .insert({
      organization_id: input.organizationId,
      requested_by: user.id,
      type: input.type,
      subject: input.subject.trim(),
      description: input.description?.trim() || null,
      priority: input.priority ?? "normal",
      requested_start_at: input.requestedStartAt ?? null,
      duration_minutes: input.durationMinutes ?? 30,
      requested_mode: input.requestedMode ?? "view",
      allow_voice: input.allowVoice ?? true,
      allow_recording: input.allowRecording ?? false,
      assigned_platform_member_id: input.assignedPlatformMemberId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function updateSupportRequest(id: string, patch: Record<string, unknown>) {
  const { error } = await (supabase as any)
    .from("support_requests")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

function mapSession(r: any): SupportSession {
  return {
    id: r.id,
    requestId: r.request_id,
    organizationId: r.organization_id,
    platformMemberId: r.platform_member_id,
    approvedByCompanyUserId: r.approved_by_company_user_id,
    status: r.status,
    mode: r.mode,
    voiceEnabled: r.voice_enabled,
    recordingEnabled: r.recording_enabled,
    approvalExpiresAt: r.approval_expires_at,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    endReason: r.end_reason,
    currentPath: r.current_path,
    createdAt: r.created_at,
  };
}

const SUPPORT_SESSION_SELECT =
  "id,request_id,organization_id,platform_member_id,approved_by_company_user_id,status,mode,voice_enabled,recording_enabled,approval_expires_at,started_at,ended_at,end_reason,current_path,created_at";

export async function listSessionsForOrganization(organizationId: string): Promise<SupportSession[]> {
  const { data, error } = await (supabase as any)
    .from("support_sessions")
    .select(SUPPORT_SESSION_SELECT)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

export async function createSupportSession(input: {
  organizationId: string;
  platformMemberId: string;
  approvedByCompanyUserId: string;
  requestId?: string | null;
  mode?: "view" | "assist" | "edit";
  voiceEnabled?: boolean;
  recordingEnabled?: boolean;
  approvalExpiresAt: string;
}) {
  const { data, error } = await (supabase as any)
    .from("support_sessions")
    .insert({
      organization_id: input.organizationId,
      platform_member_id: input.platformMemberId,
      approved_by_company_user_id: input.approvedByCompanyUserId,
      request_id: input.requestId ?? null,
      mode: input.mode ?? "view",
      voice_enabled: input.voiceEnabled ?? false,
      recording_enabled: input.recordingEnabled ?? false,
      approval_expires_at: input.approvalExpiresAt,
      status: "waiting",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

export async function startSupportSession(id: string) {
  const { error } = await (supabase as any)
    .from("support_sessions")
    .update({ status: "active", started_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function endSupportSession(id: string, reason?: string) {
  const { error } = await (supabase as any)
    .from("support_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString(), end_reason: reason ?? null })
    .eq("id", id);
  if (error) throw error;
}

export async function logSupportActivity(input: {
  sessionId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  await (supabase as any)
    .from("support_activity_log")
    .insert({
      session_id: input.sessionId,
      actor_user_id: user.id,
      action: input.action,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      metadata: input.metadata ?? {},
    });
}
