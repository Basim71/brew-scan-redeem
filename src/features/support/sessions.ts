import { supabase } from "@/integrations/supabase/client";

const db = () => supabase as any;

export type SessionMode = "view" | "assist" | "control";
export type SessionStatus = "requested" | "approved" | "rejected" | "active" | "ended" | "expired";

export type TicketSession = {
  id: string;
  ticketId: string;
  organizationId: string;
  agentUserId: string;
  status: SessionStatus;
  mode: SessionMode;
  requestedAt: string;
  approvalExpiresAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  screenShareActive: boolean;
  remoteControlActive: boolean;
  voiceActive: boolean;
  videoActive: boolean;
  recordingActive: boolean;
  currentPath: string | null;
};

const SESSION_SELECT = `
  id, ticket_id, organization_id, agent_user_id, status, mode, requested_at, approval_expires_at,
  approved_by_user_id, approved_at, rejected_at, started_at, ended_at, end_reason,
  screen_share_active, remote_control_active, voice_active, video_active, recording_active, current_path
`;

function mapSession(row: any): TicketSession {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    organizationId: row.organization_id,
    agentUserId: row.agent_user_id,
    status: row.status,
    mode: row.mode,
    requestedAt: row.requested_at,
    approvalExpiresAt: row.approval_expires_at ?? null,
    approvedAt: row.approved_at ?? null,
    rejectedAt: row.rejected_at ?? null,
    startedAt: row.started_at ?? null,
    endedAt: row.ended_at ?? null,
    endReason: row.end_reason ?? null,
    screenShareActive: Boolean(row.screen_share_active),
    remoteControlActive: Boolean(row.remote_control_active),
    voiceActive: Boolean(row.voice_active),
    videoActive: Boolean(row.video_active),
    recordingActive: Boolean(row.recording_active),
    currentPath: row.current_path ?? null,
  };
}

/** Latest non-ended session for a ticket (request, approval or live). */
export async function getLiveSession(ticketId: string): Promise<TicketSession | null> {
  const { data, error } = await db()
    .from("ticket_sessions")
    .select(SESSION_SELECT)
    .eq("ticket_id", ticketId)
    .in("status", ["requested", "approved", "active"])
    .order("requested_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0];
  return row ? mapSession(row) : null;
}

export async function listSessions(ticketId: string): Promise<TicketSession[]> {
  const { data, error } = await db()
    .from("ticket_sessions")
    .select(SESSION_SELECT)
    .eq("ticket_id", ticketId)
    .order("requested_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSession);
}

async function patchSession(sessionId: string, patch: Record<string, unknown>): Promise<TicketSession> {
  const { data, error } = await db()
    .from("ticket_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select(SESSION_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return mapSession(data);
}

/** Agent asks the company for a live session. Approval window: 30 minutes. */
export async function requestSession(input: {
  ticketId: string;
  organizationId: string;
  mode: SessionMode;
}): Promise<TicketSession> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await db()
    .from("ticket_sessions")
    .insert({
      ticket_id: input.ticketId,
      organization_id: input.organizationId,
      agent_user_id: userData.user?.id,
      status: "requested",
      mode: input.mode,
      approval_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    })
    .select(SESSION_SELECT)
    .single();
  if (error) throw new Error(error.message);
  const session = mapSession(data);
  await logActivity(session.id, "session_requested", { mode: input.mode });
  return session;
}

export async function approveSession(sessionId: string): Promise<TicketSession> {
  const { data: userData } = await supabase.auth.getUser();
  const session = await patchSession(sessionId, {
    status: "approved",
    approved_at: new Date().toISOString(),
    approved_by_user_id: userData.user?.id ?? null,
  });
  await logActivity(sessionId, "session_approved", {});
  return session;
}

export async function rejectSession(sessionId: string): Promise<TicketSession> {
  const session = await patchSession(sessionId, {
    status: "rejected",
    rejected_at: new Date().toISOString(),
  });
  await logActivity(sessionId, "session_rejected", {});
  return session;
}

export async function startSession(sessionId: string): Promise<TicketSession> {
  const session = await patchSession(sessionId, {
    status: "active",
    started_at: new Date().toISOString(),
  });
  await logActivity(sessionId, "session_started", {});
  return session;
}

export async function endSession(sessionId: string, reason: string): Promise<TicketSession> {
  const session = await patchSession(sessionId, {
    status: "ended",
    ended_at: new Date().toISOString(),
    end_reason: reason,
    screen_share_active: false,
    remote_control_active: false,
    voice_active: false,
    video_active: false,
    recording_active: false,
  });
  await logActivity(sessionId, "session_ended", { reason });
  return session;
}

export async function setSessionFlags(
  sessionId: string,
  patch: Partial<{
    screen_share_active: boolean;
    remote_control_active: boolean;
    voice_active: boolean;
    recording_active: boolean;
    current_path: string;
  }>,
): Promise<TicketSession> {
  return patchSession(sessionId, patch);
}

/* ---------------- permissions ---------------- */

export type SessionPermission = {
  id: string;
  sessionId: string;
  permission: string;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
};

export const PERMISSION_KEYS = ["screen_share", "co_control", "voice", "recording", "files"] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const permissionLabels: Record<PermissionKey, string> = {
  screen_share: "مشاركة الشاشة",
  co_control: "تحكّم مشترك داخل KOB",
  voice: "المحادثة الصوتية",
  recording: "تسجيل الجلسة",
  files: "مشاركة الملفات",
};

export async function listPermissions(sessionId: string): Promise<SessionPermission[]> {
  const { data, error } = await db()
    .from("session_permissions")
    .select("id, session_id, permission, granted, granted_at, revoked_at")
    .eq("session_id", sessionId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    permission: row.permission,
    granted: Boolean(row.granted),
    grantedAt: row.granted_at ?? null,
    revokedAt: row.revoked_at ?? null,
  }));
}

export async function setPermission(
  sessionId: string,
  permission: PermissionKey,
  granted: boolean,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const existing = await listPermissions(sessionId);
  const row = existing.find((item) => item.permission === permission);
  const payload = {
    granted,
    granted_by_user_id: userData.user?.id ?? null,
    granted_at: granted ? new Date().toISOString() : row?.grantedAt ?? null,
    revoked_at: granted ? null : new Date().toISOString(),
  };
  if (row) {
    const { error } = await db().from("session_permissions").update(payload).eq("id", row.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db()
      .from("session_permissions")
      .insert({ session_id: sessionId, permission, ...payload });
    if (error) throw new Error(error.message);
  }
  await logActivity(sessionId, granted ? "permission_granted" : "permission_revoked", { permission });
}

/* ---------------- audit log ---------------- */

export type ActivityRow = {
  id: number;
  sessionId: string;
  actorUserId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function logActivity(
  sessionId: string,
  action: string,
  metadata: Record<string, unknown>,
  target?: { type: string; id: string },
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await db().from("support_activity_log").insert({
    session_id: sessionId,
    actor_user_id: userData.user.id,
    action,
    target_type: target?.type ?? null,
    target_id: target?.id ?? null,
    metadata,
  });
}

export async function listActivity(sessionId: string, limit = 60): Promise<ActivityRow[]> {
  const { data, error } = await db()
    .from("support_activity_log")
    .select("id, session_id, actor_user_id, action, target_type, target_id, metadata, created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    sessionId: row.session_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    targetType: row.target_type ?? null,
    targetId: row.target_id ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }));
}

/* ---------------- files ---------------- */

export type TicketFile = {
  id: string;
  ticketId: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
  bucket: string;
  path: string;
  uploadedBy: string | null;
  createdAt: string;
};

export async function listTicketFiles(ticketId: string): Promise<TicketFile[]> {
  const { data, error } = await db()
    .from("ticket_files")
    .select("id, ticket_id, file_name, mime_type, size_bytes, bucket, path, uploaded_by, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    ticketId: row.ticket_id,
    fileName: row.file_name,
    mimeType: row.mime_type ?? null,
    sizeBytes: row.size_bytes ?? null,
    bucket: row.bucket,
    path: row.path,
    uploadedBy: row.uploaded_by ?? null,
    createdAt: row.created_at,
  }));
}

export async function uploadTicketFile(ticketId: string, file: File): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${ticketId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("support-attachments").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await db().from("ticket_files").insert({
    ticket_id: ticketId,
    uploaded_by: userData.user?.id,
    bucket: "support-attachments",
    path,
    file_name: file.name,
    mime_type: file.type || null,
    size_bytes: file.size,
    kind: file.type.startsWith("image/") ? "image" : "file",
  });
  if (error) throw new Error(error.message);
}

export async function getFileUrl(file: TicketFile): Promise<string | null> {
  const { data, error } = await supabase.storage.from(file.bucket).createSignedUrl(file.path, 600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/* ---------------- internal notes ---------------- */

export type TicketNote = {
  id: string;
  ticketId: string;
  authorUserId: string | null;
  source: string;
  body: string;
  createdAt: string;
};

export async function listNotes(ticketId: string): Promise<TicketNote[]> {
  const { data, error } = await db()
    .from("ticket_notes")
    .select("id, ticket_id, author_user_id, source, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    ticketId: row.ticket_id,
    authorUserId: row.author_user_id ?? null,
    source: row.source,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function addNote(ticketId: string, body: string, sessionId?: string | null): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await db().from("ticket_notes").insert({
    ticket_id: ticketId,
    session_id: sessionId ?? null,
    author_user_id: userData.user?.id,
    source: "agent",
    body: body.trim(),
  });
  if (error) throw new Error(error.message);
}

/* ---------------- recordings ---------------- */

export async function saveRecording(input: {
  ticketId: string;
  sessionId: string;
  blob: Blob;
  durationSeconds: number;
}): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const path = `${input.ticketId}/${input.sessionId}-${Date.now()}.webm`;
  const { error: uploadError } = await supabase.storage
    .from("support-recordings")
    .upload(path, input.blob, { contentType: "video/webm", upsert: false });
  if (uploadError) throw new Error(uploadError.message);
  const { error } = await db().from("ticket_recordings").insert({
    ticket_id: input.ticketId,
    session_id: input.sessionId,
    bucket: "support-recordings",
    path,
    status: "ready",
    duration_seconds: Math.round(input.durationSeconds),
    size_bytes: input.blob.size,
    includes_video: true,
    includes_audio: false,
    includes_chat: false,
    includes_input: true,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
  await logActivity(input.sessionId, "recording_saved", { path });
}

export async function listRecordings(ticketId: string) {
  const { data, error } = await db()
    .from("ticket_recordings")
    .select("id, session_id, bucket, path, duration_seconds, size_bytes, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* ---------------- presence ---------------- */

export async function touchPresence(status: "online" | "busy" | "offline", ticketId?: string, sessionId?: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  await db().from("support_presence").upsert(
    {
      user_id: userData.user.id,
      status,
      current_ticket_id: ticketId ?? null,
      current_session_id: sessionId ?? null,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
}

/* ---------------- AI suggestions ---------------- */

export type AiSuggestion = {
  id: string;
  kind: string;
  audience: string;
  content: string;
  status: string;
  createdAt: string;
};

export async function listAiSuggestions(ticketId: string): Promise<AiSuggestion[]> {
  const { data, error } = await db()
    .from("ai_suggestions")
    .select("id, kind, audience, content, status, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({
    id: row.id,
    kind: row.kind,
    audience: row.audience,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
  }));
}
