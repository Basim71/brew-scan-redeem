import { supabase } from "@/integrations/supabase/client";

export type RedemptionFrequency =
  | "daily"
  | "every_2_days"
  | "every_3_days"
  | "weekly"
  | "custom";

export type Plan = {
  id: string;
  name: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  color: string;
  badge: string | null;
  is_active: boolean;
  is_hidden: boolean;
  display_order: number;
  duration_days: number;
  price: number;
  currency: string;
  auto_renewal: boolean;
  grace_period_days: number | null;
  drinks_per_redemption: number;
  redemption_frequency: RedemptionFrequency;
  redemption_frequency_days: number | null;
  max_redemptions_per_period: number | null;
  max_drinks_per_day: number;
  max_drinks_per_redemption: number;
  carry_unused: boolean;
  max_carry_days: number | null;
  redemption_window_start: string | null;
  redemption_window_end: string | null;
  allowed_weekdays: number[];
  max_selectable_drinks: number | null;
  allow_extra_shot: boolean;
  allow_milk: boolean;
  allow_syrup: boolean;
  allow_sugar: boolean;
  allow_comments: boolean;
  max_addons: number | null;
  archived_at: string | null;
  created_at: string;
  allowed_drink_ids: string[];
  allowed_branch_ids: string[];
  excluded_branch_ids: string[];
};

export type PlanInput = Omit<
  Plan,
  "id" | "created_at" | "name" | "allowed_drink_ids" | "allowed_branch_ids" | "excluded_branch_ids"
> & {
  allowed_drink_ids: string[];
  allowed_branch_ids: string[];
  excluded_branch_ids: string[];
};

const SELECT = `
  id,name,name_ar,name_en,description_ar,description_en,color,badge,
  is_active,is_hidden,display_order,duration_days,price,currency,
  auto_renewal,grace_period_days,drinks_per_redemption,
  redemption_frequency,redemption_frequency_days,max_redemptions_per_period,
  max_drinks_per_day,max_drinks_per_redemption,carry_unused,max_carry_days,
  redemption_window_start,redemption_window_end,allowed_weekdays,
  max_selectable_drinks,allow_extra_shot,allow_milk,allow_syrup,allow_sugar,
  allow_comments,max_addons,archived_at,created_at,
  plan_allowed_drinks(drink_type_id),
  plan_allowed_branches(branch_id,mode)
`;

type RawPlan = Omit<Plan, "allowed_drink_ids" | "allowed_branch_ids" | "excluded_branch_ids"> & {
  plan_allowed_drinks: { drink_type_id: string }[];
  plan_allowed_branches: { branch_id: string; mode: string }[];
};

function mapPlan(r: RawPlan): Plan {
  return {
    ...r,
    allowed_drink_ids: r.plan_allowed_drinks?.map((d) => d.drink_type_id) ?? [],
    allowed_branch_ids:
      r.plan_allowed_branches?.filter((b) => b.mode === "include").map((b) => b.branch_id) ?? [],
    excluded_branch_ids:
      r.plan_allowed_branches?.filter((b) => b.mode === "exclude").map((b) => b.branch_id) ?? [],
  };
}

export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select(SELECT)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .returns<RawPlan[]>();
  if (error) throw error;
  return (data ?? []).map(mapPlan);
}

function toRow(payload: PlanInput) {
  return {
    name: payload.name_en || payload.name_ar,
    name_ar: payload.name_ar,
    name_en: payload.name_en,
    description_ar: payload.description_ar,
    description_en: payload.description_en,
    color: payload.color,
    badge: payload.badge,
    is_active: payload.is_active,
    is_hidden: payload.is_hidden,
    display_order: payload.display_order,
    duration_days: payload.duration_days,
    price: payload.price,
    currency: payload.currency,
    auto_renewal: payload.auto_renewal,
    grace_period_days: payload.grace_period_days,
    drinks_per_redemption: payload.drinks_per_redemption,
    redemption_frequency: payload.redemption_frequency,
    redemption_frequency_days: payload.redemption_frequency_days,
    max_redemptions_per_period: payload.max_redemptions_per_period,
    max_drinks_per_day: payload.max_drinks_per_day,
    max_drinks_per_redemption: payload.max_drinks_per_redemption,
    carry_unused: payload.carry_unused,
    max_carry_days: payload.max_carry_days,
    redemption_window_start: payload.redemption_window_start,
    redemption_window_end: payload.redemption_window_end,
    allowed_weekdays: payload.allowed_weekdays,
    max_selectable_drinks: payload.max_selectable_drinks,
    allow_extra_shot: payload.allow_extra_shot,
    allow_milk: payload.allow_milk,
    allow_syrup: payload.allow_syrup,
    allow_sugar: payload.allow_sugar,
    allow_comments: payload.allow_comments,
    max_addons: payload.max_addons,
    archived_at: payload.archived_at,
  };
}

async function syncJoinRows(planId: string, organizationId: string, payload: PlanInput) {
  // Replace allowed drinks
  const delDrinks = await supabase.from("plan_allowed_drinks").delete().eq("plan_id", planId);
  if (delDrinks.error) throw delDrinks.error;
  if (payload.allowed_drink_ids.length > 0) {
    const rows = payload.allowed_drink_ids.map((drink_type_id) => ({
      plan_id: planId,
      drink_type_id,
      organization_id: organizationId,
    }));
    const insDrinks = await supabase.from("plan_allowed_drinks").insert(rows);
    if (insDrinks.error) throw insDrinks.error;
  }

  // Replace allowed/excluded branches
  const delBranches = await supabase.from("plan_allowed_branches").delete().eq("plan_id", planId);
  if (delBranches.error) throw delBranches.error;
  const branchRows = [
    ...payload.allowed_branch_ids.map((branch_id) => ({
      plan_id: planId,
      branch_id,
      organization_id: organizationId,
      mode: "include",
    })),
    ...payload.excluded_branch_ids.map((branch_id) => ({
      plan_id: planId,
      branch_id,
      organization_id: organizationId,
      mode: "exclude",
    })),
  ];
  if (branchRows.length > 0) {
    const insBranches = await supabase.from("plan_allowed_branches").insert(branchRows);
    if (insBranches.error) throw insBranches.error;
  }
}

export async function createPlan(payload: PlanInput, organizationId: string): Promise<string> {
  const { data, error } = await supabase
    .from("plans")
    .insert({ ...toRow(payload), organization_id: organizationId })
    .select("id")
    .single();
  if (error) throw error;
  await syncJoinRows(data.id, organizationId, payload);
  return data.id;
}

export async function updatePlan(
  id: string,
  payload: PlanInput,
  organizationId: string,
): Promise<void> {
  const { error } = await supabase.from("plans").update(toRow(payload)).eq("id", id);
  if (error) throw error;
  await syncJoinRows(id, organizationId, payload);
}

export async function setPlanActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from("plans").update({ is_active: isActive }).eq("id", id);
  if (error) throw error;
}

export async function archivePlan(id: string): Promise<void> {
  const { error } = await supabase
    .from("plans")
    .update({ archived_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) throw error;
}

export async function unarchivePlan(id: string): Promise<void> {
  const { error } = await supabase.from("plans").update({ archived_at: null }).eq("id", id);
  if (error) throw error;
}

export async function deletePlan(id: string): Promise<void> {
  // Server-side: fail if referenced by subscriptions or coupons (FK)
  const { count: subCount, error: subErr } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);
  if (subErr) throw subErr;
  if ((subCount ?? 0) > 0) throw new Error("plan_has_subscriptions");

  const { count: cpCount, error: cpErr } = await supabase
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);
  if (cpErr) throw cpErr;
  if ((cpCount ?? 0) > 0) throw new Error("plan_has_coupons");

  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}