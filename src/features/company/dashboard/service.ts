import { supabase } from "@/integrations/supabase/client";

export type DashboardStats = {
  customers: number;
  newCustomersWeek: number;
  newCustomersMonth: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  revenueToday: number;
  revenueMonth: number;
  ordersToday: number;
  pendingOrders: number;
};

export type SoldCoupon = {
  id: string;
  price: number | string;
  sold_at: string | null;
  branch_id?: string | null;
};

export type LatestOrder = {
  id: string;
  status: string;
  created_at: string;
  drink?: { name_en?: string | null; name_ar?: string | null } | null;
  customer?: { name?: string | null } | null;
  branch?: { name_en?: string | null; name_ar?: string | null } | null;
};

export type BranchPerformance = {
  branchId: string;
  nameAr: string | null;
  nameEn: string | null;
  revenueMonth: number;
  ordersMonth: number;
};

export type DashboardPayload = {
  stats: DashboardStats;
  soldCoupons: SoldCoupon[];
  latestOrders: LatestOrder[];
  ordersMonth: { id: string; created_at: string; branch_id: string | null }[];
  branches: { id: string; name_ar: string | null; name_en: string | null }[];
};

const EMPTY_STATS: DashboardStats = {
  customers: 0,
  newCustomersWeek: 0,
  newCustomersMonth: 0,
  activeSubscriptions: 0,
  expiringSubscriptions: 0,
  revenueToday: 0,
  revenueMonth: 0,
  ordersToday: 0,
  pendingOrders: 0,
};

function sumPrices(rows: SoldCoupon[]): number {
  return rows.reduce((total, row) => total + Number(row.price || 0), 0);
}

function todayIsoDate(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function loadCompanyDashboard(): Promise<{
  payload: DashboardPayload;
  error: string | null;
}> {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now.getTime() - 6 * 86400000); weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const chartStart = new Date(now.getTime() - 29 * 86400000); chartStart.setHours(0, 0, 0, 0);
  const expSoon = new Date(now.getTime() + 7 * 86400000);
  const today = todayIsoDate();

  const [
    customersResult,
    weekCustomersResult,
    monthCustomersResult,
    activeSubsResult,
    expiringSubsResult,
    pendingOrdersResult,
    ordersTodayResult,
    soldCouponsResult,
    latestOrdersResult,
    ordersMonthResult,
    branchesResult,
  ] = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
    supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("subscriptions").select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("end_date", expSoon.toISOString().slice(0, 10))
      .gte("end_date", today),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_date", today),
    supabase.from("coupons")
      .select("id,price,sold_at,branch_id")
      .eq("status", "sold")
      .gte("sold_at", chartStart.toISOString())
      .order("sold_at", { ascending: true }),
    supabase.from("orders")
      .select("id,status,created_at,drink:drink_types(name_en,name_ar),customer:customers(name),branch:branches(name_en,name_ar)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("orders")
      .select("id,created_at,branch_id")
      .gte("created_at", monthStart.toISOString()),
    supabase.from("branches").select("id,name_ar,name_en").eq("is_active", true).order("created_at"),
  ]);

  const firstError =
    customersResult.error ??
    weekCustomersResult.error ??
    monthCustomersResult.error ??
    activeSubsResult.error ??
    expiringSubsResult.error ??
    pendingOrdersResult.error ??
    ordersTodayResult.error ??
    soldCouponsResult.error ??
    latestOrdersResult.error ??
    ordersMonthResult.error ??
    branchesResult.error;

  const coupons = (soldCouponsResult.data ?? []) as unknown as SoldCoupon[];
  const todayIso = todayStart.toISOString();
  const monthIso = monthStart.toISOString();
  const salesTodayRows = coupons.filter((c) => c.sold_at && c.sold_at >= todayIso);
  const salesMonthRows = coupons.filter((c) => c.sold_at && c.sold_at >= monthIso);

  const stats: DashboardStats = {
    ...EMPTY_STATS,
    customers: customersResult.count ?? 0,
    newCustomersWeek: weekCustomersResult.count ?? 0,
    newCustomersMonth: monthCustomersResult.count ?? 0,
    activeSubscriptions: activeSubsResult.count ?? 0,
    expiringSubscriptions: expiringSubsResult.count ?? 0,
    revenueToday: sumPrices(salesTodayRows),
    revenueMonth: sumPrices(salesMonthRows),
    ordersToday: ordersTodayResult.count ?? 0,
    pendingOrders: pendingOrdersResult.count ?? 0,
  };

  return {
    payload: {
      stats,
      soldCoupons: coupons,
      latestOrders: (latestOrdersResult.data ?? []) as unknown as LatestOrder[],
      ordersMonth: (ordersMonthResult.data ?? []) as any[],
      branches: (branchesResult.data ?? []) as any[],
    },
    error: firstError?.message ?? null,
  };
}

export function buildDailyRevenue(rows: SoldCoupon[], lang: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.sold_at) continue;
    const key = row.sold_at.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + Number(row.price || 0));
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { day: "numeric", month: "short" }),
      revenue: map.get(key) ?? 0,
    };
  });
}

export function buildSubscriptionTrend(rows: SoldCoupon[], lang: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.sold_at) continue;
    const key = row.sold_at.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return {
      date: key,
      label: d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { day: "numeric", month: "short" }),
      subscriptions: map.get(key) ?? 0,
    };
  });
}

export function buildBranchPerformance(
  branches: DashboardPayload["branches"],
  coupons: SoldCoupon[],
  orders: DashboardPayload["ordersMonth"],
  monthStartIso: string,
): BranchPerformance[] {
  const revenueByBranch = new Map<string, number>();
  for (const c of coupons) {
    if (!c.sold_at || c.sold_at < monthStartIso) continue;
    if (!c.branch_id) continue;
    revenueByBranch.set(c.branch_id, (revenueByBranch.get(c.branch_id) ?? 0) + Number(c.price || 0));
  }
  const ordersByBranch = new Map<string, number>();
  for (const o of orders) {
    if (!o.branch_id) continue;
    ordersByBranch.set(o.branch_id, (ordersByBranch.get(o.branch_id) ?? 0) + 1);
  }
  return branches
    .map((b) => ({
      branchId: b.id,
      nameAr: b.name_ar,
      nameEn: b.name_en,
      revenueMonth: revenueByBranch.get(b.id) ?? 0,
      ordersMonth: ordersByBranch.get(b.id) ?? 0,
    }))
    .sort((a, b) => b.revenueMonth - a.revenueMonth);
}