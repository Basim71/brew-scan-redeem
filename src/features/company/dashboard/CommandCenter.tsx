import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Coffee,
  Coins,
  Flame,
  Gift,
  HeadphonesIcon,
  LifeBuoy,
  Minus,
  Package,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
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
  buildBranchPerformance,
  buildDailyRevenue,
  buildDrinkPopularity,
  loadCompanyDashboard,
  type BranchPerformance,
  type DashboardPayload,
  type DrinkPopularity,
} from "@/features/company/dashboard/service";

const RevenueAreaChart = lazy(async () => ({
  default: (await import("@/components/charts/DashboardCharts")).RevenueAreaChart,
}));

const POLL_MS = 5000;

/* ------------------------------------------------------------------ */
/* Animated counter                                                   */
/* ------------------------------------------------------------------ */
function useAnimatedNumber(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  useEffect(() => {
    if (value === display) return;
    fromRef.current = display;
    startRef.current = performance.now();
    const target = value;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(next);
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
function greeting(hour: number, isRTL: boolean) {
  if (hour < 12) return isRTL ? "صباح الخير" : "Good Morning";
  if (hour < 18) return isRTL ? "مساء الخير" : "Good Afternoon";
  return isRTL ? "مساء الخير" : "Good Evening";
}

function useNow(intervalMs = 30000) {
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

type ActivityItem = {
  id: string;
  kind: "order" | "customer" | "subscription";
  title: string;
  subtitle: string;
  time: string;
  status?: string;
};

function buildActivity(data: DashboardPayload, isRTL: boolean): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const o of data.latestOrders.slice(0, 12)) {
    const drink = isRTL ? o.drink?.name_ar : o.drink?.name_en;
    const branch = isRTL ? o.branch?.name_ar : o.branch?.name_en;
    const verb =
      o.status === "approved"
        ? isRTL ? "استلم" : "redeemed"
        : o.status === "rejected"
          ? isRTL ? "طلب مرفوض" : "rejected order for"
          : isRTL ? "طلب" : "requested";
    items.push({
      id: `o-${o.id}`,
      kind: "order",
      title: `${o.customer?.name ?? (isRTL ? "عميل" : "Customer")} ${verb} ${drink ?? ""}`.trim(),
      subtitle: branch ?? "",
      time: o.created_at,
      status: o.status,
    });
  }
  for (const c of data.recentCustomers.slice(0, 5)) {
    items.push({
      id: `c-${c.id}`,
      kind: "customer",
      title: `${isRTL ? "عميل جديد" : "New customer"}: ${c.name}`,
      subtitle: "",
      time: c.created_at,
    });
  }
  return items
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Focus / Opportunities / Health computation                         */
/* ------------------------------------------------------------------ */
type FocusCard = {
  id: string;
  title: string;
  desc: string;
  priority: "high" | "medium" | "low";
  actionLabel: string;
  to: string;
  icon: typeof AlertCircle;
};

function buildFocus(data: DashboardPayload, top: DrinkPopularity | null, isRTL: boolean): FocusCard[] {
  const cards: FocusCard[] = [];
  const s = data.stats;

  if (s.expiringSubscriptions > 0) {
    cards.push({
      id: "expiring",
      priority: "high",
      icon: AlertCircle,
      title: isRTL ? `${s.expiringSubscriptions} اشتراك ينتهي قريباً` : `${s.expiringSubscriptions} memberships expiring soon`,
      desc: isRTL ? "تواصل مع العملاء لتجديد اشتراكاتهم قبل الانتهاء." : "Reach out to customers before their plans expire.",
      actionLabel: isRTL ? "عرض العملاء" : "View Customers",
      to: "/admin/subscriptions",
    });
  }
  if (s.pendingOrders > 0) {
    cards.push({
      id: "pending",
      priority: "high",
      icon: Clock,
      title: isRTL ? `${s.pendingOrders} طلب بانتظار الموافقة` : `${s.pendingOrders} orders awaiting approval`,
      desc: isRTL ? "افتح الطلبات وقم بمراجعتها الآن." : "Review pending orders now.",
      actionLabel: isRTL ? "فتح الطلبات" : "Open Orders",
      to: "/admin/orders",
    });
  }
  if (s.revenueYesterday > 0 && s.revenueToday < s.revenueYesterday * 0.7) {
    cards.push({
      id: "rev-drop",
      priority: "medium",
      icon: TrendingDown,
      title: isRTL ? "الإيراد اليوم أقل من أمس" : "Revenue is below yesterday",
      desc: isRTL ? "ادفع الحملات وشجّع البيع لتحسين الأداء." : "Launch a campaign to lift today's sales.",
      actionLabel: isRTL ? "بيع اشتراك" : "Sell More",
      to: "/admin/sell-coupon",
    });
  }
  if (s.availableCoupons > 0) {
    cards.push({
      id: "coupons",
      priority: "low",
      icon: Ticket,
      title: isRTL ? `${s.availableCoupons} كوبون جاهز للبيع` : `${s.availableCoupons} coupons ready to sell`,
      desc: isRTL ? "استغل المخزون المتوفر لبيع اشتراكات جديدة." : "Convert inventory into new memberships.",
      actionLabel: isRTL ? "بيع اشتراك" : "Sell Coupon",
      to: "/admin/sell-coupon",
    });
  }
  if (top && top.ordersWeek > 0) {
    cards.push({
      id: "top-drink",
      priority: "low",
      icon: Flame,
      title: isRTL
        ? `${top.nameAr ?? top.nameEn} هو الأكثر مبيعاً`
        : `${top.nameEn ?? top.nameAr} is trending`,
      desc: isRTL ? "استخدمه في حملة ترويجية هذا الأسبوع." : "Feature it in a promo this week.",
      actionLabel: isRTL ? "إدارة المشروبات" : "Manage Drinks",
      to: "/admin/drinks",
    });
  }
  return cards.slice(0, 5);
}

type Opportunity = FocusCard;

function buildOpportunities(
  data: DashboardPayload,
  drinks: DrinkPopularity[],
  branches: BranchPerformance[],
  isRTL: boolean,
): Opportunity[] {
  const out: Opportunity[] = [];
  const s = data.stats;

  if (s.newCustomersToday > 0) {
    out.push({
      id: "welcome-new",
      priority: "medium",
      icon: UserPlus,
      title: isRTL ? `${s.newCustomersToday} عميل جديد اليوم` : `${s.newCustomersToday} new customers today`,
      desc: isRTL ? "قدّم لهم أول اشتراك ترحيبي." : "Offer a welcome plan to convert them.",
      actionLabel: isRTL ? "بيع اشتراك" : "Sell Membership",
      to: "/admin/sell-coupon",
    });
  }

  const risingDrink = drinks.find((d) => d.ordersWeek > 0 && d.ordersWeek >= d.ordersPrevWeek * 1.5 && d.ordersWeek >= 3);
  if (risingDrink) {
    out.push({
      id: `rising-${risingDrink.drinkId}`,
      priority: "medium",
      icon: Sparkles,
      title: isRTL
        ? `${risingDrink.nameAr ?? risingDrink.nameEn} في نمو متسارع`
        : `${risingDrink.nameEn ?? risingDrink.nameAr} is rising fast`,
      desc: isRTL ? "أطلق حملة قصيرة حوله لزيادة الإيراد." : "Run a short campaign to capitalize.",
      actionLabel: isRTL ? "إنشاء حملة" : "Create Campaign",
      to: "/admin/drinks",
    });
  }

  const weakBranch = branches.find(
    (b) => branches.length > 1 && b.ordersMonth < (branches[0]?.ordersMonth ?? 0) * 0.4,
  );
  if (weakBranch) {
    out.push({
      id: `branch-${weakBranch.branchId}`,
      priority: "medium",
      icon: Building2,
      title: isRTL
        ? `فرع ${weakBranch.nameAr ?? weakBranch.nameEn} تحت المتوسط`
        : `${weakBranch.nameEn ?? weakBranch.nameAr} is underperforming`,
      desc: isRTL ? "راجع الأداء وشجّع فريق الفرع." : "Review branch and support the team.",
      actionLabel: isRTL ? "فتح الفرع" : "Open Branch",
      to: "/admin/branches",
    });
  }

  if (s.expiringSubscriptions >= 3) {
    out.push({
      id: "renew-batch",
      priority: "high",
      icon: WalletCards,
      title: isRTL ? `${s.expiringSubscriptions} فرصة تجديد` : `${s.expiringSubscriptions} renewals in reach`,
      desc: isRTL ? "تواصل مع العملاء لعرض التجديد." : "Contact these customers with a renewal offer.",
      actionLabel: isRTL ? "عرض الاشتراكات" : "View Subscriptions",
      to: "/admin/subscriptions",
    });
  }

  return out.slice(0, 4);
}

type Health = { label: string; status: "green" | "amber" | "red"; value: string; hint: string };

function buildHealth(data: DashboardPayload, isRTL: boolean): Health[] {
  const s = data.stats;
  const items: Health[] = [];

  // Membership health
  const total = s.activeSubscriptions + s.expiringSubscriptions;
  const memberPct = total > 0 ? Math.round(((total - s.expiringSubscriptions) / total) * 100) : 100;
  items.push({
    label: isRTL ? "صحة الاشتراكات" : "Membership Health",
    status: memberPct >= 80 ? "green" : memberPct >= 50 ? "amber" : "red",
    value: `${memberPct}%`,
    hint: isRTL ? `${s.activeSubscriptions} نشط` : `${s.activeSubscriptions} active`,
  });

  // Customer activity: approved today / active subs
  const activityRate = s.activeSubscriptions > 0
    ? Math.min(100, Math.round((s.approvedOrdersToday / s.activeSubscriptions) * 100))
    : 0;
  items.push({
    label: isRTL ? "نشاط العملاء" : "Customer Activity",
    status: activityRate >= 40 ? "green" : activityRate >= 15 ? "amber" : "red",
    value: `${activityRate}%`,
    hint: isRTL ? `${s.approvedOrdersToday} استلام اليوم` : `${s.approvedOrdersToday} redeemed today`,
  });

  // Coupons inventory
  items.push({
    label: isRTL ? "الكوبونات" : "Coupons",
    status: s.availableCoupons >= 10 ? "green" : s.availableCoupons > 0 ? "amber" : "red",
    value: `${s.availableCoupons}`,
    hint: isRTL ? "متاح للبيع" : "available",
  });

  // Revenue trend
  const delta = pctDelta(s.revenueToday, s.revenueYesterday);
  items.push({
    label: isRTL ? "اتجاه الإيراد" : "Revenue Trend",
    status: delta >= 0 ? "green" : delta >= -20 ? "amber" : "red",
    value: `${delta > 0 ? "+" : ""}${delta}%`,
    hint: isRTL ? "مقارنة بأمس" : "vs. yesterday",
  });

  return items;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function CommandCenter() {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const { organization, branchId } = useOrganization();
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
  const revenueSeries = useMemo(() => (data ? buildDailyRevenue(data.soldCoupons, lang) : []), [data, lang]);
  const branchPerf = useMemo(() => {
    if (!data) return [];
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    return buildBranchPerformance(
      data.branches, data.soldCoupons, data.ordersMonth,
      monthStart.toISOString(), data.activeSubsByBranch, todayStart.toISOString(),
    );
  }, [data]);

  const focus = useMemo(() => (data ? buildFocus(data, drinkPop[0] ?? null, isRTL) : []), [data, drinkPop, isRTL]);
  const health = useMemo(() => (data ? buildHealth(data, isRTL) : []), [data, isRTL]);
  const opportunities = useMemo(() => (data ? buildOpportunities(data, drinkPop, branchPerf, isRTL) : []), [data, drinkPop, branchPerf, isRTL]);
  const activity = useMemo(() => (data ? buildActivity(data, isRTL) : []), [data, isRTL]);

  const fmtCurrency = (n: number) => `${fmtNum(Math.round(n))} ${isRTL ? "ر.س" : "SAR"}`;
  const dateLabel = now.toLocaleDateString(isRTL ? "ar-SA" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  const timeLabel = now.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const orgName = organization?.nameAr && isRTL ? organization.nameAr : organization?.nameEn ?? organization?.nameAr ?? "";

  const businessMsg = useMemo(() => {
    if (!data) return "";
    const s = data.stats;
    if (s.pendingOrders > 0) return isRTL ? "لديك طلبات بانتظارك." : "Orders are waiting for you.";
    if (s.expiringSubscriptions > 0) return isRTL ? "هناك فرص تجديد اليوم." : "Renewal opportunities today.";
    const delta = pctDelta(s.revenueToday, s.revenueYesterday);
    if (delta > 10) return isRTL ? "المبيعات في تصاعد." : "Sales are on the rise.";
    if (delta < -10) return isRTL ? "الأداء اليوم أقل من أمس." : "Today is slower than yesterday.";
    return isRTL ? "كل شيء يسير بسلاسة." : "Everything is running smoothly.";
  }, [data, isRTL]);

  const insights = useMemo(() => {
    if (!data) return [] as string[];
    const s = data.stats;
    const arr: string[] = [];
    const delta = pctDelta(s.revenueToday, s.revenueYesterday);
    if (Math.abs(delta) >= 5) {
      arr.push(
        isRTL
          ? `الإيراد ${delta >= 0 ? "ارتفع" : "انخفض"} بنسبة ${Math.abs(delta)}% عن أمس.`
          : `Revenue ${delta >= 0 ? "up" : "down"} ${Math.abs(delta)}% vs. yesterday.`
      );
    }
    const top = drinkPop[0];
    const second = drinkPop[1];
    if (top && second && top.ordersMonth > second.ordersMonth) {
      arr.push(
        isRTL
          ? `${top.nameAr ?? top.nameEn} يتصدر ${second.nameAr ?? second.nameEn} هذا الشهر.`
          : `${top.nameEn ?? top.nameAr} is outperforming ${second.nameEn ?? second.nameAr} this month.`
      );
    }
    if (s.newCustomersWeek > 0) {
      arr.push(
        isRTL
          ? `${s.newCustomersWeek} عميل جديد خلال الأسبوع.`
          : `${s.newCustomersWeek} new customers joined this week.`
      );
    }
    if (s.activeSubscriptions > 0) {
      arr.push(
        isRTL
          ? `${s.activeSubscriptions} اشتراك نشط حالياً.`
          : `${s.activeSubscriptions} active memberships right now.`
      );
    }
    return arr.slice(0, 4);
  }, [data, drinkPop, isRTL]);

  const totalOrdersMonth = drinkPop.reduce((a, b) => a + b.ordersMonth, 0);
  const activeBranches = branchPerf.filter((b) => (b.ordersToday ?? 0) > 0 || (b.activeMembers ?? 0) > 0).length;
  const showFirstSkeleton = firstLoadRef.current && !data;

  const kpis = data ? [
    { label: isRTL ? "أعضاء نشطون" : "Active Members", value: data.stats.activeSubscriptions, icon: Users, fmt: fmtNum },
    { label: isRTL ? "مشروبات استُلمت اليوم" : "Drinks Redeemed Today", value: data.stats.approvedOrdersToday, icon: Coffee, fmt: fmtNum },
    { label: isRTL ? "إيراد اليوم" : "Revenue Today", value: data.stats.revenueToday, icon: BadgeDollarSign, fmt: fmtCurrency },
    { label: isRTL ? "طلبات اليوم" : "Orders Today", value: data.stats.ordersToday, icon: ShoppingBag, fmt: fmtNum },
    { label: isRTL ? "تجديدات معلقة" : "Pending Renewals", value: data.stats.expiringSubscriptions, icon: WalletCards, fmt: fmtNum },
    { label: isRTL ? "عملاء جدد" : "New Customers", value: data.stats.newCustomersToday, icon: UserPlus, fmt: fmtNum },
    { label: isRTL ? "كوبونات متاحة" : "Available Coupons", value: data.stats.availableCoupons, icon: Ticket, fmt: fmtNum },
    { label: isRTL ? "فروع نشطة" : "Active Branches", value: activeBranches, icon: Store, fmt: fmtNum },
  ] : [];

  const [branchSort, setBranchSort] = useState<"revenue" | "orders" | "members">("revenue");
  const sortedBranches = useMemo(() => {
    const arr = [...branchPerf];
    if (branchSort === "orders") arr.sort((a, b) => (b.ordersToday ?? 0) - (a.ordersToday ?? 0));
    else if (branchSort === "members") arr.sort((a, b) => (b.activeMembers ?? 0) - (a.activeMembers ?? 0));
    else arr.sort((a, b) => b.revenueMonth - a.revenueMonth);
    return arr;
  }, [branchPerf, branchSort]);

  return (
    <div className="cmd-page" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="cmd-header">
        <div className="cmd-header-copy">
          <span className="cmd-eyebrow">{dateLabel} · {timeLabel}</span>
          <h1>
            {greeting(now.getHours(), isRTL)}
            {orgName ? <span className="cmd-org-name">, {orgName}</span> : null}
          </h1>
          <p>{businessMsg || (isRTL ? "مركز قرارات أعمالك اليومي." : "Your daily business decision center.")}</p>
        </div>
        <div className="cmd-live">
          {!online || connError ? (
            <span className="cmd-live-badge offline" role="status">
              <WifiOff className="h-3.5 w-3.5" />
              {isRTL ? "غير متصل · محاولة إعادة الاتصال" : "Offline · reconnecting"}
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

      {/* Section 1 — Today's Focus */}
      <section className="cmd-section">
        <div className="cmd-section-head">
          <span className="cmd-kicker">{isRTL ? "أولوية اليوم" : "Today's Focus"}</span>
          <h2>{isRTL ? "ما الذي يحتاج انتباهك؟" : "What needs your attention?"}</h2>
        </div>
        {showFirstSkeleton ? (
          <div className="cmd-focus-grid">
            {[0, 1, 2].map((i) => <div key={i} className="cmd-focus-card skeleton" />)}
          </div>
        ) : focus.length === 0 ? (
          <div className="cmd-focus-empty">
            <CheckCircle2 className="h-5 w-5" />
            <span>{isRTL ? "لا توجد بنود عاجلة الآن." : "Nothing urgent right now."}</span>
          </div>
        ) : (
          <div className="cmd-focus-grid">
            {focus.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.id} className="cmd-focus-card" data-priority={f.priority}>
                  <div className="cmd-focus-icon"><Icon className="h-4 w-4" /></div>
                  <div className="cmd-focus-copy">
                    <strong>{f.title}</strong>
                    <p>{f.desc}</p>
                  </div>
                  <Link to={f.to as any} className="cmd-focus-action">
                    {f.actionLabel} <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2 — Business Health */}
      <section className="cmd-section">
        <div className="cmd-section-head">
          <span className="cmd-kicker">{isRTL ? "صحة الأعمال" : "Business Health"}</span>
          <h2>{isRTL ? "نبض المؤشرات الرئيسية" : "Vitals at a glance"}</h2>
        </div>
        <div className="cmd-health-grid">
          {(showFirstSkeleton ? Array.from({ length: 4 }) : health).map((h: any, i) => (
            !h ? <div key={i} className="cmd-health-card skeleton" /> : (
              <article key={h.label} className="cmd-health-card" data-status={h.status}>
                <span className="cmd-health-dot" aria-hidden />
                <div>
                  <span className="cmd-health-label">{h.label}</span>
                  <strong>{h.value}</strong>
                  <small>{h.hint}</small>
                </div>
              </article>
            )
          ))}
        </div>
      </section>

      {/* Section 3 — Live Metrics */}
      <section className="cmd-section">
        <div className="cmd-section-head">
          <span className="cmd-kicker">{isRTL ? "المؤشرات الحيّة" : "Live Metrics"}</span>
          <h2>{isRTL ? "الأرقام لحظة بلحظة" : "Real-time numbers"}</h2>
        </div>
        <div className="cmd-kpi-grid">
          {(showFirstSkeleton ? Array.from({ length: 8 }) : kpis).map((k: any, i) => (
            !k ? <div key={i} className="cmd-kpi-card skeleton" /> : (
              <article key={k.label} className="cmd-kpi-card">
                <div className="cmd-kpi-icon"><k.icon className="h-4 w-4" /></div>
                <span className="cmd-kpi-label">{k.label}</span>
                <strong className="cmd-kpi-value">
                  <AnimatedNumber value={k.value} fmt={k.fmt} />
                </strong>
              </article>
            )
          ))}
        </div>
      </section>

      {/* Row: Opportunities + Activity */}
      <section className="cmd-two">
        <article className="cmd-panel">
          <header>
            <div>
              <span className="cmd-kicker">{isRTL ? "فرص اليوم" : "Today's Opportunities"}</span>
              <h3>{isRTL ? "زد إيراداتك" : "Grow revenue"}</h3>
            </div>
            <Zap className="h-4 w-4" />
          </header>
          <ul className="cmd-opp-list">
            {opportunities.length === 0 && !showFirstSkeleton && (
              <li className="cmd-empty">{isRTL ? "لا توجد فرص جاهزة الآن." : "No opportunities right now."}</li>
            )}
            {opportunities.map((o) => {
              const Icon = o.icon;
              return (
                <li key={o.id}>
                  <div className="cmd-opp-icon"><Icon className="h-4 w-4" /></div>
                  <div className="cmd-opp-copy">
                    <strong>{o.title}</strong>
                    <small>{o.desc}</small>
                  </div>
                  <Link to={o.to as any} className="cmd-mini-btn">{o.actionLabel}</Link>
                </li>
              );
            })}
          </ul>
        </article>

        <article className="cmd-panel">
          <header>
            <div>
              <span className="cmd-kicker">{isRTL ? "نشاط مباشر" : "Live Activity"}</span>
              <h3>{isRTL ? "أحدث الأحداث" : "Latest events"}</h3>
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
      </section>

      {/* Row: Top Products + Compact Revenue */}
      <section className="cmd-two">
        <article className="cmd-panel">
          <header>
            <div>
              <span className="cmd-kicker">{isRTL ? "أفضل المنتجات" : "Top Products"}</span>
              <h3>{isRTL ? "الأكثر طلباً هذا الشهر" : "Most redeemed this month"}</h3>
            </div>
            <BarChart3 className="h-4 w-4" />
          </header>
          <ul className="cmd-drinks">
            {drinkPop.slice(0, 5).map((d) => {
              const pct = totalOrdersMonth > 0 ? Math.round((d.ordersMonth / totalOrdersMonth) * 100) : 0;
              const trend = d.ordersWeek - d.ordersPrevWeek;
              const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
              return (
                <li key={d.drinkId}>
                  <div className="cmd-drink-thumb">
                    {d.imageUrl ? <img src={d.imageUrl} alt="" /> : <Coffee className="h-4 w-4" />}
                  </div>
                  <div className="cmd-drink-body">
                    <strong>{isRTL ? d.nameAr ?? d.nameEn : d.nameEn ?? d.nameAr}</strong>
                    <div className="cmd-drink-bar" aria-hidden>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                    <small>{fmtNum(d.ordersMonth)} {isRTL ? "طلب" : "orders"} · {pct}%</small>
                  </div>
                  <span className={`cmd-trend ${trend > 0 ? "up" : trend < 0 ? "down" : "flat"}`}>
                    <TrendIcon className="h-3.5 w-3.5" />
                    {trend > 0 ? "+" : ""}{trend}
                  </span>
                </li>
              );
            })}
            {drinkPop.length === 0 && !showFirstSkeleton && (
              <li className="cmd-empty">{isRTL ? "لا توجد بيانات مشروبات." : "No drink data yet."}</li>
            )}
          </ul>
        </article>

        <article className="cmd-panel">
          <header>
            <div>
              <span className="cmd-kicker">{isRTL ? "الإيرادات" : "Revenue"}</span>
              <h3>{isRTL ? "آخر 30 يوماً" : "Last 30 days"}</h3>
            </div>
            <TrendingUp className="h-4 w-4" />
          </header>
          <div className="cmd-mini-chart">
            <Suspense fallback={<div className="company-chart-skeleton" aria-hidden />}>
              <RevenueAreaChart data={revenueSeries} />
            </Suspense>
          </div>
        </article>
      </section>

      {/* Section 7 — Branch Performance */}
      <section className="cmd-section">
        <div className="cmd-section-head between">
          <div>
            <span className="cmd-kicker">{isRTL ? "أداء الفروع" : "Branch Performance"}</span>
            <h2>{isRTL ? "مقارنة مباشرة" : "Live comparison"}</h2>
          </div>
          <div className="cmd-sort" role="tablist" aria-label="Sort branches">
            {(["revenue", "orders", "members"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={branchSort === s ? "active" : ""}
                onClick={() => setBranchSort(s)}
              >
                {s === "revenue" ? (isRTL ? "الإيراد" : "Revenue")
                  : s === "orders" ? (isRTL ? "الطلبات" : "Orders")
                  : (isRTL ? "الأعضاء" : "Members")}
              </button>
            ))}
          </div>
        </div>
        <div className="cmd-table-wrap">
          <table className="cmd-table">
            <thead>
              <tr>
                <th>{isRTL ? "الفرع" : "Branch"}</th>
                <th>{isRTL ? "طلبات اليوم" : "Orders Today"}</th>
                <th>{isRTL ? "إيراد الشهر" : "Revenue (MTD)"}</th>
                <th>{isRTL ? "الأعضاء" : "Members"}</th>
                <th>{isRTL ? "النمو" : "Growth"}</th>
                <th>{isRTL ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {sortedBranches.map((b) => {
                const top = sortedBranches[0]?.revenueMonth ?? 0;
                const health: "green" | "amber" | "red" =
                  b.revenueMonth >= top * 0.7 ? "green"
                  : b.revenueMonth >= top * 0.3 ? "amber" : "red";
                const grew = (b.ordersToday ?? 0) > 0;
                return (
                  <tr key={b.branchId}>
                    <td>{isRTL ? b.nameAr ?? b.nameEn : b.nameEn ?? b.nameAr}</td>
                    <td>{fmtNum(b.ordersToday ?? 0)}</td>
                    <td className="strong">{fmtCurrency(b.revenueMonth)}</td>
                    <td>{fmtNum(b.activeMembers ?? 0)}</td>
                    <td>
                      <span className={`cmd-trend ${grew ? "up" : "flat"}`}>
                        {grew ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                        {fmtNum(b.ordersMonth)}
                      </span>
                    </td>
                    <td>
                      <span className={`cmd-status ${health}`}>
                        {health === "green" ? (isRTL ? "ممتاز" : "Healthy")
                          : health === "amber" ? (isRTL ? "يحتاج مراجعة" : "Watch")
                          : (isRTL ? "منخفض" : "Low")}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {sortedBranches.length === 0 && !showFirstSkeleton && (
                <tr><td colSpan={6} className="cmd-empty">{isRTL ? "لا توجد فروع نشطة." : "No active branches."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 8 — Quick Actions */}
      <section className="cmd-section">
        <div className="cmd-section-head">
          <span className="cmd-kicker">{isRTL ? "إجراءات سريعة" : "Quick Actions"}</span>
          <h2>{isRTL ? "افعل الآن" : "Do it now"}</h2>
        </div>
        <div className="cmd-quick-grid">
          {[
            { label: isRTL ? "عميل جديد" : "New Customer", to: "/admin/customers", icon: UserPlus },
            { label: isRTL ? "بيع اشتراك" : "Sell Membership", to: "/admin/sell-coupon", icon: WalletCards },
            { label: isRTL ? "إنشاء كوبون" : "Create Coupon", to: "/admin/coupons", icon: Ticket },
            { label: isRTL ? "إضافة مشروب" : "Add Drink", to: "/admin/drinks", icon: Coffee },
            { label: isRTL ? "خطة جديدة" : "Create Plan", to: "/admin/plans", icon: Package },
            { label: isRTL ? "التقارير" : "Reports", to: "/admin/reports", icon: BarChart3 },
            { label: isRTL ? "الموظفون" : "Employees", to: "/admin/cashiers", icon: Users },
            { label: isRTL ? "دعم العملاء" : "Customer Success", to: "/admin/customer-success", icon: LifeBuoy },
          ].map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.to} to={q.to as any} className="cmd-quick-btn">
                <Icon className="h-4 w-4" />
                <span>{q.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Section 9 — Insights */}
      {insights.length > 0 && (
        <section className="cmd-section">
          <div className="cmd-section-head">
            <span className="cmd-kicker">{isRTL ? "ملاحظات ذكية" : "Business Insights"}</span>
            <h2>{isRTL ? "من بياناتك" : "From your data"}</h2>
          </div>
          <ul className="cmd-insights">
            {insights.map((t, i) => (
              <li key={i}><Sparkles className="h-3.5 w-3.5" /> {t}</li>
            ))}
          </ul>
        </section>
      )}

      {/* silent unused refs to avoid TS complaints */}
      <span hidden aria-hidden>{branchId}<Coins /><Plus /><ArrowDownRight /><HeadphonesIcon /><Gift /></span>
    </div>
  );
}