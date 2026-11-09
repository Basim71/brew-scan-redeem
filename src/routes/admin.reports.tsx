import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { CafePage } from "@/features/company/cafe/ui";
import {
  loadCafeCommerce,
  periodRange,
  pickName,
  summarize,
  type CafeCommerce,
  type PeriodPreset,
} from "@/features/company/cafe/metrics";
import { exportExcel } from "@/features/company/analytics/exporters";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsPage,
});

const PRESETS: Array<{ id: PeriodPreset; key: string }> = [
  { id: "today", key: "cafe.reports.today" },
  { id: "week", key: "cafe.reports.week" },
  { id: "last30", key: "cafe.reports.last30" },
  { id: "month", key: "cafe.reports.month" },
  { id: "custom", key: "cafe.reports.custom" },
];

function ReportsPage() {
  const { t, lang, fmtNum, fmtDay } = useI18n();
  const isAr = lang === "ar";
  const [preset, setPreset] = useState<PeriodPreset>("last30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [data, setData] = useState<CafeCommerce | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCafeCommerce()
      .then((next) => {
        setData(next);
        setError(null);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, []);

  const range = periodRange(preset, custom);
  const summary = useMemo(
    () => (data ? summarize(data, range.from, range.to) : null),
    [data, range.from, range.to],
  );
  const maxBranch = summary?.byBranch[0]?.revenue || 1;

  function download() {
    if (!summary) return;
    exportExcel(
      {
        columns: [
          t("cafe.reports.plan"),
          t("cafe.reports.branch"),
          t("cafe.reports.date"),
          t("cafe.reports.amount"),
        ],
        rows: summary.latest.map((sale) => [
          pickName(sale.plan, isAr) || "—",
          pickName(sale.branch, isAr) || "—",
          fmtDay(sale.at),
          sale.price,
        ]),
      },
      "kob-report",
    );
  }

  return (
    <CafePage
      title={t("cafe.reports.title")}
      subtitle={t("cafe.reports.subtitle")}
      action={
        <button type="button" className="cafe-btn soft" onClick={download}>
          {t("cafe.reports.excel")}
        </button>
      }
    >
      <div className="cafe-periods">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={preset === item.id ? "on" : ""}
            onClick={() => setPreset(item.id)}
          >
            {t(item.key)}
          </button>
        ))}
      </div>
      {preset === "custom" ? (
        <div className="cafe-two">
          <input
            className="cafe-input"
            type="date"
            value={custom.from}
            onChange={(event) =>
              setCustom({ ...custom, from: event.target.value })
            }
          />
          <input
            className="cafe-input"
            type="date"
            value={custom.to}
            onChange={(event) =>
              setCustom({ ...custom, to: event.target.value })
            }
          />
        </div>
      ) : null}
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-kpis">
        <article className="cafe-kpi main">
          <div className="l">{t("cafe.reports.revenue")}</div>
          <div className="v">
            {fmtNum(summary?.revenue ?? 0)} <small>{t("cafe.sar")}</small>
          </div>
          <div className="h">
            {t("cafe.reports.fromN", { n: fmtNum(summary?.salesCount ?? 0) })}
          </div>
        </article>
        <article className="cafe-kpi">
          <div className="l">{t("cafe.reports.newSubs")}</div>
          <div className="v">{fmtNum(summary?.newSubscribers ?? 0)}</div>
          <div className="h">{t("cafe.reports.firstTime")}</div>
        </article>
        <article className="cafe-kpi">
          <div className="l">{t("cafe.reports.renewals")}</div>
          <div className="v">{fmtNum(summary?.renewals ?? 0)}</div>
          <div className="h">{t("cafe.reports.cameBack")}</div>
        </article>
        <article className="cafe-kpi">
          <div className="l">{t("cafe.reports.cups")}</div>
          <div className="v">{fmtNum(summary?.cups ?? 0)}</div>
          <div className="h">{t("cafe.reports.fromOrders")}</div>
        </article>
      </div>
      <div
        className="cafe-split"
        style={{ gridTemplateColumns: "1fr 1fr 1.15fr" }}
      >
        <section className="cafe-card">
          <h2>{t("cafe.reports.byBranch")}</h2>
          {(summary?.byBranch ?? []).length === 0 ? (
            <div className="cafe-empty">{t("cafe.reports.emptySales")}</div>
          ) : null}
          {(summary?.byBranch ?? []).map((branch) => (
            <div key={branch.id} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                }}
              >
                <span>{pickName(branch.name, isAr) || "—"}</span>
                <span>
                  {fmtNum(branch.revenue)} {t("cafe.sar")}
                </span>
              </div>
              <div className="cafe-barline">
                <i
                  style={{
                    width: `${Math.max(6, Math.round((branch.revenue / maxBranch) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </section>
        <section className="cafe-card">
          <h2>{t("cafe.reports.topDrinks")}</h2>
          {(summary?.topDrinks ?? []).length === 0 ? (
            <div className="cafe-empty">{t("cafe.reports.emptyDrinks")}</div>
          ) : (
            summary?.topDrinks.map((drink) => (
              <div className="cafe-sale" key={pickName(drink.name, isAr)}>
                <b>{pickName(drink.name, isAr)}</b>
                <span>{fmtNum(drink.count)}</span>
              </div>
            ))
          )}
        </section>
        <section className="cafe-card">
          <h2>{t("cafe.reports.latest")}</h2>
          {(summary?.latest ?? []).length === 0 ? (
            <div className="cafe-empty">{t("cafe.reports.emptySales")}</div>
          ) : null}
          {(summary?.latest ?? []).map((sale) => (
            <div className="cafe-sale" key={sale.id}>
              <div>
                <b>
                  {t("cafe.reports.planName", {
                    name: pickName(sale.plan, isAr) || "—",
                  })}
                </b>
                <div className="cafe-muted">
                  {pickName(sale.branch, isAr) || "—"} · {fmtDay(sale.at)}
                </div>
              </div>
              <span className="m">
                {fmtNum(sale.price)} {t("cafe.sar")}
              </span>
            </div>
          ))}
        </section>
      </div>
    </CafePage>
  );
}
