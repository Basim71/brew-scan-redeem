import { supabase } from "@/integrations/supabase/client";

/**
 * Membership service — thin, typed wrapper over `get_my_organizations` and
 * `verify_organization_login` RPCs. Keeps auth-adjacent membership lookups
 * out of route components.
 */

export type MembershipRow = {
  organizationId: string;
  organizationCode: string;
  organizationNameAr: string;
  organizationNameEn: string | null;
  organizationSlug: string;
  organizationStatus: string;
  memberRole: string;
  memberStatus: string;
};

type RawMembership = {
  organization_id: string;
  organization_code: string;
  organization_name_ar: string;
  organization_name_en: string | null;
  organization_slug: string;
  organization_status: string;
  member_role: string;
  member_status: string;
};

function map(row: RawMembership): MembershipRow {
  return {
    organizationId: row.organization_id,
    organizationCode: row.organization_code,
    organizationNameAr: row.organization_name_ar,
    organizationNameEn: row.organization_name_en,
    organizationSlug: row.organization_slug,
    organizationStatus: row.organization_status,
    memberRole: row.member_role,
    memberStatus: row.member_status,
  };
}

export async function listMyMemberships(): Promise<MembershipRow[]> {
  const { data, error } = await (supabase as any).rpc("get_my_organizations");
  if (error) throw error;
  return ((data ?? []) as RawMembership[]).map(map);
}

export async function verifyOrganizationLogin(
  organizationId: string,
): Promise<MembershipRow | null> {
  const { data, error } = await (supabase as any).rpc("verify_organization_login", {
    requested_organization_id: organizationId,
  });
  if (error) throw error;
  const row = (data ?? [])[0] as RawMembership | undefined;
  return row ? map(row) : null;
}