import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  Sparkles,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  WifiOff,
  Zap,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import {
  buildDrinkPopularity,
  loadCompanyDashboard,
  type DashboardPayload,
  type DrinkPopularity,
} from "@/features/company/dashboard/service";

const POLL_MS = 5000;

/* Animated counter --------------------------------------------------- */
function useAnimatedNumber(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  useEffect(() => {
    if (value === display) return;
    fromRef.current = display;
    startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return display;
}

function AnimatedNumber({ value, fmt }: { value: number; fmt: (n: number) => string }) {
  const d = useAnimatedNumber(value);
  return <>{fmt(Math.round(d))}</>;
}

/* Helpers ------------------------------------------------------------ */
function greeting(hour: number, isRTL: boolean) {
  if (hour < 12) return isRTL ? "صباح الخير" : "Good Morning";
  if (hour < 18) return isRTL ? "مساء الخير" : "Good Afternoon";
  return isRTL ? "مساء الخير" : "Good Evening";
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

function relativeTime(iso: string, now: Date, isRTL: boolean): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return isRTL ? "قبل لحظات" : "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return isRTL ? `قبل ${min} دقيقة` : `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return isRTL ? `قبل ${hr} ساعة` : `${hr} h ago`;
  const day = Math.floor(hr / 24);
  return isRTL ? `قبل ${day} يوم` : `${day} d ago`;
}

function pctDelta(current: number, prev: number): number {
  if (prev <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

/* Focus, opportunities, alerts, activity ----------------------------- */
type Card = {
  id: string;
  title: string;
  desc: string;
  priority: "high" | "medium" | "low";
  to: string;
  icon: typeof AlertCircle;
};

function buildFocus(data: DashboardPayload, top: DrinkPopularity | null, isRTL: boolean): Card[] {
  const s = data.stats;
  const out: Card[] = [];
  if (s.expiringSubscriptions > 0) out.push({
    id: "expiring", priority: "high", icon: AlertCircle,
    title: isRTL ? `${s.expiringSubscriptions} اشتراك ينتهي قريباً` : `${s.expiringSubscriptions} memberships expiring soon`,
    desc: isRTL ? "تواصل مع العملاء قبل انتهاء اشتراكاتهم." : "Reach out before their plans end.",
    to: "/admin/customers",
  });
  if (s.approvedOrdersToday > 0) out.push({
    id: "redemptions", priority: "medium", icon: Coffee,
    title: isRTL ? `${s.approvedOrdersToday} استلام اليوم` : `${s.approvedOrdersToday} redemptions today`,
    desc: isRTL ? "تدفّق سلس في الفروع." : "Steady flow across branches.",
    to: "/admin/orders",
  });
  if (s.newCustomersToday > 0) out.push({
    id: "inactive-followup", priority: "low", icon: UserPlus,
    title: isRTL ? `${s.newCustomersToday} عميل جديد اليوم` : `${s.newCustomersToday} new customers today`,
    desc: isRTL ? "رحّب بهم لتعزيز الولاء." : "Welcome them to build loyalty.",
    to: "/admin/customers",
  });
  if (top && top.ordersWeek > 0) out.push({
    id: "top-drink", priority: "low", icon: Flame,
    title: isRTL ? `${top.nameAr ?? top.nameEn} الأكثر طلباً` : `${top.nameEn ?? top.nameAr} is trending`,
    desc: isRTL ? "ركّز عليه في العروض." : "Feature it in a promo.",
    to: "/admin/drinks",
  });
  return out.slice(0, 4);
}

function buildOpportunities(data: DashboardPayload, isRTL: boolean): Card[] {
  const s = data.stats;
  const out: Card[] = [];
  if (s.expiringSubscriptions > 0) out.push({
    id: "renew", priority: "high", icon: WalletCards,
    title: isRTL ? `${s.expiringSubscriptions} فرصة تجديد` : `${s.expiringSubscriptions} renewal opportunities`,
    desc: isRTL ? "اعرض تجديدات مبكرة لهؤلاء العملاء." : "Offer early renewals to these customers.",
    to: "/admin/customers",
  });
  if (s.activeSubscriptions > 0) out.push({
    id: "upsell-annual", priority: "medium", icon: TrendingUp,
    title: isRTL ? "ترقية إلى الخطة السنوية" : "Upsell annual plans",
    desc: isRTL ? "ادعُ الأعضاء النشطين للترقية." : "Invite active members to upgrade.",
    to: "/admin/plans",
  });
  if (s.availableCoupons > 0) out.push({
    id: "unused-coupons", priority: "medium", icon: Ticket,
    title: isRTL ? `${s.availableCoupons} كوبون غير مباع` : `${s.availableCoupons} unused coupons`,
    desc: isRTL ? "حوّل المخزون إلى إيراد." : "Convert inventory into revenue.",
    to: "/admin/coupons",
  });
  out.push({
    id: "inactive", priority: "low", icon: Users,
    title: isRTL ? "أعضاء غير نشطين" : "Inactive members",
    desc: isRTL ? "استعرض قائمة الفلترة داخل مركز العملاء." : "Use the filter inside Customer Hub.",
    to: "/admin/customers",
  });
  return out.slice(0, 4);
}

function buildAlerts(data: DashboardPayload, isRTL: boolean): Card[] {
  const s = data.stats;
  const out: Card[] = [];
  if (s.pendingOrders > 0) out.push({
    id: "pending", priority: "high", icon: Clock,
    title: isRTL ? `${s.pendingOrders} طلب بانتظار الموافقة` : `${s.pendingOrders} orders awaiting approval`,
    desc: isRTL ? "افتح الاستحقاقات اليومية لمراجعتها." : "Review pending redemptions now.",
    to: "/admin/orders",
  });
  const delta = pctDelta(s.revenueToday, s.revenueYesterday);
  if (s.revenueYesterday > 0 && delta <= -20) out.push({
    id: "rev-drop", priority: "high", icon: TrendingDown,
    title: isRTL ? `إيراد اليوم منخفض ${Math.abs(delta)}%` : `Revenue is down ${Math.abs(delta)}% today`,
    desc: isRTL ? "قارن الأداء في التقارير." : "Compare performance in Reports.",
    to: "/admin/reports",
  });
  if (s.availableCoupons === 0) out.push({
    id: "no-coupons", priority: "medium", icon: Ticket,
    title: isRTL ? "لا يوجد كوبونات متاحة" : "No coupons available",
    desc: isRTL ? "أنشئ دفعة جديدة قبل البيع." : "Generate a new batch before selling.",
    to: "/admin/coupons",
  });
  return out;
}

type ActivityItem = { id: string; title: string; subtitle: string; time: string; kind: "order" | "customer" };

function buildActivity(data: DashboardPayload, isRTL: boolean): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const o of data.latestOrders.slice(0, 10)) {
    const drink = isRTL ? o.drink?.name_ar : o.drink?.name_en;
    const branch = isRTL ? o.branch?.name_ar : o.branch?.name_en;
    const verb = o.status === "approved"
      ? isRTL ? "استلم" : "redeemed"
      : o.status === "rejected"
        ? isRTL ? "رُفض طلب" : "rejected"
        : isRTL ? "طلب" : "requested";
    items.push({
      id: `o-${o.id}`,
      kind: "order",
      title: `${o.customer?.name ?? (isRTL ? "عميل" : "Customer")} ${verb} ${drink ?? ""}`.trim(),
      subtitle: branch ?? "",
      time: o.created_at,
    });
  }
  for (const c of data.recentCustomers.slice(0, 4)) {
    items.push({
      id: `c-${c.id}`,
      kind: "customer",
      title: `${isRTL ? "عميل جديد" : "New customer"}: ${c.name}`,
      subtitle: "",
      time: c.created_at,
    });
  }
  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8);
}

/* Component ---------------------------------------------------------- */
export default function CommandCenter() {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const { organization } = useOrganization();
  const now = useNow(30_000);

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [connError, setConnError] = useState(false);
  const firstLoadRef = useRef(true);

  async function tick() {
    try {
      const { payload, error: e } = await loadCompanyDashboard();
      setData(payload);
      setError(e);
      setLastUpdated(new Date());
      setConnError(false);
    } catch {
      setConnError(true);
    } finally {
      firstLoadRef.current = false;
    }
  }

  useEffect(() => {
    void tick();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void tick();
    }, POLL_MS);
    const onOnline = () => { setOnline(true); void tick(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const drinkPop = useMemo(() => (data ? buildDrinkPopularity(data) : []), [data]);
  const focus = useMemo(() => (data ? buildFocus(data, drinkPop[0] ?? null, isRTL) : []), [data, drinkPop, isRTL]);
  const opportunities = useMemo(() => (data ? buildOpportunities(data, isRTL) : []), [data, isRTL]);
  const alerts = useMemo(() => (data ? buildAlerts(data, isRTL) : []), [data, isRTL]);
  const activity = useMemo(() => (data ? buildActivity(data, isRTL) : []), [data, isRTL]);

  const fmtCurrency = (n: number) => `${fmtNum(Math.round(n))} ${isRTL ? "ر.س" : "SAR"}`;
  const dateLabel = now.toLocaleDateString(isRTL ? "ar-SA" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = now.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const orgName = organization?.nameAr && isRTL ? organization.nameAr : organization?.nameEn ?? organization?.nameAr ?? "";

  const top = drinkPop[0] ?? null;
  const showFirstSkeleton = firstLoadRef.current && !data;

  const kpis = data ? [
    {
      key: "redemptions",
      label: isRTL ? "استحقاقات اليوم" : "Today's Redemptions",
      value: data.stats.approvedOrdersToday,
      fmt: fmtNum,
      icon: Coffee,
      to: "/admin/orders",
      hint: isRTL ? "افتح الاستحقاقات اليومية" : "Go to Daily Redemptions",
    },
    {
      key: "members",
      label: isRTL ? "أعضاء نشطون" : "Active Members",
      value: data.stats.activeSubscriptions,
      fmt: fmtNum,
      icon: Users,
      to: "/admin/customers",
      hint: isRTL ? "افتح مركز العملاء" : "Open Customer Hub",
    },
    {
      key: "expiring",
      label: isRTL ? "اشتراكات تنتهي" : "Expiring Memberships",
      value: data.stats.expiringSubscriptions,
      fmt: fmtNum,
      icon: WalletCards,
      to: "/admin/customers",
      hint: isRTL ? "قائمة التجديدات" : "Renewals filter",
    },
    {
      key: "revenue",
      label: isRTL ? "إيراد اليوم" : "Revenue Today",
      value: data.stats.revenueToday,
      fmt: fmtCurrency,
      icon: BadgeDollarSign,
      to: "/admin/reports",
      hint: isRTL ? "افتح التقارير" : "Open Reports",
    },
    {
      key: "coupons",
      label: isRTL ? "كوبونات متاحة" : "Available Coupons",
      value: data.stats.availableCoupons,
      fmt: fmtNum,
      icon: Ticket,
      to: "/admin/coupons",
      hint: isRTL ? "إدارة الكوبونات" : "Manage coupons",
    },
    {
      key: "top-drink",
      label: isRTL ? "الأكثر طلباً" : "Top Drink",
      value: top?.ordersMonth ?? 0,
      fmt: (n: number) => (top ? `${fmtNum(n)}` : "—"),
      subLabel: top ? (isRTL ? top.nameAr ?? top.nameEn : top.nameEn ?? top.nameAr) ?? undefined : undefined,
      icon: Flame,
      to: "/admin/drinks",
      hint: isRTL ? "المشروبات" : "Drinks",
    },
  ] : [];

  return (
    <div className="cmd-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* Greeting */}
      <header className="cmd-header">
        <div className="cmd-header-copy">
          <span className="cmd-eyebrow">{dateLabel} · {timeLabel}</span>
          <h1>
            {greeting(now.getHours(), isRTL)}
            {orgName ? <span className="cmd-org-name">, {orgName}</span> : null}
          </h1>
          <p>{isRTL ? "ما الذي يحتاج انتباهك اليوم؟" : "What needs your attention today?"}</p>
        </div>
        <div className="cmd-live">
          {!online || connError ? (
            <span className="cmd-live-badge offline" role="status">
              <WifiOff className="h-3.5 w-3.5" />
              {isRTL ? "غير متصل" : "Offline"}
            </span>
          ) : (
            <>
              <span className="cmd-live-badge live" role="status">
                <span className="cmd-pulse" aria-hidden /> {isRTL ? "مباشر" : "Live"}
              </span>
              <span className="cmd-live-time">
                {isRTL ? "آخر تحديث " : "Updated "}
                {lastUpdated ? relativeTime(lastUpdated.toISOString(), now, isRTL) : (isRTL ? "الآن" : "just now")}
              </span>
            </>
          )}
        </div>
      </header>

      {error && <div className="company-alert error">{error}</div>}

      {/* Interactive KPI cards */}
      <section className="cmd-section">
        <div className="cmd-kpi-grid">
          {(showFirstSkeleton ? Array.from({ length: 6 }) : kpis).map((k: any, i) => (
            !k ? <div key={i} className="cmd-kpi-card skeleton" /> : (
              <Link key={k.key} to={k.to} className="cmd-kpi-card cmd-kpi-link" title={k.hint}>
                <div className="cmd-kpi-icon"><k.icon className="h-4 w-4" /></div>
                <span className="cmd-kpi-label">{k.label}</span>
                <strong className="cmd-kpi-value">
                  <AnimatedNumber value={k.value} fmt={k.fmt} />
                </strong>
                {k.subLabel ? <small className="cmd-kpi-sub">{k.subLabel}</small> : null}
              </Link>
            )
          ))}
        </div>
      </section>

      {/* Today's Focus */}
      <section className="cmd-section">
        <div className="cmd-section-head">
          <span className="cmd-kicker">{isRTL ? "أولوية اليوم" : "Today's Focus"}</span>
          <h2>{isRTL ? "ما الذي يحتاج انتباهك؟" : "What needs your attention?"}</h2>
        </div>
        {showFirstSkeleton ? (
          <div className="cmd-focus-grid">{[0, 1, 2].map((i) => <div key={i} className="cmd-focus-card skeleton" />)}</div>
        ) : focus.length === 0 ? (
          <div className="cmd-focus-empty">
            <CheckCircle2 className="h-5 w-5" />
            <span>{isRTL ? "لا توجد بنود عاجلة." : "Nothing urgent right now."}</span>
          </div>
        ) : (
          <div className="cmd-focus-grid">
            {focus.map((f) => {
              const Icon = f.icon;
              return (
                <Link key={f.id} to={f.to} className="cmd-focus-card cmd-focus-link" data-priority={f.priority}>
                  <div className="cmd-focus-icon"><Icon className="h-4 w-4" /></div>
                  <div className="cmd-focus-copy">
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Live Activity + Opportunities */}
      <section className="cmd-two">
        <article className="cmd-panel">
          <header>
            <div>
              <span className="cmd-kicker">{isRTL ? "نشاط مباشر" : "Live Activity"}</span>
              <h3>{isRTL ? "آخر الاستحقاقات" : "Recent redemptions"}</h3>
            </div>
            <Activity className="h-4 w-4" />
          </header>
          <ul className="cmd-activity">
            {activity.length === 0 && !showFirstSkeleton && (
              <li className="cmd-empty">{isRTL ? "لا نشاط بعد." : "No activity yet."}</li>
            )}
            {activity.map((a) => (
              <li key={a.id}>
                <div className="cmd-activity-icon" data-kind={a.kind}>
                  {a.kind === "customer" ? <UserPlus className="h-3.5 w-3.5" /> : <Coffee className="h-3.5 w-3.5" />}
                </div>
                <div className="cmd-activity-copy">
                  <strong>{a.title}</strong>
                  {a.subtitle && <small>{a.subtitle}</small>}
                </div>
                <span className="cmd-activity-time">{relativeTime(a.time, now, isRTL)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="cmd-panel">
          <header>
            <div>
              <span className="cmd-kicker">{isRTL ? "فرص الأعمال" : "Business Opportunities"}</span>
              <h3>{isRTL ? "زد إيراداتك" : "Grow revenue"}</h3>
            </div>
            <Zap className="h-4 w-4" />
          </header>
          <ul className="cmd-opp-list">
            {opportunities.length === 0 && !showFirstSkeleton && (
              <li className="cmd-empty">{isRTL ? "لا توجد فرص الآن." : "No opportunities right now."}</li>
            )}
            {opportunities.map((o) => {
              const Icon = o.icon;
              return (
                <li key={o.id}>
                  <Link to={o.to} className="cmd-opp-link">
                    <div className="cmd-opp-icon"><Icon className="h-4 w-4" /></div>
                    <div className="cmd-opp-copy">
                      <strong>{o.title}</strong>
                      <small>{o.desc}</small>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </article>
      </section>

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <section className="cmd-section">
          <div className="cmd-section-head">
            <span className="cmd-kicker">{isRTL ? "تنبيهات ذكية" : "Smart Alerts"}</span>
            <h2>{isRTL ? "تحتاج إلى تصرّف" : "Requires action"}</h2>
          </div>
          <div className="cmd-alerts">
            {alerts.map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.id} to={a.to} className="cmd-alert" data-priority={a.priority}>
                  <div className="cmd-alert-icon"><Icon className="h-4 w-4" /></div>
                  <div className="cmd-alert-copy">
                    <strong>{a.title}</strong>
                    <small>{a.desc}</small>
                  </div>
                  <Sparkles className="h-3.5 w-3.5 cmd-alert-spark" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
