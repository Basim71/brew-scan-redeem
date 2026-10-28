import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  Building2,
  CircleAlert,
  Database,
  GraduationCap,
  Headphones,
  Plus,
  Radio,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { usePlatform } from "@/providers/PlatformProvider";
import {
  EMPTY_PLATFORM_METRICS,
  fetchPlatformMetrics,
  fetchRecentActivity,
  pingDatabase,
  type ActivityRow,
  type PlatformMetrics,
} from "@/services/platform/platform-dashboard.service";

export const Route = createFileRoute("/platform/")({
  head: () => ({
    meta: [
      { title: "لوحة قيادة KOB Platform" },
      { name: "description", content: "نظرة مركزية على شركات KOB والدعم والتشغيل اليومي." },
      { property: "og:title", content: "لوحة قيادة KOB Platform" },
      { property: "og:description", content: "نظرة مركزية على شركات KOB والدعم والتشغيل اليومي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformDashboard,
});

type Kpi = { label: string; value: number; icon: LucideIcon; to?: string; tone?: "warn" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : "evening";
}

function PlatformDashboard() {
  const { fmtNum, t, lang } = useI18n();
  const tr = (k: string, vars?: Record<string, string | number>) => t(`platform.dashboard.${k}` as never, vars);
  const { profile } = usePlatform();
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
        if (active) setLoadError(error instanceof Error ? error.message : tr("unexpected"));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const companies: Kpi[] = [
    { label: tr("active_companies"), value: metrics.activeCompanies, icon: ShieldCheck, to: "/platform/companies" },
    { label: tr("new_month"), value: metrics.newCompaniesThisMonth, icon: Sparkles, to: "/platform/companies" },
    { label: tr("suspended_companies"), value: metrics.suspendedCompanies, icon: CircleAlert, to: "/platform/companies", tone: "warn" },
  ];
  const ops: Kpi[] = [
    { label: tr("open_cases"), value: metrics.openCases, icon: Headphones, to: "/platform/support" },
    { label: tr("awaiting"), value: metrics.awaitingApproval, icon: UserRoundCheck, to: "/platform/support" },
    { label: tr("live_sessions"), value: metrics.activeSessions, icon: Radio, to: "/platform/support" },
    { label: tr("upcoming_training"), value: metrics.upcomingTraining, icon: GraduationCap, to: "/platform/training" },
    { label: tr("team"), value: metrics.activeStaff, icon: UsersRound, to: "/platform/users" },
  ];
  const v = (n: number) => (loading ? "—" : fmtNum(n));
  const name = profile?.fullName?.split(" ")[0] || "";

  return (
    <div className="pd-page">
      <section className="pd-hero">
        <div className="pd-hero-copy">
          <span className="pd-eyebrow">{tr("eyebrow")}</span>
          <h1>
            {tr(greeting())}
            {name ? `${lang === "ar" ? "،" : ","} ${name}` : ""}
          </h1>
          <p>{tr("lead")}</p>
          <div className="pd-hero-actions">
            <Link to="/platform/companies" className="pd-btn pd-btn-gold">
              <Plus /> {tr("add_company")}
            </Link>
            <Link to="/platform/support" className="pd-btn pd-btn-ghost">
              <Headphones /> {tr("support_center")}
            </Link>
          </div>
        </div>
        <Link to="/platform/companies" className="pd-hero-stat">
          <Building2 />
          <small>{tr("total_companies")}</small>
          <strong>{v(metrics.totalCompanies)}</strong>
          <span>
            <bdi>{tr("active", { n: v(metrics.activeCompanies) })}</bdi> · <bdi>{tr("suspended", { n: v(metrics.suspendedCompanies) })}</bdi>
          </span>
        </Link>
      </section>

      {loadError ? <div className="pd-alert">{tr("load_error", { e: loadError })}</div> : null}

      <section className="pd-section">
        <header className="pd-section-head">
          <h2>{tr("companies")}</h2>
          <Link to="/platform/companies">
            {tr("view_all")} <ArrowUpLeft style={lang === "en" ? { transform: "scaleX(-1)" } : undefined} />
          </Link>
        </header>
        <div className="pd-kpis pd-kpis-3">
          {companies.map((k) => (
            <KpiTile key={k.label} k={k} value={v(k.value)} />
          ))}
        </div>
      </section>

      <section className="pd-section">
        <header className="pd-section-head">
          <h2>{tr("ops")}</h2>
        </header>
        <div className="pd-kpis pd-kpis-5">
          {ops.map((k) => (
            <KpiTile key={k.label} k={k} value={v(k.value)} />
          ))}
        </div>
      </section>

      <section className="pd-split">
        <article className="pd-panel">
          <header className="pd-section-head">
            <h2>{tr("activity")}</h2>
          </header>
          {activity.length === 0 ? (
            <p className="pd-empty">{tr("no_activity")}</p>
          ) : (
            <ul className="pd-activity">
              {activity.slice(0, 8).map((row) => (
                <li key={row.id}>
                  <i aria-hidden="true" />
                  <span>{row.action}</span>
                  <time>{new Date(row.created_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", { dateStyle: "short", timeStyle: "short" })}</time>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className="pd-panel pd-health" data-ok={dbOk === false ? "false" : "true"}>
          <header className="pd-section-head">
            <h2>{tr("health")}</h2>
          </header>
          <div className="pd-health-row">
            <Database />
            <div>
              <strong>{dbOk === null ? tr("checking") : dbOk ? tr("db_ok") : tr("db_fail")}</strong>
              <small>{tr("db_hint")}</small>
            </div>
            <span className="pd-dot" />
          </div>
          <div className="pd-health-row">
            <Radio />
            <div>
              <strong>{tr("sessions_count", { n: v(metrics.activeSessions) })}</strong>
              <small>{tr("sessions_hint")}</small>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function KpiTile({ k, value }: { k: Kpi; value: string }) {
  const Icon = k.icon;
  return (
    <Link to={(k.to ?? "/platform") as never} className="pd-kpi" data-tone={k.tone}>
      <span className="pd-kpi-icon">
        <Icon />
      </span>
      <strong>{value}</strong>
      <small>{k.label}</small>
    </Link>
  );
}
