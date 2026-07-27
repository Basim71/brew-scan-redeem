import { supabase } from "@/integrations/supabase/client";
import type { CustomerSuccessCase } from "./types";

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
