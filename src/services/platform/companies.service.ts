import { supabase } from "@/integrations/supabase/client";

export type CompanyRow = {
  id: string;
  organization_code: string;
  name_ar: string | null;
  name_en: string | null;
  status: string;
  organization_type: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCompanies(): Promise<CompanyRow[]> {
  const { data, error } = await (supabase as any)
    .from("organizations")
    .select("id,organization_code,name_ar,name_en,status,organization_type,email,phone,created_at,updated_at")
    .eq("organization_type", "company")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompanyRow[];
}

export async function getCompany(id: string): Promise<CompanyRow | null> {
  const { data, error } = await (supabase as any)
    .from("organizations")
    .select("id,organization_code,name_ar,name_en,status,organization_type,email,phone,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as CompanyRow | null;
}

export type CompanyMember = {
  id: string;
  user_id: string;
  role: string;
  status: string;
  branch_id: string | null;
  created_at: string;
  profile: { full_name: string | null; email: string | null } | null;
};

export async function listCompanyMembers(organizationId: string): Promise<CompanyMember[]> {
  const { data, error } = await (supabase as any)
    .from("organization_members")
    .select("id,user_id,role,status,branch_id,created_at, profile:profiles(full_name,email)")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as CompanyMember[];
}

export async function listCompanyBranches(organizationId: string) {
  const { data, error } = await (supabase as any)
    .from("branches")
    .select("id,name_ar,name_en,is_active,created_at")
    .eq("organization_id", organizationId)
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function getCompanyCounts(organizationId: string) {
  const s = supabase as any;
  const [members, branches, activeSubs, openCases] = await Promise.all([
    s.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    s.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    s.from("subscriptions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    s.from("tickets").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).not("status", "in", "(closed,cancelled,resolved)"),
  ]);
  return {
    members: members.count ?? 0,
    branches: branches.count ?? 0,
    activeSubscriptions: activeSubs.count ?? 0,
    openCases: openCases.count ?? 0,
  };
}

export async function setCompanyStatus(organizationId: string, status: "active" | "suspended"): Promise<void> {
  const { error } = await (supabase as any)
    .from("organizations")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", organizationId);
  if (error) throw error;
}