import { supabase } from "@/integrations/supabase/client";

export type CompanyMemberRole = "owner" | "admin" | "manager" | "cashier";

export type CompanyMemberRow = {
  id: string;
  user_id: string;
  role: CompanyMemberRole;
  status: string;
  branch_id: string | null;
  job_title: string | null;
  phone: string | null;
  permissions: Record<string, boolean>;
  last_login_at: string | null;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
  profile: { full_name: string | null; email: string | null } | null;
  branch: { id: string; name_ar: string; name_en: string } | null;
};

const SELECT = `
  id,user_id,role,status,branch_id,job_title,phone,permissions,last_login_at,invited_at,created_at,updated_at,
  profile:profiles(full_name,email),
  branch:branches(id,name_ar,name_en)
`;

export async function listCompanyMembers(
  organizationId: string,
): Promise<CompanyMemberRow[]> {
  const { data, error } = await (supabase as any)
    .from("organization_members")
    .select(SELECT)
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CompanyMemberRow[];
}

/** Change a member's role. Blocked from demoting the last owner. */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: CompanyMemberRole,
): Promise<void> {
  // Guardrail: prevent demoting the last remaining owner.
  const { data: current, error: currentError } = await (supabase as any)
    .from("organization_members")
    .select("id,role")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (currentError) throw currentError;
  if (!current) throw new Error("member_not_found");

  if (current.role === "owner" && newRole !== "owner") {
    const { count, error: countError } = await (supabase as any)
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("role", "owner")
      .eq("status", "active");
    if (countError) throw countError;
    if ((count ?? 0) <= 1) throw new Error("cannot_demote_last_owner");
  }

  const { error } = await (supabase as any)
    .from("organization_members")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function setMemberStatus(
  organizationId: string,
  memberId: string,
  status: "active" | "inactive",
): Promise<void> {
  const { error } = await (supabase as any)
    .from("organization_members")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

/** Assign a member to one branch, or to every branch when `branchId` is null. */
export async function setMemberBranch(
  organizationId: string,
  memberId: string,
  branchId: string | null,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("organization_members")
    .update({ branch_id: branchId, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
/** Update editable employee profile fields on the membership record. */
export async function updateMemberDetails(
  organizationId: string,
  memberId: string,
  patch: {
    job_title?: string | null;
    phone?: string | null;
    permissions?: Record<string, boolean>;
    branch_id?: string | null;
  },
): Promise<void> {
  const { error } = await (supabase as any)
    .from("organization_members")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", memberId)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

/** Also update the shared profile record (name shown across the app). */
export async function updateMemberProfileName(userId: string, fullName: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", userId);
  if (error) throw error;
}
