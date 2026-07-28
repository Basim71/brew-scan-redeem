import { supabase } from "@/integrations/supabase/client";

export type DashboardStats = {
  customers: number;
  newCustomersWeek: number;
  newCustomersMonth: number;
  activeSubscriptions: number;
  expiringSubscriptions: number;
  revenueToday: number;
  revenueYesterday: number;
  revenueMonth: number;
  ordersToday: number;
  pendingOrders: number;
  approvedOrdersToday: number;
  newCustomersToday: number;
  availableCoupons: number;
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
  drink_type_id?: string | null;
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
  ordersToday?: number;
  revenueToday?: number;
  activeMembers?: number;
};

export type ExpiringSub = {
  id: string;
  end_date: string;
  customer_name: string | null;
  plan_name: string | null;
};

export type DrinkPopularity = {
  drinkId: string;
  nameEn: string | null;
  nameAr: string | null;
  imageUrl: string | null;
  ordersMonth: number;
  ordersWeek: number;
  ordersPrevWeek: number;
};

export type RecentCustomer = { id: string; name: string; created_at: string };

export type DashboardPayload = {
  stats: DashboardStats;
  soldCoupons: SoldCoupon[];
  latestOrders: LatestOrder[];
  ordersMonth: { id: string; created_at: string; branch_id: string | null; drink_type_id: string | null; status: string }[];
  branches: { id: string; name_ar: string | null; name_en: string | null }[];
  drinks: { id: string; name_ar: string | null; name_en: string | null; image_url: string | null }[];
  expiringSoon: ExpiringSub[];
  recentCustomers: RecentCustomer[];
  activeSubsByBranch: Record<string, number>;
};

const EMPTY_STATS: DashboardStats = {
  customers: 0,
  newCustomersWeek: 0,
  newCustomersMonth: 0,
  activeSubscriptions: 0,
  expiringSubscriptions: 0,
  revenueToday: 0,
  revenueYesterday: 0,
  revenueMonth: 0,
  ordersToday: 0,
  pendingOrders: 0,
  approvedOrdersToday: 0,
  newCustomersToday: 0,
  availableCoupons: 0,
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
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const weekStart = new Date(now.getTime() - 6 * 86400000); weekStart.setHours(0, 0, 0, 0);
  const prevWeekStart = new Date(now.getTime() - 13 * 86400000); prevWeekStart.setHours(0, 0, 0, 0);
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
    approvedTodayResult,
    availableCouponsResult,
    newCustomersTodayResult,
    soldCouponsResult,
    latestOrdersResult,
    ordersMonthResult,
    branchesResult,
    drinksResult,
    expiringListResult,
    recentCustomersResult,
    activeSubsListResult,
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
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("order_date", today).eq("status", "approved"),
    supabase.from("coupons").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
    supabase.from("coupons")
      .select("id,price,sold_at,branch_id")
      .eq("status", "sold")
      .gte("sold_at", chartStart.toISOString())
      .order("sold_at", { ascending: true }),
    supabase.from("orders")
      .select("id,status,created_at,drink_type_id,drink:drink_types(name_en,name_ar),customer:customers(name),branch:branches(name_en,name_ar)")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("orders")
      .select("id,created_at,branch_id,drink_type_id,status")
      .gte("created_at", monthStart.toISOString()),
    supabase.from("branches").select("id,name_ar,name_en").eq("is_active", true).order("created_at"),
    supabase.from("drink_types").select("id,name_ar,name_en,image_url").eq("is_active", true),
    supabase.from("subscriptions")
      .select("id,end_date,customer:customers(name),plan:plans(name_ar,name_en)")
      .eq("status", "active")
      .lte("end_date", expSoon.toISOString().slice(0, 10))
      .gte("end_date", today)
      .order("end_date", { ascending: true })
      .limit(20),
    supabase.from("customers")
      .select("id,name,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("subscriptions")
      .select("id,branch_id")
      .eq("status", "active"),
  ]);

  const firstError =
    customersResult.error ??
    weekCustomersResult.error ??
    monthCustomersResult.error ??
    activeSubsResult.error ??
    expiringSubsResult.error ??
    pendingOrdersResult.error ??
    ordersTodayResult.error ??
    approvedTodayResult.error ??
    availableCouponsResult.error ??
    newCustomersTodayResult.error ??
    soldCouponsResult.error ??
    latestOrdersResult.error ??
    ordersMonthResult.error ??
    branchesResult.error ??
    drinksResult.error ??
    expiringListResult.error ??
    recentCustomersResult.error ??
    activeSubsListResult.error;

  const coupons = (soldCouponsResult.data ?? []) as unknown as SoldCoupon[];
  const todayIso = todayStart.toISOString();
  const yesterdayIso = yesterdayStart.toISOString();
  const monthIso = monthStart.toISOString();
  const salesTodayRows = coupons.filter((c) => c.sold_at && c.sold_at >= todayIso);
  const salesYesterdayRows = coupons.filter((c) => c.sold_at && c.sold_at >= yesterdayIso && c.sold_at < todayIso);
  const salesMonthRows = coupons.filter((c) => c.sold_at && c.sold_at >= monthIso);

  const stats: DashboardStats = {
    ...EMPTY_STATS,
    customers: customersResult.count ?? 0,
    newCustomersWeek: weekCustomersResult.count ?? 0,
    newCustomersMonth: monthCustomersResult.count ?? 0,
    activeSubscriptions: activeSubsResult.count ?? 0,
    expiringSubscriptions: expiringSubsResult.count ?? 0,
    revenueToday: sumPrices(salesTodayRows),
    revenueYesterday: sumPrices(salesYesterdayRows),
    revenueMonth: sumPrices(salesMonthRows),
    ordersToday: ordersTodayResult.count ?? 0,
    pendingOrders: pendingOrdersResult.count ?? 0,
    approvedOrdersToday: approvedTodayResult.count ?? 0,
    newCustomersToday: newCustomersTodayResult.count ?? 0,
    availableCoupons: availableCouponsResult.count ?? 0,
  };

  const expiringSoon: ExpiringSub[] = ((expiringListResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    end_date: row.end_date,
    customer_name: row.customer?.name ?? null,
    plan_name: row.plan?.name_en ?? row.plan?.name_ar ?? null,
  }));

  const activeSubsByBranch: Record<string, number> = {};
  for (const row of ((activeSubsListResult.data ?? []) as any[])) {
    if (row.branch_id) activeSubsByBranch[row.branch_id] = (activeSubsByBranch[row.branch_id] ?? 0) + 1;
  }

  return {
    payload: {
      stats,
      soldCoupons: coupons,
      latestOrders: (latestOrdersResult.data ?? []) as unknown as LatestOrder[],
      ordersMonth: (ordersMonthResult.data ?? []) as any[],
      branches: (branchesResult.data ?? []) as any[],
      drinks: (drinksResult.data ?? []) as any[],
      expiringSoon,
      recentCustomers: (recentCustomersResult.data ?? []) as any[],
      activeSubsByBranch,
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