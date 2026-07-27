import { supabase } from "@/integrations/supabase/client";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  active_subscriptions?: number;
};

export async function listCustomers(search?: string): Promise<CustomerRow[]> {
  let query = supabase
    .from("customers")
    .select("id,name,phone,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const q = search?.trim();
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as CustomerRow[];

  if (!rows.length) return rows;
  const ids = rows.map((r) => r.id);
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("status", "active")
    .in("customer_id", ids);

  const counts = new Map<string, number>();
  for (const s of (subs ?? []) as { customer_id: string }[]) {
    counts.set(s.customer_id, (counts.get(s.customer_id) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, active_subscriptions: counts.get(r.id) ?? 0 }));
}