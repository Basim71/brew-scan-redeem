import { supabase } from "@/integrations/supabase/client";

export type PromotionRow = {
  id: string;
  organization_id: string;
  branch_id: string | null;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  image_url: string | null;
  cta_label_ar: string | null;
  cta_label_en: string | null;
  cta_url: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type PromotionInput = {
  branch_id: string | null;
  title_ar: string;
  title_en: string;
  body_ar: string | null;
  body_en: string | null;
  image_url: string | null;
  cta_label_ar: string | null;
  cta_label_en: string | null;
  cta_url: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

const db = () => supabase as any;

export async function listPromotions(organizationId: string): Promise<PromotionRow[]> {
  const { data, error } = await db()
    .from("scan_promotions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PromotionRow[];
}

export async function createPromotion(organizationId: string, input: PromotionInput): Promise<void> {
  const { error } = await db()
    .from("scan_promotions")
    .insert({ ...input, organization_id: organizationId });
  if (error) throw error;
}

export async function updatePromotion(id: string, input: Partial<PromotionInput>): Promise<void> {
  const { error } = await db().from("scan_promotions").update(input).eq("id", id);
  if (error) throw error;
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await db().from("scan_promotions").delete().eq("id", id);
  if (error) throw error;
}

export type ScanBranchOption = { id: string; name_ar: string; name_en: string };

export async function listOrganizationBranches(organizationId: string): Promise<ScanBranchOption[]> {
  const { data, error } = await db()
    .from("branches")
    .select("id,name_ar,name_en")
    .eq("organization_id", organizationId)
    .order("name_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ScanBranchOption[];
}
