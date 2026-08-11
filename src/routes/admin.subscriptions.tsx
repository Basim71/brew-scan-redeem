import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button, StatusBadge, LoadingState, EmptyState, Alert, type StatusTone } from "@/components/kob";

export const Route = createFileRoute(
  "/admin/subscriptions",
)({
  component: AdminSubscriptionsPage,
});

type SubscriptionRow = {
  id: string;
  status: string;
  created_at?: string | null;
  start_date?: string | null;
  end_date?: string | null;

  customer?: {
    name?: string | null;
    phone?: string | null;
  } | null;

  plan?: {
    name?: string | null;
    duration_days?: number | null;
  } | null;

  branch?: {
    name_en?: string | null;
  } | null;
};

const STATUS_TONE: Record<string, StatusTone> = {
  active: "success",
  approved: "success",
  pending: "warning",
  inactive: "error",
  rejected: "error",
  expired: "error",
};

function AdminSubscriptionsPage() {
  const { t } = useI18n();

  const [rows, setRows] =
    useState<SubscriptionRow[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadSubscriptions =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      const { data, error: queryError } =
        await supabase
          .from("subscriptions")
          .select(
            `
              *,
              customer:customers(name,phone),
              plan:plans(name,duration_days),
              branch:branches(name_en)
            `,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(200);

      if (queryError) {
        setError(queryError.message);
        setRows([]);
        setLoading(false);

        return;
      }

      setRows(
        (data ??
          []) as unknown as SubscriptionRow[],
      );

      setLoading(false);
    }, []);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            {t("all_subs")}
          </h1>

          <p className="kob-page-description">
            {t("tab_customers")}
          </p>
        </div>

        <Button
          variant="ghost"
          onClick={() => {
            void loadSubscriptions();
          }}
          loading={loading}
          leadingIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      <section className="panel kob-content-card">
        <div className="kob-card-header">
          <div className="flex items-center gap-3">
            <span className="kob-stat-icon">
              <Users className="h-5 w-5" />
            </span>

            <div>
              <h2 className="kob-card-title">
                {t("all_subs")}
              </h2>

              <p className="mt-1 text-xs text-cream-dim">
                {rows.length} records
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <Alert tone="danger">{error}</Alert>
          </div>
        )}

        <div className="kob-table-wrapper engraved">
          <table className="kob-table min-w-[900px]">
            <thead>
              <tr>
                <th>
                  {t("col_phone")}
                </th>

                <th>
                  {t("col_customer")}
                </th>

                <th>
                  {t("col_plan")}
                </th>

                <th>
                  {t("col_branch")}
                </th>

                <th>
                  {t("col_status")}
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-cream">
                    {row.customer?.phone ?? "—"}
                  </td>

                  <td className="text-cream-dim">
                    {row.customer?.name ?? "—"}
                  </td>

                  <td className="text-cream">
                    {row.plan?.name ?? "—"}
                  </td>

                  <td className="text-cream-dim">
                    {row.branch?.name_en ?? "—"}
                  </td>

                  <td>
                    <StatusBadge tone={STATUS_TONE[row.status] ?? "neutral"}>
                      {row.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}

              {!loading &&
                rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10"
                    >
                      <EmptyState description={t("empty_subs")} />
                    </td>
                  </tr>
                )}

              {loading &&
                rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10"
                    >
                      <LoadingState />
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
