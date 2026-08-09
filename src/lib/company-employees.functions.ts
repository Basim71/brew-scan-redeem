import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ helpers */

const ROLES = ["owner", "admin", "manager", "cashier"] as const;
export type EmployeeRole = (typeof ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(value: unknown, field: string, { max = 160, required = true } = {}): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    if (required) throw new Error(`missing_${field}`);
    return "";
  }
  if (raw.length > max) throw new Error(`too_long_${field}`);
  return raw;
}

function uuid(value: unknown, field: string, required = true): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    if (required) throw new Error(`missing_${field}`);
    return null;
  }
  if (!/^[0-9a-f-]{36}$/i.test(raw)) throw new Error(`invalid_${field}`);
  return raw;
}

function role(value: unknown): EmployeeRole {
  const raw = String(value ?? "");
  if (!(ROLES as readonly string[]).includes(raw)) throw new Error("invalid_role");
  return raw as EmployeeRole;
}

export function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  return `Kob-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

type Ctx = { supabase: any; userId: string };

/** Confirms the caller manages the organization and returns their own role. */
async function assertManager(context: Ctx, organizationId: string): Promise<EmployeeRole> {
  const { data, error } = await context.supabase
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.status !== "active") throw new Error("forbidden");
  if (data.role !== "owner" && data.role !== "admin") throw new Error("forbidden");
  return data.role as EmployeeRole;
}

async function logActivity(
  admin: any,
  input: {
    organizationId: string;
    actorUserId: string;
    action: string;
    entityId?: string | null;
    entityLabel?: string | null;
    metadata?: Record<string, unknown>;
    severity?: "info" | "warning" | "critical";
  },
) {
  await admin.from("organization_activity_log").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    action: input.action,
    category: "employees",
    entity_type: "employee",
    entity_id: input.entityId ?? null,
    entity_label: input.entityLabel ?? null,
    severity: input.severity ?? "info",
    metadata: input.metadata ?? {},
  });
}

/* ------------------------------------------------------------- invite / create */

export const inviteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => ({
    organizationId: uuid(input.organizationId, "organization")!,
    email: (() => {
      const email = str(input.email, "email").toLowerCase();
      if (!EMAIL_RE.test(email)) throw new Error("invalid_email");
      return email;
    })(),
    fullName: str(input.fullName, "name", { max: 120 }),
    role: role(input.role),
    branchId: uuid(input.branchId, "branch", false),
    jobTitle: str(input.jobTitle, "job_title", { max: 80, required: false }) || null,
    phone: str(input.phone, "phone", { max: 20, required: false }) || null,
    password: str(input.password, "password", { max: 72, required: false }) || null,
  }))
  .handler(async ({ data, context }) => {
    const callerRole = await assertManager(context as Ctx, data.organizationId);
    if (data.role === "owner" && callerRole !== "owner") throw new Error("only_owner_assigns_owner");
    if (data.password && data.password.length < 8) throw new Error("weak_password");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const password = data.password ?? generatePassword();

    let userId: string | null = null;
    let createdAccount = false;

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    } as any);

    if (created.error) {
      const message = created.error.message ?? "";
      const exists = /already|registered|duplicate/i.test(message);
      if (!exists) throw new Error(message || "could_not_create_account");
      const { data: existing } = await (supabaseAdmin as any)
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();
      if (!existing?.id) throw new Error("email_taken_elsewhere");
      userId = existing.id as string;
    } else {
      userId = created.data.user?.id ?? null;
      createdAccount = true;
    }
    if (!userId) throw new Error("could_not_create_account");

    await (supabaseAdmin as any)
      .from("profiles")
      .upsert({ id: userId, full_name: data.fullName, email: data.email, branch_id: data.branchId }, { onConflict: "id" });

    const { data: existingMember } = await (supabaseAdmin as any)
      .from("organization_members")
      .select("id")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingMember?.id) throw new Error("already_a_member");

    const { error: memberError } = await (supabaseAdmin as any).from("organization_members").insert({
      organization_id: data.organizationId,
      user_id: userId,
      role: data.role,
      status: "active",
      branch_id: data.branchId,
      job_title: data.jobTitle,
      phone: data.phone,
      invited_by: (context as Ctx).userId,
      invited_at: new Date().toISOString(),
    });
    if (memberError) throw new Error(memberError.message);

    await logActivity(supabaseAdmin, {
      organizationId: data.organizationId,
      actorUserId: (context as Ctx).userId,
      action: createdAccount ? "employee.account_created" : "employee.linked_existing_account",
      entityId: userId,
      entityLabel: data.fullName,
      metadata: { email: data.email, role: data.role },
    });

    return {
      userId,
      createdAccount,
      // Returned once so the admin can hand the credentials over securely.
      temporaryPassword: createdAccount ? password : null,
    };
  });

/* ------------------------------------------------------------ password reset */

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => ({
    organizationId: uuid(input.organizationId, "organization")!,
    userId: uuid(input.userId, "user")!,
    password: str(input.password, "password", { max: 72, required: false }) || null,
  }))
  .handler(async ({ data, context }) => {
    await assertManager(context as Ctx, data.organizationId);
    if (data.password && data.password.length < 8) throw new Error("weak_password");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: member } = await (supabaseAdmin as any)
      .from("organization_members")
      .select("id,role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (!member) throw new Error("member_not_found");

    const password = data.password ?? generatePassword();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password });
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      organizationId: data.organizationId,
      actorUserId: (context as Ctx).userId,
      action: "employee.password_reset",
      entityId: data.userId,
      severity: "warning",
    });

    return { temporaryPassword: password };
  });

/* ------------------------------------------------------------------- removal */

export const removeEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => ({
    organizationId: uuid(input.organizationId, "organization")!,
    memberId: uuid(input.memberId, "member")!,
  }))
  .handler(async ({ data, context }) => {
    await assertManager(context as Ctx, data.organizationId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member, error } = await (supabaseAdmin as any)
      .from("organization_members")
      .select("id,user_id,role")
      .eq("id", data.memberId)
      .eq("organization_id", data.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!member) throw new Error("member_not_found");
    if (member.user_id === (context as Ctx).userId) throw new Error("cannot_remove_self");

    if (member.role === "owner") {
      const { count } = await (supabaseAdmin as any)
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", data.organizationId)
        .eq("role", "owner")
        .eq("status", "active");
      if ((count ?? 0) <= 1) throw new Error("cannot_remove_last_owner");
    }

    const { error: deleteError } = await (supabaseAdmin as any)
      .from("organization_members")
      .delete()
      .eq("id", data.memberId)
      .eq("organization_id", data.organizationId);
    if (deleteError) throw new Error(deleteError.message);

    await logActivity(supabaseAdmin, {
      organizationId: data.organizationId,
      actorUserId: (context as Ctx).userId,
      action: "employee.removed",
      entityId: member.user_id,
      severity: "warning",
    });

    return { ok: true };
  });
