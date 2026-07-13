import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  ClipboardList,
  Store,
  Timer,
  CheckCircle2,
  Activity,
  Loader2,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { StatusPill } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t, fmtNum, timeAgo } = useI18n();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    subs: 0,
    branches: 0,
    pending: 0,
    approved: 0,
  });

  const [recent, setRecent] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);

    const [subsRes, branchesRes, pendingRes, approvedRes, recentRes] =
      await Promise.all([
        supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active"),

        supabase
          .from("branches")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "approved"),

        supabase
          .from("orders")
          .select(
            "id, status, created_at, branch:branches(name_en, name_ar), drink:drink_types(name_en, name_ar)",
          )
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    setStats({
      subs: subsRes.count ?? 0,
      branches: branchesRes.count ?? 0,
      pending: pendingRes.count ?? 0,
      approved: approvedRes.count ?? 0,
    });

    setRecent(recentRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();

    const interval = window.setInterval(load, 8000);

    return () => {
      window.clearInterval(interval);
    };
  }, [load]);

  return (
    <main className="screen-page">
      <div className="space-y-8">
        {/* Header */}
        <section className="panel-warm overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="engraved mb-4 inline-flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-cream-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-caramel" />
                {t("tab_overview")}
              </div>

              <h1 className="font-display text-4xl font-bold leading-tight text-cream sm:text-5xl">
                KOB Control Panel
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-dim sm:text-base">
                Monitor active subscriptions, branch performance, pending
                orders, and recent customer activity from one clean dashboard.
              </p>
            </div>

            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="btn-ghost-brass inline-flex items-center justify-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<ClipboardList className="h-5 w-5" />}
            label={t("stat_subs")}
            value={fmtNum(stats.subs)}
            hint="Active subscriptions"
          />

          <StatCard
            icon={<Store className="h-5 w-5" />}
            label={t("stat_branches")}
            value={fmtNum(stats.branches)}
            hint="Connected branches"
          />

          <StatCard
            icon={<Timer className="h-5 w-5" />}
            label={t("stat_pending")}
            value={fmtNum(stats.pending)}
            hint="Waiting cashier approval"
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label={t("stat_approved")}
            value={fmtNum(stats.approved)}
            hint="Approved orders"
          />
        </section>

        {/* Recent Activity */}
        <section className="panel rounded-[2rem] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-cream">
                {t("recent_activity")}
              </h2>
              <p className="mt-1 text-sm text-cream-dim">
                Latest drink requests and cashier actions.
              </p>
            </div>

            <div className="engraved inline-flex w-fit items-center gap-2 px-3 py-2 text-xs text-cream-dim">
              <span className="h-2 w-2 rounded-full bg-caramel" />
              Live refresh every 8s
            </div>
          </div>

          <div className="engraved overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-black/30 text-[10px] uppercase tracking-[0.22em] text-cream-dim">
                    <th className="px-4 py-4 text-start">{t("col_coffee")}</th>
                    <th className="px-4 py-4 text-start">{t("col_branch")}</th>
                    <th className="px-4 py-4 text-start">{t("col_status")}</th>
                    <th className="px-4 py-4 text-end">{t("col_when")}</th>
                  </tr>
                </thead>

                <tbody>
                  {recent.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-[oklch(0.08_0.02_40)] transition hover:bg-caramel/5"
                    >
                      <td className="px-4 py-4 font-medium text-cream">
                        {row.drink?.name_en ?? row.drink?.name_ar ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-cream-dim">
                        {row.branch?.name_en ?? row.branch?.name_ar ?? "—"}
                      </td>

                      <td className="px-4 py-4">
                        <StatusPill s={row.status} />
                      </td>

                      <td className="px-4 py-4 text-end text-cream-dim">
                        {timeAgo(row.created_at)}
                      </td>
                    </tr>
                  ))}

                  {recent.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-12 text-center text-cream-dim"
                      >
                        {t("empty_orders")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="panel-warm rounded-[1.75rem] p-5 transition hover:-translate-y-0.5">
      <div className="mb-5 flex items-center justify-between">
        <div className="engraved flex h-11 w-11 items-center justify-center rounded-full text-caramel-bright">
          {icon}
        </div>

        <div className="h-2 w-2 rounded-full bg-caramel shadow-[0_0_20px_rgba(245,166,71,0.45)]" />
      </div>

      <div className="text-[10px] uppercase tracking-[0.24em] text-cream-dim">
        {label}
      </div>

      <div className="mt-2 font-display text-5xl font-bold leading-none gold-text">
        {value}
      </div>

      <div className="mt-4 text-xs leading-relaxed text-cream-dim">
        {hint}
      </div>
    </div>
  );
}
