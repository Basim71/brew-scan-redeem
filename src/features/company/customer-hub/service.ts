import { supabase } from "@/integrations/supabase/client";

export type HubCustomer = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};

export type HubSubscription = {
  id: string;
  customer_id: string;
  branch_id: string;
  plan_id: string;
  status: "active" | "expired" | "cancelled";
  start_date: string;
  end_date: string;
  created_at: string;
  plan?: {
    id: string;
    name_en: string;
    name_ar: string;
    price: number;
    duration_days: number;
    max_redemptions_per_period: number | null;
  } | null;
  branch?: { id: string; name_en: string; name_ar: string } | null;
};

export type HubOrder = {
  id: string;
  customer_id: string;
  branch_id: string;
  drink_type_id: string;
  subscription_id: string | null;
  status: "pending" | "approved" | "rejected";
  order_date: string;
  created_at: string;
  approved_at: string | null;
  selected_options: unknown;
  customer_note: string | null;
  drink?: { id: string; name_en: string; name_ar: string } | null;
  branch?: { id: string; name_en: string; name_ar: string } | null;
};

export type HubCoupon = {
  id: string;
  code: string;
  status: "available" | "sold" | "expired";
  price: number;
  plan_id: string;
  branch_id: string | null;
  created_at: string;
  sold_at: string | null;
};

export type HubBranch = { id: string; name_en: string; name_ar: string };
export type HubPlan = { id: string; name_en: string; name_ar: string; price: number };

export type HubBundle = {
  customers: HubCustomer[];
  subscriptions: HubSubscription[];
  orders: HubOrder[];
  coupons: HubCoupon[];
  branches: HubBranch[];
  plans: HubPlan[];
};

export async function loadCustomerHub(): Promise<HubBundle> {
  const [customersRes, subsRes, ordersRes, couponsRes, branchesRes, plansRes] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id,name,phone,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("subscriptions")
        .select(
          "id,customer_id,branch_id,plan_id,status,start_date,end_date,created_at," +
            "plan:plans(id,name_en,name_ar,price,duration_days,max_redemptions_per_period)," +
            "branch:branches(id,name_en,name_ar)",
        )
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase
        .from("orders")
        .select(
          "id,customer_id,branch_id,drink_type_id,subscription_id,status,order_date,created_at,approved_at,selected_options,customer_note," +
            "drink:drink_types(id,name_en,name_ar)," +
            "branch:branches(id,name_en,name_ar)",
        )
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase
        .from("coupons")
        .select("id,code,status,price,plan_id,branch_id,created_at,sold_at")
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase.from("branches").select("id,name_en,name_ar").order("name_en"),
      supabase.from("plans").select("id,name_en,name_ar,price").order("name_en"),
    ]);

  const err =
    customersRes.error ||
    subsRes.error ||
    ordersRes.error ||
    couponsRes.error ||
    branchesRes.error ||
    plansRes.error;
  if (err) throw err;

  return {
    customers: (customersRes.data ?? []) as HubCustomer[],
    subscriptions: (subsRes.data ?? []) as unknown as HubSubscription[],
    orders: (ordersRes.data ?? []) as unknown as HubOrder[],
    coupons: (couponsRes.data ?? []) as HubCoupon[],
    branches: (branchesRes.data ?? []) as HubBranch[],
    plans: (plansRes.data ?? []) as HubPlan[],
  };
}

export async function updateSubscriptionStatus(
  id: string,
  status: "active" | "expired" | "cancelled",
): Promise<void> {
  const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
  if (error) throw error;
}