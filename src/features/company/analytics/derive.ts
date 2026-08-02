import type {
  AnalyticsDataset,
  AnalyticsFilters,
  DateRange,
  Kpis,
  PresetKey,
} from "./types";

const iso = (date: Date) => date.toISOString().slice(0, 10);

export function presetRange(preset: PresetKey, current: DateRange): DateRange {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const shift = (days: number) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  };
  switch (preset) {
    case "today":
      return { from: iso(today), to: iso(today) };
    case "yesterday":
      return { from: iso(shift(-1)), to: iso(shift(-1)) };
    case "last7":
      return { from: iso(shift(-6)), to: iso(today) };
    case "last30":
      return { from: iso(shift(-29)), to: iso(today) };
    case "this_month":
      return { from: iso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))), to: iso(today) };
    case "last_month": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      return { from: iso(start), to: iso(end) };
    }
    default:
      return current;
  }
}

/** Applies every active filter across all datasets — filters combine with AND. */
export function applyFilters(data: AnalyticsDataset, filters: AnalyticsFilters): AnalyticsDataset {
  const code = filters.couponCode.trim().toLowerCase();

  const sales = data.sales.filter((row) => {
    if (filters.branchId && row.branchId !== filters.branchId) return false;
    if (filters.drinkId && row.drinkId !== filters.drinkId) return false;
    if (filters.planId && row.planId !== filters.planId) return false;
    if (filters.cashierId && row.cashierId !== filters.cashierId) return false;
    if (filters.customerId && row.customerId !== filters.customerId) return false;
    if (filters.paymentMethod && row.paymentMethod !== filters.paymentMethod) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (code && !(row.couponCode ?? "").toLowerCase().includes(code)) return false;
    return true;
  });

  const subscriptions = data.subscriptions.filter((row) => {
    if (filters.branchId && row.branchId !== filters.branchId) return false;
    if (filters.planId && row.planId !== filters.planId) return false;
    if (filters.customerId && row.customerId !== filters.customerId) return false;
    if (code && !(row.couponCode ?? "").toLowerCase().includes(code)) return false;
    return true;
  });

  const coupons = data.coupons.filter((row) => {
    if (filters.branchId && row.branchId !== filters.branchId) return false;
    if (filters.planId && row.planId !== filters.planId) return false;
    if (code && !row.code.toLowerCase().includes(code)) return false;
    return true;
  });

  const activeCustomerIds = new Set([
    ...sales.map((row) => row.customerId),
    ...subscriptions.map((row) => row.customerId),
  ]);
  const narrowed = filters.branchId || filters.planId || filters.customerId || code;
  const customers = narrowed
    ? data.customers.filter((row) => activeCustomerIds.has(row.id))
    : data.customers;

  return { ...data, sales, subscriptions, coupons, customers };
}

export function computeKpis(data: AnalyticsDataset, range: DateRange): Kpis {
  const revenue = data.coupons.filter((row) => row.status === "sold").reduce((sum, row) => sum + row.price, 0);
  const orders = data.sales.length;
  const newCustomers = data.customers.filter(
    (row) => row.createdAt.slice(0, 10) >= range.from && row.createdAt.slice(0, 10) <= range.to,
  ).length;

  return {
    revenue,
    orders,
    averageOrder: orders ? revenue / orders : 0,
    subscriptionsSold: data.subscriptions.length,
    renewals: data.subscriptions.filter((row) => row.isRenewal).length,
    expiredMemberships: data.subscriptions.filter(
      (row) => row.status === "expired" || row.endDate < new Date().toISOString().slice(0, 10),
    ).length,
    couponsRedeemed: data.coupons.filter((row) => row.status === "sold").length,
    activeMembers: data.activeMembers,
    newCustomers,
    returningCustomers: data.customers.filter((row) => row.subscriptions > 1).length,
  };
}

export type SeriesPoint = { label: string; value: number };

function dayKeys(range: DateRange): string[] {
  const out: string[] = [];
  const cursor = new Date(`${range.from}T00:00:00.000Z`);
  const end = new Date(`${range.to}T00:00:00.000Z`);
  while (cursor <= end && out.length < 190) {
    out.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

export function revenueTrend(data: AnalyticsDataset, range: DateRange): SeriesPoint[] {
  const map = new Map(dayKeys(range).map((day) => [day, 0]));
  for (const row of data.coupons) {
    if (row.status !== "sold") continue;
    const day = (row.soldAt ?? row.createdAt).slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + row.price);
  }
  return Array.from(map, ([label, value]) => ({ label, value }));
}

export function ordersTrend(data: AnalyticsDataset, range: DateRange): SeriesPoint[] {
  const map = new Map(dayKeys(range).map((day) => [day, 0]));
  for (const row of data.sales) {
    const day = row.createdAt.slice(0, 10);
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map, ([label, value]) => ({ label, value }));
}

function topBy<T>(rows: T[], key: (row: T) => string, weight: (row: T) => number, limit = 8): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = key(row) || "—";
    map.set(label, (map.get(label) ?? 0) + weight(row));
  }
  return Array.from(map, ([label, value]) => ({ label, value }))
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function subscriptionDistribution(data: AnalyticsDataset, isAr: boolean): SeriesPoint[] {
  return topBy(data.subscriptions, (row) => (isAr ? row.planName.ar : row.planName.en) ?? "—", () => 1, 6);
}

export function drinkPopularity(data: AnalyticsDataset, isAr: boolean): SeriesPoint[] {
  return topBy(data.sales, (row) => (isAr ? row.drinkName.ar : row.drinkName.en) ?? "—", () => 1);
}

export function branchComparison(data: AnalyticsDataset, isAr: boolean): SeriesPoint[] {
  return topBy(
    data.coupons.filter((row) => row.status === "sold"),
    (row) => (isAr ? row.branchName.ar : row.branchName.en) ?? "—",
    (row) => row.price,
  );
}

/** Placeholder heuristics — swap the body for a real AI call later. */
export function buildInsights(data: AnalyticsDataset, kpis: Kpis, isAr: boolean): string[] {
  const out: string[] = [];
  const drinks = drinkPopularity(data, isAr);
  const branches = branchComparison(data, isAr);
  const soon = data.subscriptions.filter((row) => {
    const days = (new Date(row.endDate).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 7;
  }).length;

  if (kpis.revenue > 0) {
    out.push(
      isAr
        ? `الإيرادات في الفترة المحددة ${Math.round(kpis.revenue)} ريال بمتوسط ${Math.round(kpis.averageOrder)} لكل طلب.`
        : `Revenue for this period is ${Math.round(kpis.revenue)} SAR with an average of ${Math.round(kpis.averageOrder)} per order.`,
    );
  }
  if (drinks[0]) {
    out.push(
      isAr
        ? `${drinks[0].label} هو المشروب الأكثر طلبًا (${drinks[0].value} طلب) — يُنصح بإبرازه في العرض.`
        : `${drinks[0].label} is the most ordered drink (${drinks[0].value} orders) — consider featuring it.`,
    );
  }
  if (drinks.length > 2) {
    const last = drinks[drinks.length - 1]!;
    out.push(
      isAr
        ? `${last.label} هو الأقل أداءً — يُنصح بعرض ترويجي عليه.`
        : `${last.label} is the weakest performer — recommend promoting it.`,
    );
  }
  if (branches[0]) {
    out.push(
      isAr
        ? `فرع ${branches[0].label} يقود الإيرادات في هذه الفترة.`
        : `${branches[0].label} leads revenue in this period.`,
    );
  }
  if (soon > 0) {
    out.push(
      isAr ? `${soon} عضوية تنتهي خلال هذا الأسبوع — تواصل معهم للتجديد.` : `${soon} memberships expire this week — reach out to renew.`,
    );
  }
  if (kpis.renewals > 0) {
    out.push(
      isAr
        ? `${kpis.renewals} عملية تجديد مقابل ${kpis.newCustomers} عميل جديد.`
        : `${kpis.renewals} renewals versus ${kpis.newCustomers} new customers.`,
    );
  }
  if (out.length === 0) {
    out.push(isAr ? "لا توجد بيانات كافية لإنشاء رؤى لهذه الفترة." : "Not enough data to generate insights for this period.");
  }
  return out.slice(0, 6);
}