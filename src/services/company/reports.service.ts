import { supabase } from "@/integrations/supabase/client";

export type CouponRevenueRow = { price: number; sold_at: string | null };

export async function listSoldCoupons(from: string, to: string): Promise<CouponRevenueRow[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("price,sold_at")
    .eq("status", "sold")
    .gte("sold_at", from)
    .lte("sold_at", to)
    .returns<CouponRevenueRow[]>();
  if (error) throw error;
  return data ?? [];
}

export type OrderStatRow = { id: string; status: string; approved_at: string | null; branch_id: string };

export async function listOrdersForReport(from: string, to: string): Promise<OrderStatRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id,status,approved_at,branch_id")
    .gte("created_at", from)
    .lte("created_at", to)
    .returns<OrderStatRow[]>();
  if (error) throw error;
  return data ?? [];
}