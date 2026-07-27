import { supabase } from "@/integrations/supabase/client";

export type CouponRow = {
  id: string;
  code: string;
  plan_id: string;
  branch_id: string | null;
  price: number;
  status: "available" | "sold" | "expired";
  created_at: string;
  sold_at: string | null;
};

export type PlanLite = { id: string; name: string; price: number };
export type BranchLite = { id: string; name_en: string; name_ar: string };

export async function listCouponsWithLookups(): Promise<{
  coupons: CouponRow[];
  plans: PlanLite[];
  branches: BranchLite[];
}> {
  const [couponsRes, plansRes, branchesRes] = await Promise.all([
    supabase
      .from("coupons")
      .select("id,code,plan_id,branch_id,price,status,created_at,sold_at")
      .order("created_at", { ascending: false })
      .returns<CouponRow[]>(),
    supabase.from("plans").select("id,name,price").order("name").returns<PlanLite[]>(),
    supabase
      .from("branches")
      .select("id,name_en,name_ar")
      .order("name_en")
      .returns<BranchLite[]>(),
  ]);
  if (couponsRes.error) throw couponsRes.error;
  if (plansRes.error) throw plansRes.error;
  if (branchesRes.error) throw branchesRes.error;
  return {
    coupons: couponsRes.data ?? [],
    plans: plansRes.data ?? [],
    branches: branchesRes.data ?? [],
  };
}

export type NewCouponRow = {
  code: string;
  plan_id: string;
  branch_id: string | null;
  price: number;
  status: "available";
};

export async function batchCreateCoupons(rows: NewCouponRow[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from("coupons").insert(rows);
  if (error) throw error;
}