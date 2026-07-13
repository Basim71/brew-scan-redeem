import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Users,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { StatusPill } from "@/lib/ui";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type RecentOrder = {
  id: string;
  status: string;
  created_at: string;

  branch?: {
    name_en?: string | null;
  } | null;

  drink?: {
    name_en?: string | null;
  } | null;
};

function AdminDashboard() {
  const {
    t,
    fmtNum,
    timeAgo,
  } = useI18n();

  const [stats, setStats] = useState({
    subscriptions: 0,
    branches: 0,
    pending: 0,
    approved: 0,
  });

  const [recentOrders, setRecentOrders] =
    useState<RecentOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const loadDashboard =
    useCallback(async () => {
      setLoading(true);

      const [
        subscriptionsResult,
        branchesResult,
        pendingResult,
        approvedResult,
        ordersResult,
      ] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "active"),

        supabase
          .from("branches")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("orders")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "pending"),

        supabase
          .from("orders")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("status", "approved"),

        supabase
          .from("orders")
          .select(
            `
              id,
              status,
              created_at,
              branch:branches(name_en),
              drink:drink_types(name_en)
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(10),
      ]);

      setStats({
        subscriptions:
          subscriptionsResult.count ?? 0,

        branches:
          branchesResult.count ?? 0,

        pending:
          pendingResult.count ?? 0,

        approved:
          approvedResult.count ?? 0,
      });

      setRecentOrders(
        (ordersResult.data ??
          []) as unknown as RecentOrder[],
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadDashboard();

    const interval =
      window.setInterval(() => {
        void loadDashboard();
      }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const statCards = [
    {
      label: t("stat_subs"),
      value: stats.subscriptions,
      icon: Users,
    },
    {
      label: t("stat_branches"),
      value: stats.branches,
      icon: Building2,
    },
    {
      label: t("stat_pending"),
      value: stats.pending,
      icon: ClipboardList,
    },
    {
      label: t("stat_approved"),
      value: stats.approved,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            {t("nav_dashboard")}
          </h1>

          <p className="kob-page-description">
            {t("admin_sub")}
          </p>
        </div>
      </div>

      <div className="kob-stats-grid">
        {statCards.map(
          ({
            label,
            value,
            icon: Icon,
          }) => (
            <article
              key={label}
              className="kob-stat-card panel-warm"
            >
              <div className="kob-stat-card-top">
                <span className="kob-stat-label">
                  {label}
                </span>

                <span className="kob-stat-icon">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              <strong className="kob-stat-value">
                {fmtNum(value)}
              </strong>
            </article>
          ),
        )}
      </div>

      <section className="panel kob-content-card">
        <div className="kob-card-header">
          <h2 className="kob-card-title">
            {t("recent_activity")}
          </h2>

          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-caramel" />
          )}
        </div>

        <div className="kob-table-wrapper engraved">
          <table className="kob-table min-w-[720px]">
            <thead>
              <tr>
                <th>
                  {t("col_coffee")}
                </th>

                <th>
                  {t("col_branch")}
                </th>

                <th>
                  {t("col_status")}
                </th>

                <th className="text-end">
                  {t("col_when")}
                </th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="text-cream">
                    {order.drink?.name_en ?? "—"}
                  </td>

                  <td className="text-cream-dim">
                    {order.branch?.name_en ?? "—"}
                  </td>

                  <td>
                    <StatusPill
                      s={order.status}
                    />
                  </td>

                  <td className="text-end text-cream-dim">
                    {timeAgo(order.created_at)}
                  </td>
                </tr>
              ))}

              {!loading &&
                recentOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-10 text-center text-cream-dim"
                    >
                      {t("empty_orders")}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
