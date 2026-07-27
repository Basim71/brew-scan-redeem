import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeDollarSign,
  Coffee,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
// Chart bundle (Recharts) is lazy-loaded — see /components/charts/DashboardCharts.
const DashboardCharts = lazy(() =>
  import("@/components/charts/DashboardCharts").then((mod) => ({
    default: {
      Revenue: mod.RevenueAreaChart,
      Subscription: mod.SubscriptionAreaChart,
    } as unknown as React.ComponentType,
  })),
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RevenueAreaChart = lazy(async () => ({ default: (await import("@/components/charts/DashboardCharts")).RevenueAreaChart }));
const SubscriptionAreaChart = lazy(async () => ({ default: (await import("@/components/charts/DashboardCharts")).SubscriptionAreaChart }));
void DashboardCharts;

function ChartFallback() {
  return <div className="company-chart-skeleton" aria-hidden />;
}

import { useI18n } from "@/lib/i18n";
import {
  buildBranchPerformance,
  buildDailyRevenue,
  buildSubscriptionTrend,
  loadCompanyDashboard,
  type DashboardPayload,
} from "@/features/company/dashboard/service";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { payload, error: e } = await loadCompanyDashboard();
      setData(payload);
      setError(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const revenueSeries = useMemo(() => (data ? buildDailyRevenue(data.soldCoupons, lang) : []), [data, lang]);
  const subSeries = useMemo(() => (data ? buildSubscriptionTrend(data.soldCoupons, lang) : []), [data, lang]);
  const branchPerf = useMemo(() => {
    if (!data) return [];
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    return buildBranchPerformance(data.branches, data.soldCoupons, data.ordersMonth, monthStart.toISOString());
  }, [data]);

  const fmtCurrency = (n: number) => `${fmtNum(Math.round(n))} ${isRTL ? "ر.س" : "SAR"}`;

  const kpis = data ? [
    { label: isRTL ? "العملاء" : "Customers", value: fmtNum(data.stats.customers), sub: `+${fmtNum(data.stats.newCustomersMonth)} ${isRTL ? "هذا الشهر" : "this month"}`, icon: Users, tone: "espresso" },
    { label: isRTL ? "اشتراكات نشطة" : "Active Subs", value: fmtNum(data.stats.activeSubscriptions), sub: `${fmtNum(data.stats.expiringSubscriptions)} ${isRTL ? "تنتهي قريباً" : "expiring soon"}`, icon: WalletCards, tone: "gold" },
    { label: isRTL ? "إيراد اليوم" : "Revenue Today", value: fmtCurrency(data.stats.revenueToday), sub: `${fmtCurrency(data.stats.revenueMonth)} ${isRTL ? "هذا الشهر" : "MTD"}`, icon: BadgeDollarSign, tone: "cream" },
    { label: isRTL ? "طلبات اليوم" : "Orders Today", value: fmtNum(data.stats.ordersToday), sub: `${fmtNum(data.stats.pendingOrders)} ${isRTL ? "قيد الانتظار" : "pending"}`, icon: ShoppingBag, tone: "espresso" },
  ] : [];

  return (
    <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{isRTL ? "بوابة الشركة" : "Company Portal"}</span>
          <h1>{isRTL ? "نظرة عامة" : "Overview"}</h1>
          <p>{isRTL ? "مؤشرات الأداء الحيّة لأعمال المقهى." : "Live performance across your coffee business."}</p>
        </div>
        <div className="company-header-actions">
          <Link to={"/admin/sell-coupon" as any} className="company-btn-primary">
            <UserPlus className="h-4 w-4" />{isRTL ? "بيع كوبون" : "Sell Coupon"}
          </Link>
          <button className="company-btn-ghost" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {isRTL ? "تحديث" : "Refresh"}
          </button>
        </div>
      </header>

      {error && <div className="company-alert error">{error}</div>}

      <section className="company-kpi-grid">
        {(loading && !data ? (Array.from({ length: 4 }) as typeof kpis) : kpis).map((kpi, i) => {
          if (!kpi) return <div key={i} className="company-kpi-card skeleton" />;
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className="company-kpi-card" data-tone={kpi.tone}>
              <div className="company-kpi-icon"><Icon className="h-5 w-5" /></div>
              <div className="company-kpi-body">
                <span className="company-kpi-label">{kpi.label}</span>
                <strong className="company-kpi-value">{kpi.value}</strong>
                <span className="company-kpi-sub">{kpi.sub}</span>
              </div>
            </article>
          );
        })}
      </section>

      <section className="company-card-grid two">
        <article className="company-card chart">
          <header>
            <div>
              <span className="company-kicker">{isRTL ? "الإيرادات" : "Revenue"}</span>
              <h3>{isRTL ? "آخر 30 يوماً" : "Last 30 days"}</h3>
            </div>
            <TrendingUp className="h-4 w-4" />
          </header>
          <div className="company-chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8963c" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#c8963c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(60,40,25,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} width={40} />
                <Tooltip contentStyle={{ background: "#fff8ee", border: "1px solid #e6d7ba", borderRadius: 10, color: "#3a2617" }} />
                <Area type="monotone" dataKey="revenue" stroke="#8a5a24" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="company-card chart">
          <header>
            <div>
              <span className="company-kicker">{isRTL ? "الاشتراكات" : "Subscriptions"}</span>
              <h3>{isRTL ? "الاتجاه الشهري" : "Monthly trend"}</h3>
            </div>
            <WalletCards className="h-4 w-4" />
          </header>
          <div className="company-chart">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={subSeries}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a2617" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3a2617" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(60,40,25,0.08)" vertical={false} />
                <XAxis dataKey="label" stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b503a" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ background: "#fff8ee", border: "1px solid #e6d7ba", borderRadius: 10, color: "#3a2617" }} />
                <Area type="monotone" dataKey="subscriptions" stroke="#3a2617" strokeWidth={2} fill="url(#subGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="company-card-grid two">
        <article className="company-card">
          <header>
            <div>
              <span className="company-kicker">{isRTL ? "أحدث الطلبات" : "Latest Orders"}</span>
              <h3>{isRTL ? "آخر النشاطات" : "Recent activity"}</h3>
            </div>
            <Link to={"/admin/orders" as any} className="company-link">
              {isRTL ? "عرض الكل" : "View all"} <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </header>
          <ul className="company-activity">
            {(data?.latestOrders ?? []).slice(0, 6).map((o) => (
              <li key={o.id}>
                <div className="company-activity-icon"><Coffee className="h-4 w-4" /></div>
                <div>
                  <strong>{o.customer?.name || "—"}</strong>
                  <small>{isRTL ? o.drink?.name_ar : o.drink?.name_en} · {isRTL ? o.branch?.name_ar : o.branch?.name_en}</small>
                </div>
                <span className={`company-status ${o.status}`}>{o.status}</span>
              </li>
            ))}
            {!loading && (data?.latestOrders.length ?? 0) === 0 && (
              <li className="company-empty-inline">{isRTL ? "لا توجد طلبات بعد." : "No orders yet."}</li>
            )}
          </ul>
        </article>

        <article className="company-card">
          <header>
            <div>
              <span className="company-kicker">{isRTL ? "أداء الفروع" : "Branch Performance"}</span>
              <h3>{isRTL ? "هذا الشهر" : "Month to date"}</h3>
            </div>
          </header>
          <ul className="company-branch-list">
            {branchPerf.slice(0, 6).map((b) => (
              <li key={b.branchId}>
                <div>
                  <strong>{isRTL ? b.nameAr : b.nameEn}</strong>
                  <small>{fmtNum(b.ordersMonth)} {isRTL ? "طلب" : "orders"}</small>
                </div>
                <span className="company-branch-revenue">{fmtCurrency(b.revenueMonth)}</span>
              </li>
            ))}
            {!loading && branchPerf.length === 0 && (
              <li className="company-empty-inline">{isRTL ? "لا توجد فروع نشطة." : "No active branches."}</li>
            )}
          </ul>
        </article>
      </section>
    </div>
  );
}
