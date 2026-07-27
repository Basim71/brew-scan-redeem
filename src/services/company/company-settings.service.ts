import { supabase } from "@/integrations/supabase/client";

export type OrganizationProfileRow = {
  id: string;
  organization_code: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  organization_type: string;
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const PROFILE_SELECT =
  "id,organization_code,name_ar,name_en,slug,email,phone,logo_url,primary_color,secondary_color,status,organization_type,owner_user_id,created_at,updated_at";

export async function getOrganizationProfile(
  organizationId: string,
): Promise<OrganizationProfileRow | null> {
  const { data, error } = await (supabase as any)
    .from("organizations")
    .select(PROFILE_SELECT)
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as OrganizationProfileRow | null;
}

export type OrganizationProfileUpdate = {
  name_ar?: string;
  name_en?: string | null;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
};

export async function updateOrganizationProfile(
  organizationId: string,
  input: OrganizationProfileUpdate,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("organizations")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", organizationId);
  if (error) throw error;
}

export type OrganizationSettingsRow = {
  organization_id: string;
  default_language: string;
  currency: string;
  timezone: string;
  logo_url: string | null;
  background_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  customer_registration_enabled: boolean;
  customer_comments_enabled: boolean;
  one_drink_per_day: boolean;
};

const SETTINGS_SELECT =
  "organization_id,default_language,currency,timezone,logo_url,background_url,primary_color,secondary_color,customer_registration_enabled,customer_comments_enabled,one_drink_per_day";

export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsRow | null> {
  const { data, error } = await (supabase as any)
    .from("organization_settings")
    .select(SETTINGS_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as OrganizationSettingsRow | null;
}

export async function upsertOrganizationSettings(
  organizationId: string,
  patch: Partial<Omit<OrganizationSettingsRow, "organization_id">>,
): Promise<void> {
  const { error } = await (supabase as any)
    .from("organization_settings")
    .upsert({ organization_id: organizationId, ...patch });
  if (error) throw error;
}