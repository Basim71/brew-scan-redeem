import type { HubBundle, HubCoupon, HubCustomer, HubOrder, HubSubscription } from "./service";

export type CustomerStatus = "active" | "expiring" | "expired" | "no_membership";

export type CustomerAggregate = {
  customer: HubCustomer;
  subscriptions: HubSubscription[];
  activeSubscription: HubSubscription | null;
  orders: HubOrder[];
  approvedOrders: HubOrder[];
  coupons: HubCoupon[];
  status: CustomerStatus;
  totalSpend: number;
  totalOrders: number;
  approvedCount: number;
  lastVisit: string | null;
  daysSinceLastVisit: number | null;
  daysToExpire: number | null;
  favoriteDrink: { id: string; name_en: string; name_ar: string; count: number; pct: number } | null;
  primaryBranch: { id: string; name_en: string; name_ar: string } | null;
  loyalty: { score: number; tier: "excellent" | "good" | "attention" };
  visitsByHour: number[]; // 24
  addonCounts: { extraShot: number; milk: number; syrup: number; sugar: number };
  renewals: number;
};

const DAY_MS = 86_400_000;

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / DAY_MS);
}

export function aggregateCustomers(bundle: HubBundle): CustomerAggregate[] {
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);

  const subsByCustomer = new Map<string, HubSubscription[]>();
  for (const s of bundle.subscriptions) {
    const arr = subsByCustomer.get(s.customer_id) ?? [];
    arr.push(s);
    subsByCustomer.set(s.customer_id, arr);
  }

  const ordersByCustomer = new Map<string, HubOrder[]>();
  for (const o of bundle.orders) {
    const arr = ordersByCustomer.get(o.customer_id) ?? [];
    arr.push(o);
    ordersByCustomer.set(o.customer_id, arr);
  }

  const couponsBySubscription = new Map<string, HubCoupon>();
  // Coupons don't link directly to customer; via subscription.coupon_id if present.
  // Here we only expose coupons via price aggregation and plan matching.

  const aggregates: CustomerAggregate[] = bundle.customers.map((c) => {
    const subs = (subsByCustomer.get(c.id) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const orders = (ordersByCustomer.get(c.id) ?? []).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const approved = orders.filter((o) => o.status === "approved");

    const activeSub =
      subs.find((s) => s.status === "active" && s.start_date <= todayIso && s.end_date >= todayIso) ?? null;

    // Spend = sum of plan.price for all subscriptions this customer bought
    const totalSpend = subs.reduce((sum, s) => sum + Number(s.plan?.price ?? 0), 0);
    const totalOrders = orders.length;
    const approvedCount = approved.length;

    const lastVisitIso = approved[0]?.approved_at ?? approved[0]?.created_at ?? null;
    const lastVisit = lastVisitIso ?? null;
    const daysSinceLastVisit = lastVisit ? daysBetween(now, new Date(lastVisit)) : null;

    let daysToExpire: number | null = null;
    if (activeSub) {
      const [year, month, day] = activeSub.end_date.split("-").map(Number);
      const endUtc = Date.UTC(year, month - 1, day);
      const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      daysToExpire = Math.round((endUtc - todayUtc) / DAY_MS);
    }

    // Favorite drink
    const drinkCount = new Map<string, { id: string; name_en: string; name_ar: string; count: number }>();
    for (const o of approved) {
      if (!o.drink) continue;
      const cur = drinkCount.get(o.drink.id) ?? { ...o.drink, count: 0 };
      cur.count += 1;
      drinkCount.set(o.drink.id, cur);
    }
    const drinkList = Array.from(drinkCount.values()).sort((a, b) => b.count - a.count);
    const favoriteDrink = drinkList[0]
      ? {
          ...drinkList[0],
          pct: approvedCount ? Math.round((drinkList[0].count / approvedCount) * 100) : 0,
        }
      : null;

    // Primary branch = most-orders branch, else first sub branch
    const branchCount = new Map<string, { id: string; name_en: string; name_ar: string; count: number }>();
    for (const o of approved) {
      if (!o.branch) continue;
      const cur = branchCount.get(o.branch.id) ?? { ...o.branch, count: 0 };
      cur.count += 1;
      branchCount.set(o.branch.id, cur);
    }
    const primaryBranch =
      Array.from(branchCount.values()).sort((a, b) => b.count - a.count)[0] ?? activeSub?.branch ?? null;

    // Visits by hour
    const visitsByHour = new Array(24).fill(0);
    for (const o of approved) {
      const d = new Date(o.approved_at ?? o.created_at);
      visitsByHour[d.getHours()] += 1;
    }

    // Add-ons
    const addonCounts = { extraShot: 0, milk: 0, syrup: 0, sugar: 0 };
    for (const o of approved) {
      const opts = o.selected_options as Array<{ group?: string; name_en?: string; name_ar?: string }> | null;
      if (!Array.isArray(opts)) continue;
      for (const opt of opts) {
        const s = `${opt.group ?? ""} ${opt.name_en ?? ""} ${opt.name_ar ?? ""}`.toLowerCase();
        if (/shot|إضافي|جرعة/.test(s)) addonCounts.extraShot += 1;
        else if (/milk|حليب/.test(s)) addonCounts.milk += 1;
        else if (/syrup|نكهة|شراب/.test(s)) addonCounts.syrup += 1;
        else if (/sugar|سكر/.test(s)) addonCounts.sugar += 1;
      }
    }

    // Renewals = subs beyond the first
    const renewals = Math.max(0, subs.length - 1);

    // Status
    let status: CustomerStatus;
    if (activeSub) {
      status = daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= 7 ? "expiring" : "active";
    } else if (subs.some((s) => s.status === "expired" || s.end_date < todayIso)) {
      status = "expired";
    } else {
      status = "no_membership";
    }

    // Loyalty score 0-100
    const spendComp = Math.min(40, totalSpend / 25); // 1000 -> 40
    const ordersComp = Math.min(30, approvedCount * 1.5); // 20 orders -> 30
    const renewalComp = Math.min(15, renewals * 5);
    const recencyComp =
      daysSinceLastVisit === null ? 0 : daysSinceLastVisit <= 7 ? 15 : daysSinceLastVisit <= 30 ? 8 : 2;
    const score = Math.round(spendComp + ordersComp + renewalComp + recencyComp);
    const tier: CustomerAggregate["loyalty"]["tier"] = score >= 70 ? "excellent" : score >= 40 ? "good" : "attention";

    return {
      customer: c,
      subscriptions: subs,
      activeSubscription: activeSub,
      orders,
      approvedOrders: approved,
      coupons: [],
      status,
      totalSpend,
      totalOrders,
      approvedCount,
      lastVisit,
      daysSinceLastVisit,
      daysToExpire,
      favoriteDrink,
      primaryBranch,
      loyalty: { score, tier },
      visitsByHour,
      addonCounts,
      renewals,
    };
  });

  // Attach coupons by matching plan_id of any subscription + shared organization scope (already RLS-filtered).
  // Best-effort — coupons in bundle are org-scoped; expose only ones tied to plans the customer has purchased.
  const couponsByPlan = new Map<string, HubCoupon[]>();
  for (const c of bundle.coupons) {
    const arr = couponsByPlan.get(c.plan_id) ?? [];
    arr.push(c);
    couponsByPlan.set(c.plan_id, arr);
  }
  // Not customer-linked in schema; leave a.coupons empty and surface global coupon stats via bundle if needed.
  void couponsBySubscription;
  void couponsByPlan;

  return aggregates;
}
