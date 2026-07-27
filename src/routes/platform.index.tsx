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
import { PageHeader } from "@/components/common/PageHeader";
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
    <div className="platform-page" dir="rtl">
      <PageHeader
        eyebrow="Platform Intelligence"
        title="إدارة منظومة KOB"
        description="نظرة مركزية على الشركات ونجاح العملاء والتشغيل اليومي."
        action={
          <div className="status-pill status-pill-success">
            <i aria-hidden="true" />
            النظام متصل
          </div>
        }
      />

      {loadError ? (
        <div className="inline-alert" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>تعذر تحميل بعض مؤشرات المنصة: {loadError}</span>
        </div>
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
            <span className="insight-card-kicker">System Status</span>
            <h2>{dbOk === null ? "قيد الفحص…" : dbOk ? "قاعدة البيانات متصلة" : "تعذر الاتصال بقاعدة البيانات"}</h2>
            <p>حالة الوصول إلى بيانات المنصة يتم فحصها في كل تحميل.</p>
            <div className="platform-quick-links">
              <Link to="/platform/companies"><Building2 /> الشركات</Link>
              <Link to="/platform/customer-success"><Headphones /> نجاح العملاء</Link>
              <Link to="/platform/training"><CalendarClock /> التدريب</Link>
            </div>
          </div>
        </article>
        <article className="insight-card insight-card-dark">
          <Radio />
          <div>
            <span className="insight-card-kicker">Recent Activity</span>
            <h2>آخر الأحداث</h2>
            {activity.length === 0 ? (
              <p>لا يوجد نشاط حديث في سجل الدعم.</p>
            ) : (
              <ul className="platform-activity-list">
                {activity.slice(0, 8).map((row) => (
                  <li key={row.id}>
                    <b>{row.action}</b>
                    <time>{new Date(row.created_at).toLocaleString("ar-SA")}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
