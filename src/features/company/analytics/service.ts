import { supabase } from "@/integrations/supabase/client";

import type {
  AnalyticsDataset,
  CouponRecord,
  CustomerRecord,
  DateRange,
  Named,
  SaleRecord,
  SubscriptionRecord,
} from "./types";

const db = () => supabase as any;

function startOf(date: string) {
  return `${date}T00:00:00.000Z`;
}
function endOf(date: string) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function named(row: any): { ar: string | null; en: string | null } {
  return { ar: row?.name_ar ?? row?.name ?? null, en: row?.name_en ?? row?.name ?? null };
}

/** Loads every dataset the Business Analytics page needs for one date range. */
export async function loadAnalytics(range: DateRange): Promise<AnalyticsDataset> {
  const from = startOf(range.from);
  const to = endOf(range.to);

  const [ordersRes, couponsRes, subsRes, customersRes, branchesRes, drinksRes, plansRes, staffRes, settingsRes] =
    await Promise.all([
      db()
        .from("orders")
        .select(
          "id,status,created_at,order_date,customer_note,cashier_id,branch_id,drink_type_id,subscription_id," +
            "customer:customers(id,name,phone),branch:branches(id,name_ar,name_en),drink:drink_types(id,name_ar,name_en)," +
            "subscription:subscriptions(id,plan_id,plan:plans(id,name_ar,name_en),coupon:coupons(code,price))",
        )
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: false })
        .limit(4000),
      db()
        .from("coupons")
        .select("id,code,status,price,sold_at,created_at,plan_id,branch_id,branch:branches(id,name_ar,name_en),plan:plans(id,name_ar,name_en)")
        .limit(4000),
      db()
        .from("subscriptions")
        .select(
          "id,status,start_date,end_date,created_at,customer_id,plan_id,branch_id," +
            "customer:customers(id,name,phone),branch:branches(id,name_ar,name_en),plan:plans(id,name_ar,name_en),coupon:coupons(code,price)",
        )
        .order("created_at", { ascending: false })
        .limit(4000),
      db().from("customers").select("id,name,phone,created_at").limit(4000),
      db().from("branches").select("id,name_ar,name_en").order("name_en"),
      db().from("drink_types").select("id,name_ar,name_en").order("name_en"),
      db().from("plans").select("id,name_ar,name_en").order("display_order"),
      db().from("profiles").select("id,full_name,email").limit(500),
      db().from("organization_settings").select("payment_methods,default_payment_method").maybeSingle(),
    ]);

  const firstError =
    ordersRes.error || couponsRes.error || subsRes.error || customersRes.error || branchesRes.error || drinksRes.error || plansRes.error;
  if (firstError) throw firstError;

  const defaultPayment: string = settingsRes?.data?.default_payment_method ?? "cash";
  const paymentMethods: string[] = settingsRes?.data?.payment_methods ?? [defaultPayment];

  const staff = new Map<string, string>();
  for (const row of staffRes?.data ?? []) staff.set(row.id, row.full_name || row.email || row.id.slice(0, 8));

  const allSubs: any[] = subsRes.data ?? [];
  const subsPerCustomer = new Map<string, number>();
  for (const sub of allSubs) {
    if (!sub.customer_id) continue;
    subsPerCustomer.set(sub.customer_id, (subsPerCustomer.get(sub.customer_id) ?? 0) + 1);
  }

  const sales: SaleRecord[] = (ordersRes.data ?? []).map((row: any, index: number) => ({
    id: row.id,
    receipt: receiptNumber(row.created_at, index, row.id),
    createdAt: row.created_at,
    status: row.status,
    amount: Number(row.subscription?.coupon?.price ?? 0),
    branchId: row.branch_id ?? null,
    branchName: named(row.branch),
    drinkId: row.drink_type_id ?? null,
    drinkName: named(row.drink),
    planId: row.subscription?.plan_id ?? null,
    planName: named(row.subscription?.plan),
    customerId: row.customer?.id ?? null,
    customerName: row.customer?.name ?? null,
    customerPhone: row.customer?.phone ?? null,
    cashierId: row.cashier_id ?? null,
    cashierName: row.cashier_id ? staff.get(row.cashier_id) ?? null : null,
    couponCode: row.subscription?.coupon?.code ?? null,
    paymentMethod: defaultPayment,
    note: row.customer_note ?? null,
  }));

  const subscriptions: SubscriptionRecord[] = allSubs
    .filter((row) => row.created_at >= from && row.created_at < to)
    .map((row: any) => ({
      id: row.id,
      createdAt: row.created_at,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      price: Number(row.coupon?.price ?? 0),
      branchId: row.branch_id ?? null,
      branchName: named(row.branch),
      planId: row.plan_id ?? null,
      planName: named(row.plan),
      customerId: row.customer_id ?? null,
      customerName: row.customer?.name ?? null,
      customerPhone: row.customer?.phone ?? null,
      couponCode: row.coupon?.code ?? null,
      isRenewal: (subsPerCustomer.get(row.customer_id) ?? 0) > 1,
    }));

  const allCoupons: any[] = couponsRes.data ?? [];
  const coupons: CouponRecord[] = allCoupons
    .filter((row) => {
      const stamp = row.sold_at ?? row.created_at;
      return stamp >= from && stamp < to;
    })
    .map((row: any) => ({
      id: row.id,
      code: row.code,
      status: row.status,
      price: Number(row.price ?? 0),
      soldAt: row.sold_at ?? null,
      createdAt: row.created_at,
      branchId: row.branch_id ?? null,
      branchName: named(row.branch),
      planId: row.plan_id ?? null,
      planName: named(row.plan),
    }));

  const ordersPerCustomer = new Map<string, { orders: number; spend: number; last: string | null }>();
  for (const sale of sales) {
    if (!sale.customerId) continue;
    const current = ordersPerCustomer.get(sale.customerId) ?? { orders: 0, spend: 0, last: null };
    current.orders += 1;
    current.spend += sale.amount;
    if (!current.last || sale.createdAt > current.last) current.last = sale.createdAt;
    ordersPerCustomer.set(sale.customerId, current);
  }

  const spendPerCustomer = new Map<string, number>();
  for (const sub of allSubs) {
    if (!sub.customer_id) continue;
    spendPerCustomer.set(sub.customer_id, (spendPerCustomer.get(sub.customer_id) ?? 0) + Number(sub.coupon?.price ?? 0));
  }

  const customers: CustomerRecord[] = (customersRes.data ?? []).map((row: any) => {
    const activity = ordersPerCustomer.get(row.id);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      createdAt: row.created_at,
      subscriptions: subsPerCustomer.get(row.id) ?? 0,
      orders: activity?.orders ?? 0,
      spend: spendPerCustomer.get(row.id) ?? 0,
      lastActivity: activity?.last ?? null,
    };
  });

  const activeMembers = allSubs.filter(
    (row) => row.status === "active" && row.end_date >= new Date().toISOString().slice(0, 10),
  ).length;

  const dataset: AnalyticsDataset & { activeMembers: number } = {
    sales,
    subscriptions,
    coupons,
    customers,
    branches: (branchesRes.data ?? []) as Named[],
    drinks: (drinksRes.data ?? []) as Named[],
    plans: (plansRes.data ?? []) as Named[],
    cashiers: Array.from(staff, ([id, name]) => ({ id, name })),
    customerOptions: (customersRes.data ?? []).map((row: any) => ({ id: row.id, name: `${row.name} · ${row.phone}` })),
    paymentMethods,
    activeMembers,
  };
  return dataset;
}

function receiptNumber(createdAt: string, index: number, id: string) {
  const day = (createdAt ?? "").slice(0, 10).replaceAll("-", "");
  return `R-${day || "000000"}-${String(index + 1).padStart(4, "0")}-${id.slice(0, 4).toUpperCase()}`;
}