import { supabase } from "@/integrations/supabase/client";

const db = () => supabase as any;

/* ------------------------------------------------------------------ profile */

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
  const { data, error } = await db()
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

const PROFILE_WRITABLE: Array<keyof OrganizationProfileUpdate> = [
  "name_ar",
  "name_en",
  "email",
  "phone",
  "logo_url",
  "primary_color",
  "secondary_color",
];

export async function updateOrganizationProfile(
  organizationId: string,
  input: OrganizationProfileUpdate,
): Promise<OrganizationProfileRow> {
  const payload: Record<string, unknown> = {};
  for (const key of PROFILE_WRITABLE) {
    if (key in input) payload[key] = (input as any)[key];
  }
  const { data, error } = await db()
    .from("organizations")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select(PROFILE_SELECT)
    .single();
  if (error) throw error;
  await logSettingsChange(organizationId, "general", payload);
  return data as OrganizationProfileRow;
}

/* ----------------------------------------------------------------- settings */

export type PaymentMethod =
  | "cash"
  | "card"
  | "apple_pay"
  | "stc_pay"
  | "mada"
  | "bank_transfer";

export type OrganizationSettingsRow = {
  organization_id: string;
  default_language: "ar" | "en";
  currency: string;
  timezone: string;
  address: string | null;
  logo_url: string | null;
  background_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;

  sales_channel_customer_app: boolean;
  sales_channel_cashier: boolean;
  sales_channel_website: boolean;
  sales_channel_external_api: boolean;

  payment_methods: PaymentMethod[];
  default_payment_method: PaymentMethod;

  tax_enabled: boolean;
  tax_percentage: number;
  tax_included: boolean;

  default_activation: "immediate" | "manual" | "scheduled";
  auto_renewal: boolean;
  default_bonus_days: number;
  one_drink_per_day: boolean;

  order_prep_minutes: number;
  order_number_format: "sequential" | "daily" | "branch_prefixed";
  queue_behavior: "fifo" | "priority" | "manual";
  customer_registration_enabled: boolean;
  customer_comments_enabled: boolean;
  allow_multiple_active_orders: boolean;

  welcome_message_ar: string | null;
  welcome_message_en: string | null;
  order_completed_message_ar: string | null;
  order_completed_message_en: string | null;
  loyalty_message_ar: string | null;
  loyalty_message_en: string | null;

  notify_email: boolean;
  notify_sms: boolean;
  notify_push: boolean;
  notify_orders: boolean;
  notify_subscription_expiry: boolean;
  notify_low_stock: boolean;
  notify_training: boolean;

  session_timeout_minutes: number;
  password_policy: "standard" | "strong" | "strict";
  two_factor_required: boolean;
  login_restriction: "none" | "ip_allowlist" | "business_hours";
  allowed_ip_addresses: string[];
  audit_log_enabled: boolean;

  default_employee_role: string;
  employee_invite_mode: "admin_only" | "managers_allowed" | "disabled";
  password_reset_policy: "self_service" | "admin_only";

  default_branch_id: string | null;
  branch_qr_mode: "per_branch" | "single";

  integrations: Record<string, unknown>;
  updated_at: string;
};

export type SettingsPatch = Partial<Omit<OrganizationSettingsRow, "organization_id" | "updated_at">>;

const SETTINGS_SELECT = "*";

export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsRow | null> {
  const { data, error } = await db()
    .from("organization_settings")
    .select(SETTINGS_SELECT)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as OrganizationSettingsRow | null;
}

/** Reads settings, creating the defaults row on first access. */
export async function ensureOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettingsRow> {
  const existing = await getOrganizationSettings(organizationId);
  if (existing) return existing;
  const { data, error } = await db()
    .from("organization_settings")
    .upsert({ organization_id: organizationId }, { onConflict: "organization_id" })
    .select(SETTINGS_SELECT)
    .single();
  if (error) throw error;
  return data as OrganizationSettingsRow;
}

export async function updateOrganizationSettings(
  organizationId: string,
  patch: SettingsPatch,
  section = "settings",
  previous?: Record<string, unknown> | null,
): Promise<OrganizationSettingsRow> {
  const { data, error } = await db()
    .from("organization_settings")
    .upsert({ organization_id: organizationId, ...patch }, { onConflict: "organization_id" })
    .select(SETTINGS_SELECT)
    .single();
  if (error) throw error;
  await logSettingsChange(organizationId, section, patch as Record<string, unknown>, previous ?? null);
  return data as OrganizationSettingsRow;
}

/** Backwards-compatible alias used by older call sites. */
export const upsertOrganizationSettings = updateOrganizationSettings;

/* -------------------------------------------------------------------- audit */

export type SettingsAuditRow = {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  section: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

function serialize(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export async function logSettingsChange(
  organizationId: string,
  section: string,
  patch: Record<string, unknown>,
  previous?: Record<string, unknown> | null,
): Promise<void> {
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const { data: auth } = await supabase.auth.getUser();
  const actor = auth.user?.id;
  if (!actor) return;
  const rows = fields.map((field) => ({
    organization_id: organizationId,
    actor_user_id: actor,
    section,
    field,
    old_value: previous ? serialize(previous[field]) : null,
    new_value: serialize(patch[field]),
  }));
  // Audit failures must never block the user's save.
  await db().from("organization_settings_audit").insert(rows);
}

export async function listSettingsAudit(
  organizationId: string,
  limit = 50,
): Promise<SettingsAuditRow[]> {
  const { data, error } = await db()
    .from("organization_settings_audit")
    .select("id,organization_id,actor_user_id,section,field,old_value,new_value,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SettingsAuditRow[];
}
