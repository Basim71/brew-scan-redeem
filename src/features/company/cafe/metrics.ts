import { supabase } from "@/integrations/supabase/client";

export type Named = { ar: string | null; en: string | null };

export type CafeSale = {
  id: string;
  at: string;
  day: string;
  price: number;
  branchId: string | null;
  branch: Named;
  plan: Named;
  customerId: string | null;
  renewal: boolean;
};

export type CafeOrder = {
  id: string;
  status: string;
  createdAt: string;
  orderDate: string | null;
  stage: string | null;
  drink: Named & { image: string | null };
  customer: string | null;
  branch: Named;
};

export type ExpiringSub = {
  id: string;
  name: string | null;
  days: number;
  end: string;
};

export type CafeCommerce = {
  sales: CafeSale[];
  orders: CafeOrder[];
  activeSubscribers: number;
  totalCustomers: number;
  expiring: ExpiringSub[];
  expiringCount: number;
  availableCoupons: number;
  customersWithoutSub: number;
  pendingOrders: number;
};

export function riyadhToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function riyadhDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return riyadhToday(date);
}

export type PeriodPreset = "today" | "week" | "last30" | "month" | "custom";

export function periodRange(
  preset: PeriodPreset,
  custom?: { from: string; to: string },
  now = new Date(),
): { from: string; to: string } {
  const today = riyadhToday(now);
  const [year, month, day] = today.split("-").map(Number);
  const shift = (days: number) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: shift(-6), to: today };
  if (preset === "last30") return { from: shift(-29), to: today };
  if (preset === "month")
    return { from: `${year}-${String(month).padStart(2, "0")}-01`, to: today };
  const from = custom?.from || today;
  const to = custom?.to || today;
  return from <= to ? { from, to } : { from: to, to: from };
}

type Bag = {
  id?: string;
  name?: string | null;
  name_ar?: string | null;
  name_en?: string | null;
  price?: number | string | null;
  sold_at?: string | null;
  created_at?: string | null;
  branch_id?: string | null;
  coupon_id?: string | null;
  customer_id?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  order_date?: string | null;
  fulfillment_stage?: string | null;
  image_url?: string | null;
  branch?: Bag | null;
  plan?: Bag | null;
  drink?: Bag | null;
  customer?: { name?: string | null } | null;
};

function named(row: Bag | null | undefined): Named {
  return {
    ar: row?.name_ar ?? row?.name ?? null,
    en: row?.name_en ?? row?.name ?? null,
  };
}

/** Sold plan codes are the single revenue source for home and reports. */
export async function loadCafeCommerce(): Promise<CafeCommerce> {
  const today = riyadhToday();
  const soon = periodRange("today").to;
  const [year, month, day] = soon.split("-").map(Number);
  const soonDate = new Date(Date.UTC(year, month - 1, day));
  soonDate.setUTCDate(soonDate.getUTCDate() + 7);
  const soonDay = soonDate.toISOString().slice(0, 10);

  const orderSelect =
    "id,status,created_at,order_date,fulfillment_stage,drink:drink_types(name_ar,name_en,image_url),customer:customers(name),branch:branches(name_ar,name_en)";
  const orderFallback =
    "id,status,created_at,order_date,drink:drink_types(name_ar,name_en,image_url),customer:customers(name),branch:branches(name_ar,name_en)";

  const [
    couponsRes,
    subsRes,
    ordersTry,
    customersRes,
    availableRes,
    pendingRes,
  ] = await Promise.all([
    supabase
      .from("coupons")
      .select(
        "id,price,status,sold_at,created_at,branch_id,plan_id,branch:branches(name_ar,name_en),plan:plans(name_ar,name_en)",
      )
      .eq("status", "sold")
      .limit(4000),
    supabase
      .from("subscriptions")
      .select(
        "id,customer_id,coupon_id,created_at,status,start_date,end_date,customer:customers(name)",
      )
      .limit(4000),
    supabase
      .from("orders")
      .select(orderSelect)
      .order("created_at", { ascending: false })
      .limit(400),
    supabase.from("customers").select("id", { count: "exact" }).limit(4000),
    supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("status", "available"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const ordersRes = ordersTry.error
    ? await supabase
        .from("orders")
        .select(orderFallback)
        .order("created_at", { ascending: false })
        .limit(400)
    : ordersTry;

  const first =
    couponsRes.error ||
    subsRes.error ||
    ordersRes.error ||
    customersRes.error ||
    availableRes.error ||
    pendingRes.error;
  if (first) throw first;

  const subs = (subsRes.data ?? []) as Bag[];
  const customerByCoupon = new Map<string, string>();
  for (const sub of subs) {
    if (sub.coupon_id && sub.customer_id)
      customerByCoupon.set(sub.coupon_id, sub.customer_id);
  }

  const draft = ((couponsRes.data ?? []) as Bag[])
    .map((row) => {
      const at = row.sold_at || row.created_at || "";
      return {
        id: row.id ?? "",
        at,
        day: at ? riyadhDay(at) : "",
        price: Number(row.price ?? 0),
        branchId: (row.branch_id ?? null) as string | null,
        branch: named(row.branch),
        plan: named(row.plan),
        customerId: row.id ? (customerByCoupon.get(row.id) ?? null) : null,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));

  const seen = new Set<string>();
  const sales: CafeSale[] = draft.map((sale) => {
    const renewal = sale.customerId ? seen.has(sale.customerId) : false;
    if (sale.customerId) seen.add(sale.customerId);
    return { ...sale, renewal };
  });

  const orders: CafeOrder[] = ((ordersRes.data ?? []) as Bag[]).map((row) => ({
    id: row.id ?? "",
    status: row.status ?? "pending",
    createdAt: row.created_at ?? "",
    orderDate: row.order_date ?? null,
    stage: row.fulfillment_stage ?? null,
    drink: { ...named(row.drink), image: row.drink?.image_url ?? null },
    customer: row.customer?.name ?? null,
    branch: named(row.branch),
  }));

  const activeCustomerIds = new Set<string>();
  const expiring: ExpiringSub[] = [];
  for (const sub of subs) {
    const end = sub.end_date ?? "";
    const active = sub.status === "active" && end >= today;
    if (active && sub.customer_id) activeCustomerIds.add(sub.customer_id);
    if (active && end && end <= soonDay) {
      const days = Math.max(
        0,
        Math.round(
          (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
            86_400_000,
        ),
      );
      expiring.push({
        id: sub.id ?? "",
        name: sub.customer?.name ?? null,
        days,
        end,
      });
    }
  }
  expiring.sort((a, b) => a.days - b.days);

  const totalCustomers = customersRes.count ?? customersRes.data?.length ?? 0;
  const customerIds = new Set(
    ((customersRes.data ?? []) as Bag[]).map((row) => row.id as string),
  );
  const without = customerIds.size
    ? Array.from(customerIds).filter((id) => !activeCustomerIds.has(id)).length
    : Math.max(0, totalCustomers - activeCustomerIds.size);

  return {
    sales,
    orders,
    activeSubscribers: activeCustomerIds.size,
    totalCustomers,
    expiring: expiring.slice(0, 4),
    expiringCount: expiring.length,
    availableCoupons: availableRes.count ?? 0,
    customersWithoutSub: without,
    pendingOrders: pendingRes.count ?? 0,
  };
}

export type PeriodSummary = {
  revenue: number;
  salesCount: number;
  newSubscribers: number;
  renewals: number;
  cups: number;
  byBranch: Array<{ id: string; name: Named; revenue: number }>;
  topDrinks: Array<{ name: Named; count: number }>;
  latest: CafeSale[];
};

export function summarize(
  data: CafeCommerce,
  from: string,
  to: string,
): PeriodSummary {
  const sales = data.sales.filter((sale) => sale.day >= from && sale.day <= to);
  const firstDay = new Map<string, string>();
  for (const sale of data.sales) {
    if (!sale.customerId) continue;
    const prev = firstDay.get(sale.customerId);
    if (!prev || sale.day < prev) firstDay.set(sale.customerId, sale.day);
  }
  let newSubscribers = 0;
  for (const [id, day] of firstDay) {
    if (day >= from && day <= to) newSubscribers += 1;
    void id;
  }
  const branches = new Map<string, { name: Named; revenue: number }>();
  for (const sale of sales) {
    const key = sale.branchId ?? "none";
    const current = branches.get(key) ?? { name: sale.branch, revenue: 0 };
    current.revenue += sale.price;
    if (!current.name.ar && !current.name.en) current.name = sale.branch;
    branches.set(key, current);
  }
  const served = data.orders.filter(
    (order) =>
      order.status === "approved" &&
      order.orderDate &&
      order.orderDate >= from &&
      order.orderDate <= to,
  );
  const drinks = new Map<string, { name: Named; count: number }>();
  for (const order of served) {
    const key = order.drink.ar || order.drink.en;
    if (!key) continue;
    const current = drinks.get(key) ?? { name: order.drink, count: 0 };
    current.count += 1;
    drinks.set(key, current);
  }
  return {
    revenue: sales.reduce((sum, sale) => sum + sale.price, 0),
    salesCount: sales.length,
    newSubscribers,
    renewals: sales.filter((sale) => sale.renewal).length,
    cups: served.length,
    byBranch: Array.from(branches, ([id, value]) => ({ id, ...value })).sort(
      (a, b) => b.revenue - a.revenue,
    ),
    topDrinks: Array.from(drinks.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    latest: [...sales].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8),
  };
}

export function pickName(value: Named, isAr: boolean): string {
  const name = isAr ? value.ar || value.en : value.en || value.ar;
  return name?.trim() || "";
}
