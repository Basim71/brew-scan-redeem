import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  Clock,
  Coffee,
  Flame,
  Layers3,
  Sparkles,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UserRoundCog,
  Users,
  WalletCards,
  Zap,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { CompanyRoute } from "@/features/company/access";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useLiveStatus } from "@/providers/LiveStatusProvider";
import {
  buildDrinkPopularity,
  loadCompanyDashboard,
  type DashboardPayload,
  type DrinkPopularity,
} from "@/features/company/dashboard/service";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageContainer,
  Section,
  SkeletonMetrics,
  StatCard,
  StatGrid,
} from "@/components/kob";

const POLL_MS = 15_000;

function useAnimatedNumber(value: number, duration = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    if (value === display) return;
    const started = performance.now();
    fromRef.current = display;
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(fromRef.current + (value - fromRef.current) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, display]);
  return display;
}

function AnimatedNumber({ value, fmt }: { value: number; fmt: (value: number) => string }) {
  const display = useAnimatedNumber(value);
  return <>{fmt(Math.round(display))}</>;
}

function greeting(hour: number, isRTL: boolean) {
  if (hour < 12) return isRTL ? "صباح الخير" : "Good Morning";
  if (hour < 18) return isRTL ? "مساء الخير" : "Good Afternoon";
  return isRTL ? "مساء الخير" : "Good Evening";
}

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function relativeTime(iso: string, now: Date, isRTL: boolean): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return isRTL ? "الآن" : "just now";
  if (min < 60) return isRTL ? `قبل ${min} دقيقة` : `${min} min ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return isRTL ? `قبل ${hours} ساعة` : `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return isRTL ? `قبل ${days} يوم` : `${days} d ago`;
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

type Card = {
  id: string;
  title: string;
  desc: string;
  priority: "high" | "medium" | "low";
  to: CompanyRoute;
  icon: typeof AlertCircle;
};

type Metric = {
  key: string;
  label: string;
  value: number;
  format: (value: number) => string;
  icon: typeof Users;
  to: CompanyRoute;
  note?: string;
  trend?: number;
};

type MetricGroup = {
  key: string;
  title: string;
  subtitle: string;
  metrics: Metric[];
};

type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  kind: "order" | "customer";
};

function buildFocus(data: DashboardPayload, top: DrinkPopularity | null, isRTL: boolean): Card[] {
  const s = data.stats;
  const cards: Card[] = [];
  if (s.pendingOrders > 0)
    cards.push({
      id: "pending",
      priority: "high",
      icon: Clock,
      title: isRTL ? `${s.pendingOrders} استخدام بانتظار المراجعة` : `${s.pendingOrders} redemptions awaiting review`,
      desc: isRTL ? "راجع الاستخدامات المعلقة اليوم." : "Review today's pending redemptions.",
      to: "/admin/reports",
    });
  if (s.expiringSubscriptions > 0)
    cards.push({
      id: "expiring",
      priority: "high",
      icon: AlertCircle,
      title: isRTL
        ? `${s.expiringSubscriptions} اشتراك ينتهي قريباً`
        : `${s.expiringSubscriptions} memberships expiring soon`,
      desc: isRTL ? "تابع التجديدات قبل انتهاء العضوية." : "Follow up before memberships expire.",
      to: "/admin/customers",
    });
  if (s.availableCoupons === 0)
    cards.push({
      id: "inventory",
      priority: "medium",
      icon: Ticket,
      title: isRTL ? "مخزون الاشتراكات فارغ" : "Subscription inventory is empty",
      desc: isRTL
        ? "أنشئ رموز اشتراك جديدة قبل عملية البيع التالية."
        : "Generate new subscription codes before the next sale.",
      to: "/admin/subscriptions",
    });
  if (top && top.ordersWeek > 0)
    cards.push({
      id: "top-drink",
      priority: "low",
      icon: Flame,
      title: isRTL ? `${top.nameAr ?? top.nameEn} الأكثر طلباً` : `${top.nameEn ?? top.nameAr} is trending`,
      desc: isRTL ? "راجع توفره في جميع الفروع." : "Check availability across every branch.",
      to: "/admin/drinks",
    });
  return cards.slice(0, 4);
}

function buildOpportunities(data: DashboardPayload, isRTL: boolean): Card[] {
  const s = data.stats;
  const cards: Card[] = [];
  if (s.expiringSubscriptions > 0)
    cards.push({
      id: "renewals",
      priority: "high",
      icon: WalletCards,
      title: isRTL ? `${s.expiringSubscriptions} فرصة تجديد` : `${s.expiringSubscriptions} renewal opportunities`,
      desc: isRTL ? "استهدف العملاء قبل نهاية اشتراكهم." : "Reach customers before their memberships end.",
      to: "/admin/customers",
    });
  if (s.activeSubscriptions > 0)
    cards.push({
      id: "upgrade",
      priority: "medium",
      icon: TrendingUp,
      title: isRTL ? "ترقية الأعضاء النشطين" : "Upgrade active members",
      desc: isRTL ? "اعرض الخطط الأطول على الأعضاء المنتظمين." : "Offer longer plans to consistent members.",
      to: "/admin/subscriptions",
    });
  if (s.availableCoupons > 0)
    cards.push({
      id: "inventory",
      priority: "medium",
      icon: Layers3,
      title: isRTL ? `${s.availableCoupons} رمز اشتراك متاح` : `${s.availableCoupons} subscription codes available`,
      desc: isRTL
        ? "حوّل المخزون المتاح إلى اشتراكات مفعلة."
        : "Convert available inventory into activated memberships.",
      to: "/admin/subscriptions",
    });
  return cards.slice(0, 3);
}

function buildActivity(data: DashboardPayload, isRTL: boolean): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const order of data.latestOrders.slice(0, 10)) {
    const drink = isRTL ? order.drink?.name_ar : order.drink?.name_en;
    const branch = isRTL ? order.branch?.name_ar : order.branch?.name_en;
    const verb =
      order.status === "approved"
        ? isRTL
          ? "استخدم"
          : "redeemed"
        : order.status === "rejected"
          ? isRTL
            ? "رُفض طلب"
            : "was rejected for"
          : isRTL
            ? "طلب"
            : "requested";
    items.push({
      id: `order-${order.id}`,
      kind: "order",
      title: `${order.customer?.name ?? (isRTL ? "عميل" : "Customer")} ${verb} ${drink ?? ""}`.trim(),
      subtitle: branch ?? "",
      time: order.created_at,
    });
  }
  for (const customer of data.recentCustomers.slice(0, 4)) {
    items.push({
      id: `customer-${customer.id}`,
      kind: "customer",
      title: `${isRTL ? "عميل جديد" : "New customer"}: ${customer.name}`,
      subtitle: "",
      time: customer.created_at,
    });
  }
  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 9);
}

function getUserName(session: ReturnType<typeof useOrganization>["session"], isRTL: boolean) {
  const metadata = session?.user?.user_metadata ?? {};
  return (
    metadata.full_name ??
    metadata.name ??
    metadata.display_name ??
    session?.user?.email?.split("@")[0] ??
    (isRTL ? "باسم" : "Basim")
  );
}

export default function CommandCenter() {
  const { lang, fmtNum } = useI18n();
  const isRTL = lang === "ar";
  const { session } = useOrganization();
  const { markUpdating, markUpdated, markError } = useLiveStatus();
  const now = useNow();

  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firstLoadRef = useRef(true);

  async function refreshDashboard() {
    markUpdating(isRTL ? "تحديث لوحة التحكم" : "Updating dashboard");
    try {
      const result = await loadCompanyDashboard();
      setData(result.payload);
      setError(result.error);
      if (result.error) markError(result.error);
      else markUpdated(new Date());
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : isRTL
            ? "تعذر تحميل لوحة التحكم."
            : "Could not load the dashboard.";
      setError(message);
      markError(message);
    } finally {
      firstLoadRef.current = false;
    }
  }

  useEffect(() => {
    void refreshDashboard();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshDashboard();
    }, POLL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRTL]);

  const drinkPopularity = useMemo(() => (data ? buildDrinkPopularity(data) : []), [data]);
  const topDrink = drinkPopularity[0] ?? null;
  const focus = useMemo(() => (data ? buildFocus(data, topDrink, isRTL) : []), [data, topDrink, isRTL]);
  const opportunities = useMemo(() => (data ? buildOpportunities(data, isRTL) : []), [data, isRTL]);
  const activity = useMemo(() => (data ? buildActivity(data, isRTL) : []), [data, isRTL]);

  const fmtCurrency = (value: number) => `${fmtNum(Math.round(value))} ${isRTL ? "ر.س" : "SAR"}`;
  const userName = getUserName(session, isRTL);
  const dateLabel = now.toLocaleDateString(isRTL ? "ar-SA" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString(isRTL ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
  const showSkeleton = firstLoadRef.current && !data;

  const groups: MetricGroup[] = data
    ? [
        {
          key: "customers",
          title: isRTL ? "العملاء" : "Customers",
          subtitle: isRTL ? "نمو العملاء وحالة العضويات" : "Customer growth and membership health",
          metrics: [
            {
              key: "total-customers",
              label: isRTL ? "إجمالي العملاء" : "Total Customers",
              value: data.stats.customers,
              format: fmtNum,
              icon: Users,
              to: "/admin/customers",
              note: isRTL
                ? `+${fmtNum(data.stats.newCustomersMonth)} هذا الشهر`
                : `+${fmtNum(data.stats.newCustomersMonth)} this month`,
            },
            {
              key: "new-today",
              label: isRTL ? "عملاء جدد اليوم" : "New Today",
              value: data.stats.newCustomersToday,
              format: fmtNum,
              icon: UserPlus,
              to: "/admin/customers",
              note: isRTL
                ? `+${fmtNum(data.stats.newCustomersWeek)} هذا الأسبوع`
                : `+${fmtNum(data.stats.newCustomersWeek)} this week`,
            },
            {
              key: "active-members",
              label: isRTL ? "عضويات نشطة" : "Active Memberships",
              value: data.stats.activeSubscriptions,
              format: fmtNum,
              icon: WalletCards,
              to: "/admin/customers",
              note: isRTL ? "عرض العملاء النشطين" : "View active customers",
            },
            {
              key: "expiring",
              label: isRTL ? "تنتهي قريباً" : "Expiring Soon",
              value: data.stats.expiringSubscriptions,
              format: fmtNum,
              icon: AlertCircle,
              to: "/admin/customers",
              note: isRTL ? "خلال 7 أيام" : "Within 7 days",
            },
          ],
        },
        {
          key: "subscriptions",
          title: isRTL ? "الاشتراكات والمخزون" : "Subscriptions & Inventory",
          subtitle: isRTL ? "حالة الاشتراكات ورموز البيع" : "Membership lifecycle and sellable inventory",
          metrics: [
            {
              key: "available",
              label: isRTL ? "رموز متاحة" : "Available Codes",
              value: data.stats.availableCoupons,
              format: fmtNum,
              icon: Ticket,
              to: "/admin/subscriptions",
              note: isRTL ? "جاهزة للبيع" : "Ready to sell",
            },
            {
              key: "expired",
              label: isRTL ? "منتهية" : "Expired",
              value: data.stats.expiredCoupons,
              format: fmtNum,
              icon: Clock,
              to: "/admin/subscriptions",
              note: isRTL ? "رموز منتهية الصلاحية" : "Expired codes",
            },
            {
              key: "sold",
              label: isRTL ? "تم بيعها" : "Sold",
              value: data.stats.soldCouponsCount,
              format: fmtNum,
              icon: BadgeDollarSign,
              to: "/admin/subscriptions",
              note: isRTL ? "إجمالي الرموز المباعة" : "Total sold codes",
            },
            {
              key: "expired",
              label: isRTL ? "اشتراكات منتهية" : "Expired Memberships",
              value: data.stats.expiredSubscriptions,
              format: fmtNum,
              icon: WalletCards,
              to: "/admin/subscriptions",
              note: isRTL
                ? `${fmtNum(data.stats.cancelledSubscriptions)} ملغاة`
                : `${fmtNum(data.stats.cancelledSubscriptions)} cancelled`,
            },
          ],
        },
        {
          key: "operations",
          title: isRTL ? "التشغيل" : "Operations",
          subtitle: isRTL ? "الاستخدامات والفروع والمشروبات والموظفون" : "Redemptions, branches, drinks, and employees",
          metrics: [
            {
              key: "redemptions",
              label: isRTL ? "استخدامات اليوم" : "Today's Redemptions",
              value: data.stats.approvedOrdersToday,
              format: fmtNum,
              icon: Coffee,
              to: "/admin/reports",
              note: isRTL ? `${fmtNum(data.stats.pendingOrders)} معلقة` : `${fmtNum(data.stats.pendingOrders)} pending`,
            },
            {
              key: "branches",
              label: isRTL ? "فروع نشطة" : "Active Branches",
              value: data.stats.activeBranches,
              format: fmtNum,
              icon: Building2,
              to: "/admin/branches",
              note: isRTL ? "نقاط طلب فعالة" : "Active order points",
            },
            {
              key: "drinks",
              label: isRTL ? "مشروبات نشطة" : "Active Drinks",
              value: data.stats.activeDrinks,
              format: fmtNum,
              icon: Coffee,
              to: "/admin/drinks",
              note: topDrink
                ? isRTL
                  ? `الأكثر: ${topDrink.nameAr ?? topDrink.nameEn}`
                  : `Top: ${topDrink.nameEn ?? topDrink.nameAr}`
                : undefined,
            },
            {
              key: "employees",
              label: isRTL ? "الموظفون" : "Employees",
              value: data.stats.employees,
              format: fmtNum,
              icon: UserRoundCog,
              to: "/admin/cashiers",
              note: isRTL ? "جميع الحسابات المرتبطة" : "All linked staff accounts",
            },
          ],
        },
        {
          key: "business",
          title: isRTL ? "الأعمال" : "Business",
          subtitle: isRTL ? "المبيعات والأداء المالي" : "Sales and financial performance",
          metrics: [
            {
              key: "revenue-today",
              label: isRTL ? "إيراد اليوم" : "Revenue Today",
              value: data.stats.revenueToday,
              format: fmtCurrency,
              icon: BadgeDollarSign,
              to: "/admin/reports",
              trend: pctDelta(data.stats.revenueToday, data.stats.revenueYesterday),
              note: isRTL ? "مقارنة بالأمس" : "Compared with yesterday",
            },
            {
              key: "revenue-month",
              label: isRTL ? "إيراد الشهر" : "Revenue This Month",
              value: data.stats.revenueMonth,
              format: fmtCurrency,
              icon: TrendingUp,
              to: "/admin/reports",
              note: isRTL ? "مبيعات الاشتراكات" : "Subscription sales",
            },
            {
              key: "orders-today",
              label: isRTL ? "طلبات اليوم" : "Requests Today",
              value: data.stats.ordersToday,
              format: fmtNum,
              icon: Activity,
              to: "/admin/reports",
              note: isRTL
                ? `${fmtNum(data.stats.approvedOrdersToday)} مكتملة`
                : `${fmtNum(data.stats.approvedOrdersToday)} completed`,
            },
            {
              key: "top-drink",
              label: isRTL ? "المشروب الأعلى" : "Top Drink",
              value: topDrink?.ordersMonth ?? 0,
              format: fmtNum,
              icon: Flame,
              to: "/admin/drinks",
              note: topDrink
                ? isRTL
                  ? (topDrink.nameAr ?? topDrink.nameEn ?? undefined)
                  : (topDrink.nameEn ?? topDrink.nameAr ?? undefined)
                : isRTL
                  ? "لا توجد بيانات"
                  : "No data yet",
            },
          ],
        },
      ]
    : [];

  return (
    <PageContainer size="xl" className="kob-flex-col kob-gap-6" dir={isRTL ? "rtl" : "ltr"}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="kob-h1">
            {greeting(now.getHours(), isRTL)}, <span className="text-[color:var(--kob-gold,inherit)]">{userName}</span>
          </h1>
          <p className="kob-body text-muted">
            {dateLabel} · {timeLabel}
          </p>
        </div>
        <Badge tone="info">
          {isRTL ? "هذه نظرة شاملة على أداء شركتك اليوم." : "Here is the complete view of your company today."}
        </Badge>
      </header>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <div className="flex flex-col gap-6">
        {(showSkeleton ? Array.from({ length: 4 }) : groups).map((group: any, index) =>
          !group ? (
            <Section key={index}>
              <SkeletonMetrics count={4} />
            </Section>
          ) : (
            <Section key={group.key} title={group.title} description={group.subtitle}>
              <StatGrid>
                {group.metrics.map((metric: Metric) => {
                  const Icon = metric.icon;
                  const positive = typeof metric.trend === "number" && metric.trend >= 0;
                  return (
                    <Link to={metric.to} key={metric.key} className="kob-min-w-0">
                      <StatCard
                        icon={<Icon className="h-4 w-4" />}
                        label={metric.label}
                        value={<AnimatedNumber value={metric.value} fmt={metric.format} />}
                        hint={metric.note}
                        trend={
                          typeof metric.trend === "number" ? (
                            <span
                              className={`inline-flex items-center gap-1 ${positive ? "text-[color:var(--kob-success,green)]" : "text-[color:var(--kob-danger,red)]"}`}
                            >
                              {positive ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                              {Math.abs(metric.trend)}%
                            </span>
                          ) : undefined
                        }
                      />
                    </Link>
                  );
                })}
              </StatGrid>
            </Section>
          ),
        )}
      </div>

      <Section
        title={isRTL ? "ما الذي يحتاج انتباهك الآن؟" : "What needs your attention now?"}
        description={isRTL ? "مركز الإجراءات" : "Action Center"}
      >
        {showSkeleton ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <SkeletonMetrics key={item} count={1} />
            ))}
          </div>
        ) : focus.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6" />}
            title={isRTL ? "لا توجد إجراءات عاجلة الآن." : "Nothing urgent right now."}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {focus.map((item) => {
              const Icon = item.icon;
              const tone = item.priority === "high" ? "danger" : item.priority === "medium" ? "warning" : "neutral";
              return (
                <Link to={item.to} key={item.id} className="kob-min-w-0">
                  <Card interactive className="h-full">
                    <CardBody className="flex items-start gap-3">
                      <span className="shrink-0">
                        <Badge tone={tone as any} icon={<Icon className="h-4 w-4" />} />
                      </span>
                      <div className="min-w-0">
                        <strong className="kob-body block truncate">{item.title}</strong>
                        <p className="kob-body-small text-muted">{item.desc}</p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader
            title={isRTL ? "آخر الأنشطة" : "Latest activity"}
            description={isRTL ? "النشاط التشغيلي" : "Operational Feed"}
            icon={<Activity className="h-4 w-4" />}
          />
          <CardBody>
            {activity.length === 0 && !showSkeleton ? (
              <EmptyState title={isRTL ? "لا يوجد نشاط بعد." : "No activity yet."} />
            ) : (
              <ol className="flex flex-col gap-3">
                {activity.map((item) => (
                  <li key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <span className="shrink-0 mt-1">
                      {item.kind === "customer" ? (
                        <UserPlus className="h-3.5 w-3.5" />
                      ) : (
                        <Coffee className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <strong className="kob-body block truncate">{item.title}</strong>
                      {item.subtitle ? <small className="kob-body-small text-muted block truncate">{item.subtitle}</small> : null}
                    </div>
                    <time className="kob-body-small text-muted shrink-0">{relativeTime(item.time, now, isRTL)}</time>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={isRTL ? "فرص للنمو" : "Growth opportunities"}
            description={isRTL ? "فرص الأعمال" : "Business Opportunities"}
            icon={<Zap className="h-4 w-4" />}
          />
          <CardBody>
            <ul className="flex flex-col gap-3">
              {opportunities.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link to={item.to} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                      <span className="shrink-0">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <strong className="kob-body block truncate">{item.title}</strong>
                        <small className="kob-body-small text-muted block truncate">{item.desc}</small>
                      </span>
                      <Sparkles className="h-4 w-4 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </section>
    </PageContainer>
  );
}
