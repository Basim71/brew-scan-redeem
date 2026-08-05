import { supabase } from "@/integrations/supabase/client";

import type { Ticket, TicketEvent, TicketMessage, TicketStatus } from "./types";

const db = () => supabase as any;

const TICKET_SELECT = `
  id, ticket_number, organization_id, branch_id, created_by_user_id, created_by_member_id,
  category, priority, status, subject, description, context, ai_summary,
  assigned_agent_user_id, assigned_at, session_preference, scheduled_at,
  allow_view, allow_remote_control, allow_voice, allow_recording,
  first_response_at, resolved_at, closed_at, created_at, updated_at,
  organization:organizations(name_ar,name_en)
`;

function mapTicket(row: any): Ticket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    organizationId: row.organization_id,
    branchId: row.branch_id ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    createdByMemberId: row.created_by_member_id ?? null,
    category: row.category,
    priority: row.priority,
    status: row.status,
    subject: row.subject,
    description: row.description,
    context: row.context ?? {},
    aiSummary: row.ai_summary ?? null,
    assignedAgentUserId: row.assigned_agent_user_id ?? null,
    assignedAt: row.assigned_at ?? null,
    sessionPreference: row.session_preference,
    scheduledAt: row.scheduled_at ?? null,
    allowView: row.allow_view,
    allowRemoteControl: row.allow_remote_control,
    allowVoice: row.allow_voice,
    allowRecording: row.allow_recording,
    firstResponseAt: row.first_response_at ?? null,
    resolvedAt: row.resolved_at ?? null,
    closedAt: row.closed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    organization: row.organization ?? null,
  };
}

function mapMessage(row: any): TicketMessage {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    senderUserId: row.sender_user_id ?? null,
    senderKind: row.sender_kind,
    kind: row.kind,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
}

function mapEvent(row: any): TicketEvent {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    actorKind: row.actor_kind,
    eventType: row.event_type,
    fromStatus: row.from_status ?? null,
    toStatus: row.to_status ?? null,
    message: row.message ?? null,
    createdAt: row.created_at,
  };
}

export async function listTickets(organizationId?: string): Promise<Ticket[]> {
  let query = db().from("tickets").select(TICKET_SELECT).order("created_at", { ascending: false });
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTicket);
}

export async function getTicket(ticketId: string): Promise<Ticket> {
  const { data, error } = await db().from("tickets").select(TICKET_SELECT).eq("id", ticketId).single();
  if (error) throw new Error(error.message);
  return mapTicket(data);
}

export type CreateTicketInput = {
  organizationId: string;
  createdByMemberId: string | null;
  branchId?: string | null;
  category: string;
  priority: string;
  subject: string;
  description: string;
  sessionPreference: string;
  scheduledAt?: string | null;
  allowView: boolean;
  allowRemoteControl: boolean;
  allowVoice: boolean;
  allowRecording: boolean;
  context: Record<string, unknown>;
};

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const { data: numberData, error: numberError } = await db().rpc("next_ticket_number");
  if (numberError) throw new Error(numberError.message);

  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await db()
    .from("tickets")
    .insert({
      ticket_number: numberData,
      organization_id: input.organizationId,
      created_by_user_id: userData.user?.id ?? null,
      created_by_member_id: input.createdByMemberId,
      branch_id: input.branchId ?? null,
      category: input.category,
      priority: input.priority,
      status: "new",
      subject: input.subject.trim(),
      description: input.description.trim(),
      session_preference: input.sessionPreference,
      scheduled_at: input.scheduledAt || null,
      allow_view: input.allowView,
      allow_remote_control: input.allowRemoteControl,
      allow_voice: input.allowVoice,
      allow_recording: input.allowRecording,
      context: input.context,
    })
    .select(TICKET_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapTicket(data);
}

export async function updateTicket(
  ticketId: string,
  patch: Record<string, unknown>,
): Promise<Ticket> {
  const { data, error } = await db()
    .from("tickets")
    .update(patch)
    .eq("id", ticketId)
    .select(TICKET_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapTicket(data);
}

export async function setTicketStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
  const patch: Record<string, unknown> = { status };
  if (status === "resolved") patch.resolved_at = new Date().toISOString();
  if (status === "closed") patch.closed_at = new Date().toISOString();
  return updateTicket(ticketId, patch);
}

export async function claimTicket(ticketId: string): Promise<Ticket> {
  const { data: userData } = await supabase.auth.getUser();
  return updateTicket(ticketId, {
    assigned_agent_user_id: userData.user?.id ?? null,
    assigned_at: new Date().toISOString(),
    status: "accepted",
  });
}

export async function listMessages(
  ticketId: string,
  includeInternal: boolean,
): Promise<TicketMessage[]> {
  let query = db()
    .from("ticket_messages")
    .select("id, ticket_id, sender_user_id, sender_kind, kind, body, visibility, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (!includeInternal) query = query.eq("visibility", "shared");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(input: {
  ticketId: string;
  body: string;
  senderKind: "company" | "agent";
  visibility?: "shared" | "internal";
}): Promise<TicketMessage> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await db()
    .from("ticket_messages")
    .insert({
      ticket_id: input.ticketId,
      sender_user_id: userData.user?.id ?? null,
      sender_kind: input.senderKind,
      kind: "text",
      body: input.body.trim(),
      visibility: input.visibility ?? "shared",
    })
    .select("id, ticket_id, sender_user_id, sender_kind, kind, body, visibility, created_at")
    .single();
  if (error) throw new Error(error.message);
  return mapMessage(data);
}

export async function listEvents(ticketId: string): Promise<TicketEvent[]> {
  const { data, error } = await db()
    .from("ticket_events")
    .select("id, ticket_id, actor_kind, event_type, from_status, to_status, message, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapEvent);
}

export async function submitRating(input: {
  ticketId: string;
  rating: number;
  resolved: boolean;
  comment?: string;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await db().from("ticket_ratings").insert({
    ticket_id: input.ticketId,
    submitted_by_user_id: userData.user?.id ?? null,
    rating: input.rating,
    resolved: input.resolved,
    comment: input.comment?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function getRating(ticketId: string) {
  const { data, error } = await db()
    .from("ticket_ratings")
    .select("id, rating, resolved, comment, created_at")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
