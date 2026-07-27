import { supabase } from "@/integrations/supabase/client";

export type OrderRow = {
  id: string;
  status: "pending" | "approved" | "rejected" | string;
  order_date: string;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
  customer_note: string | null;
  customer?: { name?: string | null; phone?: string | null } | null;
  branch?: { name_ar?: string | null; name_en?: string | null } | null;
  drink?: { name_ar?: string | null; name_en?: string | null } | null;
};

export type OrderStatus = "all" | "pending" | "approved" | "rejected";

export async function listOrders(filter: OrderStatus = "all", limit = 100): Promise<OrderRow[]> {
  let q = supabase
    .from("orders")
    .select(
      "id,status,order_date,created_at,approved_at,rejected_at,customer_note," +
        "customer:customers(name,phone),branch:branches(name_ar,name_en),drink:drink_types(name_ar,name_en)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as OrderRow[];
}

export async function approveOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").update({ status: "approved" }).eq("id", id);
  if (error) throw error;
}

export async function rejectOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}