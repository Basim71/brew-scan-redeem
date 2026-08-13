import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarClock,
  CircleAlert,
  GraduationCap,
  Headphones,
  Radio,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/common/MetricCard";
import {
  Alert,
  Badge,
  BodySmall,
  Caption,
  Heading3,
  PageContainer,
  PageHeader,
  Text,
} from "@/components/kob";
import {
  EMPTY_PLATFORM_METRICS,
  fetchPlatformMetrics,
  fetchRecentActivity,
  pingDatabase,
  type ActivityRow,
  type PlatformMetrics,
} from "@/services/platform/platform-dashboard.service";

export const Route = createFileRoute("/platform/")({ component: PlatformDashboard });

function PlatformDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics>(EMPTY_PLATFORM_METRICS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [dbOk, setDbOk] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [m, a, ok] = await Promise.all([
          fetchPlatformMetrics(),
          fetchRecentActivity(15).catch(() => [] as ActivityRow[]),
          pingDatabase(),
        ]);
        if (!active) return;
        setMetrics(m.metrics);
        setLoadError(m.error);
        setActivity(a);
        setDbOk(ok);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const cards = [
    { label: "إجمالي الشركات", value: metrics.totalCompanies, icon: Building2 },
    { label: "الشركات النشطة", value: metrics.activeCompanies, icon: ShieldCheck },
    { label: "شركات موقوفة", value: metrics.suspendedCompanies, icon: CircleAlert },
    { label: "شركات جديدة هذا الشهر", value: metrics.newCompaniesThisMonth, icon: Sparkles },
    { label: "حالات مفتوحة", value: metrics.openCases, icon: Headphones },
    { label: "بانتظار الموافقة", value: metrics.awaitingApproval, icon: UserRoundCheck },
    { label: "جلسات نشطة", value: metrics.activeSessions, icon: Radio },
    { label: "تدريب قادم", value: metrics.upcomingTraining, icon: GraduationCap },
    { label: "فريق المنصة", value: metrics.activeStaff, icon: UsersRound },
  ] as const;

  return (
    <PageContainer className="platform-page">
      <PageHeader
        eyebrow="Platform Intelligence"
        title="إدارة منظومة KOB"
        description="نظرة مركزية على الشركات ونجاح العملاء والتشغيل اليومي."
        action={<Badge tone="success">النظام متصل</Badge>}
      />

      {loadError ? (
        <Alert tone="danger">{`تعذر تحميل بعض مؤشرات المنصة: ${loadError}`}</Alert>
      ) : null}

      <section className="metrics-grid" aria-label="مؤشرات المنصة">
        {cards.map((card) => (
          <MetricCard key={card.label} {...card} loading={loading} />
        ))}
      </section>

      <section className="insight-grid" aria-label="حالة النظام والنشاط">
        <article className="insight-card">
          <ShieldCheck />
          <div>
            <Caption tone="muted" className="insight-card-kicker">
              System Status
            </Caption>
            <Heading3>
              {dbOk === null ? "قيد الفحص…" : dbOk ? "قاعدة البيانات متصلة" : "تعذر الاتصال بقاعدة البيانات"}
            </Heading3>
            <BodySmall tone="secondary">حالة الوصول إلى بيانات المنصة يتم فحصها في كل تحميل.</BodySmall>
            <div className="platform-quick-links">
              <Link to="/platform/companies"><Building2 /> الشركات</Link>
              <Link to="/platform/support"><Headphones /> الدعم الفني</Link>
              <Link to="/platform/training"><CalendarClock /> التدريب</Link>
            </div>
          </div>
        </article>
        <article className="insight-card insight-card-dark">
          <Radio />
          <div>
            <Caption tone="muted" className="insight-card-kicker">
              Recent Activity
            </Caption>
            <Heading3>آخر الأحداث</Heading3>
            {activity.length === 0 ? (
              <BodySmall tone="secondary">لا يوجد نشاط حديث في سجل الدعم.</BodySmall>
            ) : (
              <ul className="platform-activity-list">
                {activity.slice(0, 8).map((row) => (
                  <li key={row.id}>
                    <Text variant="bodySm" as="span" truncate>
                      {row.action}
                    </Text>
                    <Text variant="caption" tone="muted" as="time" numeric>
                      {new Date(row.created_at).toLocaleString("ar-SA")}
                    </Text>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>
    </PageContainer>
  );
}
