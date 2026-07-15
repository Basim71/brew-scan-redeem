import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarDays,
  Coffee,
  Loader2,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type SoldCoupon = {
  id: string;
  price: number | string;
  sold_at: string | null;
  plan?: { name?: string | null } | null;
};

type OrderRow = {
  id: string;
  status: string;
  created_at: string;
  drink?: { name_en?: string | null; name_ar?: string | null } | null;
};

type DashboardStats = {
  customers: number;
  newCustomersWeek: number;
  newCustomersMonth: number;
  activeSubscriptions: number;
  salesToday: number;
  salesMonth: number;
  soldToday: number;
  pendingOrders: number;
};

const EMPTY_STATS: DashboardStats = {
  customers: 0,
  newCustomersWeek: 0,
  newCustomersMonth: 0,
  activeSubscriptions: 0,
  salesToday: 0,
  salesMonth: 0,
  soldToday: 0,
  pendingOrders: 0,
};

function AdminDashboard() {
  const { lang, fmtNum } = useI18n();
  const [stats, setStats] = useState(EMPTY_STATS);
  const [soldCoupons, setSoldCoupons] = useState<SoldCoupon[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const weekStart = new Date(now.getTime() - 6 * 86400000);
    weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const chartStart = new Date(now.getTime() - 29 * 86400000);
    chartStart.setHours(0, 0, 0, 0);

    const [
      customersResult,
      weekCustomersResult,
      monthCustomersResult,
      subscriptionsResult,
      pendingOrdersResult,
      soldCouponsResult,
      recentOrdersResult,
    ] = await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", weekStart.toISOString()),
      supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", monthStart.toISOString()),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase
        .from("coupons")
        .select("id,price,sold_at,plan:plans(name)")
        .eq("status", "sold")
        .gte("sold_at", chartStart.toISOString())
        .order("sold_at", { ascending: true }),
      supabase
        .from("orders")
        .select("id,status,created_at,drink:drink_types(name_en,name_ar)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const firstError = [
      customersResult.error,
      weekCustomersResult.error,
      monthCustomersResult.error,
      subscriptionsResult.error,
      pendingOrdersResult.error,
      soldCouponsResult.error,
      recentOrdersResult.error,
    ].find(Boolean);

    if (firstError) setError(firstError.message);

    const coupons = (soldCouponsResult.data ?? []) as unknown as SoldCoupon[];
    const salesTodayRows = coupons.filter((coupon) => coupon.sold_at && coupon.sold_at >= todayStart);
    const monthIso = monthStart.toISOString();
    const salesMonthRows = coupons.filter((coupon) => coupon.sold_at && coupon.sold_at >= monthIso);

    setStats({
      customers: customersResult.count ?? 0,
      newCustomersWeek: weekCustomersResult.count ?? 0,
      newCustomersMonth: monthCustomersResult.count ?? 0,
      activeSubscriptions: subscriptionsResult.count ?? 0,
      salesToday: sumPrices(salesTodayRows),
      salesMonth: sumPrices(salesMonthRows),
      soldToday: salesTodayRows.length,
      pendingOrders: pendingOrdersResult.count ?? 0,
    });

    setSoldCoupons(coupons);
    setRecentOrders((recentOrdersResult.data ?? []) as unknown as OrderRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
    const interval = window.setInterval(() => void loadDashboard(), 15000);
    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  const chartData = useMemo(() => buildDailySales(soldCoupons, lang), [soldCoupons, lang]);

  const cards = [
    { label: lang === "ar" ? "إجمالي العملاء" : "Total Customers", value: stats.customers, icon: Users, tone: "brown" },
    { label: lang === "ar" ? "عملاء جدد خلال أسبوع" : "New Customers · 7 Days", value: stats.newCustomersWeek, icon: UserPlus, tone: "blue" },
    { label: lang === "ar" ? "عملاء جدد هذا الشهر" : "New Customers · Month", value: stats.newCustomersMonth, icon: CalendarDays, tone: "violet" },
    { label: lang === "ar" ? "الاشتراكات النشطة" : "Active Subscriptions", value: stats.activeSubscriptions, icon: WalletCards, tone: "green" },
    { label: lang === "ar" ? "مبيعات اليوم" : "Today Revenue", value: money(stats.salesToday, lang), icon: BadgeDollarSign, tone: "gold" },
    { label: lang === "ar" ? "مبيعات الشهر" : "Monthly Revenue", value: money(stats.salesMonth, lang), icon: TrendingUp, tone: "orange" },
    { label: lang === "ar" ? "اشتراكات مباعة اليوم" : "Sold Today", value: stats.soldToday, icon: Coffee, tone: "rose" },
    { label: lang === "ar" ? "طلبات بانتظار الموافقة" : "Pending Orders", value: stats.pendingOrders, icon: RefreshCw, tone: "cyan" },
  ];

  return (
    <div className="kob-dashboard-modern">
      <div className="kob-dashboard-hero">
        <div>
          <span className="kob-dashboard-kicker">KOB Analytics</span>
          <h1>{lang === "ar" ? "نظرة شاملة على أداء المقهى" : "Your business at a glance"}</h1>
          <p>{lang === "ar" ? "العملاء والاشتراكات والمبيعات والطلبات في لوحة واحدة." : "Customers, subscriptions, revenue, and live activity in one place."}</p>
        </div>

        <button type="button" onClick={() => void loadDashboard()} className="btn-ghost-brass kob-dashboard-refresh" disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {lang === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>

      {error && <div className="kob-dashboard-error">{error}</div>}

      <div className="kob-dashboard-metrics">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article key={label} className={`kob-metric-card kob-metric-${tone}`}>
            <div className="kob-metric-icon"><Icon className="h-5 w-5" /></div>
            <div className="kob-metric-copy">
              <span>{label}</span>
              <strong>{typeof value === "number" ? fmtNum(value) : value}</strong>
            </div>
          </article>
        ))}
      </div>

      <div className="kob-dashboard-grid">
        <section className="kob-dashboard-chart-card panel-warm">
          <div className="kob-card-header">
            <div>
              <h2 className="kob-card-title">{lang === "ar" ? "المبيعات خلال 30 يوم" : "Revenue · Last 30 Days"}</h2>
              <p className="kob-page-description">{lang === "ar" ? "إجمالي قيمة الكوبونات المباعة يوميًا." : "Daily value of sold subscriptions."}</p>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-caramel" />}
          </div>

          <div className="kob-sales-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c98745" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#c98745" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="rgba(111,78,57,.12)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#806f65", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#806f65", fontSize: 11 }} />
                <Tooltip formatter={(value) => money(Number(value), lang)} contentStyle={{ borderRadius: 16, border: "1px solid rgba(111,78,57,.14)", background: "#fffdf9" }} />
                <Area type="monotone" dataKey="revenue" stroke="#b87336" strokeWidth={3} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="kob-dashboard-activity panel-warm">
          <div className="kob-card-header">
            <h2 className="kob-card-title">{lang === "ar" ? "آخر الطلبات" : "Latest Orders"}</h2>
          </div>

          <div className="kob-activity-list">
            {recentOrders.map((order) => (
              <article key={order.id} className="kob-activity-item">
                <span className="kob-activity-icon"><Coffee className="h-4 w-4" /></span>
                <div>
                  <strong>{lang === "ar" ? order.drink?.name_ar : order.drink?.name_en || "—"}</strong>
                  <small>{new Date(order.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US")}</small>
                </div>
                <span className={`kob-order-state kob-order-${order.status}`}>{order.status}</span>
              </article>
            ))}

            {!loading && recentOrders.length === 0 && <div className="kob-dashboard-empty">{lang === "ar" ? "لا توجد طلبات بعد." : "No orders yet."}</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function sumPrices(rows: SoldCoupon[]) {
  return rows.reduce((total, row) => total + Number(row.price || 0), 0);
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function money(value: number, lang: string) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildDailySales(rows: SoldCoupon[], lang: string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.sold_at) continue;
    const key = row.sold_at.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + Number(row.price || 0));
  }

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: date.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", { day: "numeric", month: "short" }),
      revenue: map.get(key) ?? 0,
    };
  });
}
