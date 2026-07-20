import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  CircleAlert,
  Headphones,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { MetricCard } from "@/components/common/MetricCard";
import { PageHeader } from "@/components/common/PageHeader";
import {
  EMPTY_PLATFORM_METRICS,
  fetchPlatformMetrics,
  type PlatformMetrics,
} from "@/services/platform/dashboard";

export const Route = createFileRoute("/platform/")({ component: PlatformDashboard });

function PlatformDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics>(EMPTY_PLATFORM_METRICS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetchPlatformMetrics()
      .then(({ metrics: nextMetrics, error }) => {
        if (!active) return;
        setMetrics(nextMetrics);
        setLoadError(error);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "حدث خطأ غير متوقع.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    { label: "إجمالي الشركات", value: metrics.companies, icon: Building2 },
    { label: "الشركات النشطة", value: metrics.activeCompanies, icon: ShieldCheck },
    { label: "إجمالي العملاء", value: metrics.customers, icon: Users },
    { label: "حالات بانتظار الفريق", value: metrics.pendingCases, icon: CircleAlert },
    { label: "حالات نشطة", value: metrics.activeCases, icon: Radio },
    { label: "فريق المنصة", value: metrics.activeStaff, icon: Headphones },
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

      <section className="insight-grid" aria-label="مزايا التشغيل">
        <article className="insight-card insight-card-dark">
          <Headphones />
          <div>
            <span className="insight-card-kicker">Customer Success</span>
            <h2>إدارة الحالات من مكان واحد</h2>
            <p>تابع الحالات الجديدة والمجدولة والنشطة مع سجل واضح لكل إجراء.</p>
          </div>
        </article>
        <article className="insight-card">
          <ShieldCheck />
          <div>
            <span className="insight-card-kicker">Controlled Access</span>
            <h2>وصول محكوم بالموافقة</h2>
            <p>لا تبدأ أي جلسة دعم أو صلاحية مؤقتة قبل موافقة ممثل الشركة.</p>
          </div>
        </article>
      </section>
    </div>
  );
}
