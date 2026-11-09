import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";
import { aggregateCustomers, type CustomerAggregate } from "./aggregate";
import { loadCustomerHub, type HubBundle } from "./service";
import { CafePage } from "@/features/company/cafe/ui";

type FilterKey = "all" | "active" | "expiring" | "none";

function initial(name: string) {
  const part = name.trim().charAt(0);
  return part || "•";
}

export function CustomerHub() {
  const { t, lang, fmtNum, fmtDay } = useI18n();
  const isAr = lang === "ar";
  const [bundle, setBundle] = useState<HubBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const next = await loadCustomerHub();
        if (cancelled) return;
        setBundle(next);
        setError(null);
      } catch (cause) {
        if (!cancelled)
          setError(cause instanceof Error ? cause.message : "Failed");
      }
    }
    void refresh();
    timerRef.current = window.setInterval(() => {
      if (document.visibilityState !== "visible" || navigator.onLine === false)
        return;
      void refresh();
    }, 5000);
    return () => {
      cancelled = true;
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const aggregates = useMemo(
    () => (bundle ? aggregateCustomers(bundle) : []),
    [bundle],
  );
  const counts = useMemo(
    () => ({
      all: aggregates.length,
      active: aggregates.filter(
        (row) => row.status === "active" || row.status === "expiring",
      ).length,
      expiring: aggregates.filter((row) => row.status === "expiring").length,
      none: aggregates.filter(
        (row) => row.status === "no_membership" || row.status === "expired",
      ).length,
    }),
    [aggregates],
  );
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return aggregates.filter((row) => {
      if (
        query &&
        !`${row.customer.name} ${row.customer.phone}`
          .toLowerCase()
          .includes(query)
      )
        return false;
      if (
        filter === "active" &&
        row.status !== "active" &&
        row.status !== "expiring"
      )
        return false;
      if (filter === "expiring" && row.status !== "expiring") return false;
      if (
        filter === "none" &&
        row.status !== "no_membership" &&
        row.status !== "expired"
      )
        return false;
      return true;
    });
  }, [aggregates, filter, search]);

  const selected = useMemo(() => {
    const current = aggregates.find((row) => row.customer.id === selectedId);
    return current ?? visible[0] ?? null;
  }, [aggregates, selectedId, visible]);

  const name = (row: CustomerAggregate, which: "plan" | "branch" | "drink") => {
    if (which === "plan") {
      const plan = row.activeSubscription?.plan;
      return (
        (isAr ? plan?.name_ar : plan?.name_en) ||
        plan?.name_en ||
        plan?.name_ar ||
        "—"
      );
    }
    if (which === "branch") {
      const branch = row.primaryBranch ?? row.activeSubscription?.branch;
      return (
        (isAr ? branch?.name_ar : branch?.name_en) ||
        branch?.name_en ||
        branch?.name_ar ||
        "—"
      );
    }
    const drink = row.favoriteDrink;
    return (
      (isAr ? drink?.name_ar : drink?.name_en) ||
      drink?.name_en ||
      drink?.name_ar ||
      "—"
    );
  };

  const span = selected?.activeSubscription
    ? `${fmtDay(selected.activeSubscription.start_date)} – ${fmtDay(selected.activeSubscription.end_date)}`
    : "";
  const progress = (() => {
    const sub = selected?.activeSubscription;
    if (!sub) return 0;
    const start = Date.parse(sub.start_date);
    const end = Date.parse(sub.end_date);
    const now = Date.now();
    if (!end || end <= start) return 0;
    return Math.max(
      6,
      Math.min(100, Math.round(((now - start) / (end - start)) * 100)),
    );
  })();

  return (
    <CafePage title={t("cafe.subs.title")} subtitle={t("cafe.subs.subtitle")}>
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-bar">
        <input
          className="cafe-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("cafe.subs.search")}
        />
        <div className="cafe-chips">
          {(
            [
              ["all", "cafe.subs.all", counts.all],
              ["active", "cafe.subs.active", counts.active],
              ["expiring", "cafe.subs.ending", counts.expiring],
              ["none", "cafe.subs.none", counts.none],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "cafe-chip on" : "cafe-chip"}
              onClick={() => setFilter(key)}
            >
              {t(label)} <b>{fmtNum(count)}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="cafe-split">
        <section className="cafe-card">
          <h2>{t("cafe.subs.count", { n: fmtNum(visible.length) })}</h2>
          {visible.length === 0 ? (
            <div className="cafe-empty">{t("cafe.subs.empty")}</div>
          ) : null}
          {visible.map((row) => {
            const on = selected?.customer.id === row.customer.id;
            const live = row.status === "active" || row.status === "expiring";
            return (
              <button
                key={row.customer.id}
                type="button"
                className="cafe-row"
                style={{
                  width: "100%",
                  border: on ? "2px solid #c8643b" : "2px solid transparent",
                  background: on ? "#fff" : undefined,
                  cursor: "pointer",
                  textAlign: "inherit",
                }}
                onClick={() => setSelectedId(row.customer.id)}
              >
                <span className="cafe-ava">{initial(row.customer.name)}</span>
                <span className="n">
                  <b>{row.customer.name}</b>
                  <div dir="ltr">{row.customer.phone}</div>
                </span>
                <span
                  style={{
                    width: 110,
                    textAlign: "center",
                    fontWeight: 700,
                    color: "#6b4226",
                  }}
                >
                  {row.daysToExpire != null
                    ? t("cafe.subs.days", { n: fmtNum(row.daysToExpire) })
                    : "—"}
                </span>
                <span className={live ? "cafe-status" : "cafe-status muted"}>
                  {live ? t("cafe.subs.live") : t("cafe.subs.none")}
                </span>
              </button>
            );
          })}
        </section>
        <section className="cafe-card">
          {selected ? (
            <>
              <div className="cafe-profile">
                <div className="cafe-ava lg">
                  {initial(selected.customer.name)}
                </div>
                <b style={{ fontSize: 22 }}>{selected.customer.name}</b>
                <div className="cafe-muted" dir="ltr">
                  {selected.customer.phone}
                </div>
              </div>
              {selected.activeSubscription ? (
                <div className="cafe-mem">
                  <div className="t">
                    <span>
                      {t("cafe.subs.plan", { name: name(selected, "plan") })}
                    </span>
                    <span>{t("cafe.subs.live")} ✓</span>
                  </div>
                  <div className="big">
                    {fmtNum(selected.daysToExpire ?? 0)}{" "}
                    <small>{t("cafe.subs.daysWord")}</small>
                  </div>
                  <div style={{ color: "#d9c7b3" }}>{span}</div>
                  <div className="cafe-prog">
                    <i style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <div className="cafe-empty">{t("cafe.subs.none")}</div>
              )}
              <div className="cafe-kv">
                <div>
                  <span>{t("cafe.subs.branch")}</span>
                  <b>{name(selected, "branch")}</b>
                </div>
                <div>
                  <span>{t("cafe.subs.renewals")}</span>
                  <b>{fmtNum(selected.renewals)}</b>
                </div>
                <div>
                  <span>{t("cafe.subs.since")}</span>
                  <b>{fmtDay(selected.customer.created_at)}</b>
                </div>
                <div>
                  <span>{t("cafe.subs.favorite")}</span>
                  <b>
                    {selected.favoriteDrink ? name(selected, "drink") : "—"}
                  </b>
                </div>
              </div>
              {selected.approvedOrders.length === 0 ? (
                <div className="cafe-empty">{t("cafe.subs.noOrders")}</div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {selected.approvedOrders.slice(0, 3).map((order) => (
                    <div className="cafe-alert" key={order.id}>
                      <i>☕</i>
                      <div>
                        {(isAr ? order.drink?.name_ar : order.drink?.name_en) ||
                          "—"}{" "}
                        · {fmtDay(order.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="cafe-empty">{t("cafe.subs.empty")}</div>
          )}
        </section>
      </div>
    </CafePage>
  );
}
