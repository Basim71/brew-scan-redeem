import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import {
  loadCafeCommerce,
  periodRange,
  pickName,
  riyadhToday,
  summarize,
  type CafeCommerce,
} from "@/features/company/cafe/metrics";

function greetingKey(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Riyadh",
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  if (hour < 12) return "cafe.home.morning";
  if (hour < 17) return "cafe.home.afternoon";
  return "cafe.home.evening";
}

function stageKey(status: string, stage: string | null) {
  if (status === "pending") return "cafe.home.stage.pending";
  if (stage === "ready" || stage === "handover") return "cafe.home.stage.ready";
  if (stage === "picked_up") return "cafe.home.stage.done";
  if (status === "approved") return "cafe.home.stage.preparing";
  return "cafe.home.stage.done";
}

export default function CommandCenter() {
  const { t, lang, fmtNum, timeAgo } = useI18n();
  const isAr = lang === "ar";
  const [data, setData] = useState<CafeCommerce | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void loadCafeCommerce()
        .then((next) => {
          if (!cancelled) {
            setData(next);
            setError(null);
          }
        })
        .catch((cause) => {
          if (!cancelled)
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const month = periodRange("month");
  const today = riyadhToday();
  const summary = data ? summarize(data, month.from, month.to) : null;
  const cupsToday = data
    ? data.orders.filter(
        (order) => order.status === "approved" && order.orderDate === today,
      ).length
    : 0;
  const recent = (data?.orders ?? []).slice(0, 5);
  const weekday = new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-arab" : "en-US", {
    timeZone: "Asia/Riyadh",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="cafe-page">
      <div>
        <h1>
          {t(greetingKey())} <span aria-hidden>👋</span>
        </h1>
        <p className="cafe-sub">
          {weekday} · {t("cafe.home.summary")}
        </p>
      </div>
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-kpis">
        <article className="cafe-kpi main">
          <div className="l">{t("cafe.home.cups")}</div>
          <div className="v">{fmtNum(cupsToday)}</div>
          <div className="h">
            {t("cafe.home.pending", { n: fmtNum(data?.pendingOrders ?? 0) })}
          </div>
        </article>
        <article className="cafe-kpi">
          <div className="l">{t("cafe.home.active")}</div>
          <div className="v">{fmtNum(data?.activeSubscribers ?? 0)}</div>
          <div className="h">
            {t("cafe.home.ofCustomers", {
              n: fmtNum(data?.totalCustomers ?? 0),
            })}
          </div>
        </article>
        <article className="cafe-kpi">
          <div className="l">{t("cafe.home.revenue")}</div>
          <div className="v">
            {fmtNum(summary?.revenue ?? 0)} <small>{t("cafe.sar")}</small>
          </div>
          <div className="h">{t("cafe.home.fromPlans")}</div>
        </article>
        <article className="cafe-kpi warn">
          <div className="l">{t("cafe.home.ending")}</div>
          <div className="v">{fmtNum(data?.expiringCount ?? 0)}</div>
          <div className="h">{t("cafe.home.remind")}</div>
        </article>
      </div>
      <div className="cafe-split">
        <section className="cafe-card">
          <h2>{t("cafe.home.orders")}</h2>
          {recent.length === 0 ? (
            <div className="cafe-empty">{t("cafe.home.noOrders")}</div>
          ) : (
            recent.map((order) => {
              const drink = pickName(order.drink, isAr) || t("cafe.home.drink");
              const branch = pickName(order.branch, isAr);
              const done =
                order.stage === "picked_up" || order.status === "rejected";
              return (
                <div className="cafe-order" key={order.id}>
                  {order.drink.image ? (
                    <img src={order.drink.image} alt="" />
                  ) : (
                    <span className="cafe-thumb" />
                  )}
                  <div className="n">
                    <b>{order.customer || t("cafe.home.subscriber")}</b>
                    <div>
                      {drink}
                      {branch ? ` · ${branch}` : ""} ·{" "}
                      {timeAgo(order.createdAt)}
                    </div>
                  </div>
                  <span className={done ? "cafe-pill ok" : "cafe-pill"}>
                    {t(stageKey(order.status, order.stage))}
                  </span>
                </div>
              );
            })
          )}
        </section>
        <section className="cafe-card">
          <h2>{t("cafe.home.attention")}</h2>
          {(data?.expiring ?? []).map((row) => (
            <div className="cafe-alert" key={row.id}>
              <i>⏳</i>
              <div>
                {t("cafe.home.expires", {
                  name: row.name || t("cafe.home.subscriber"),
                  n: fmtNum(row.days),
                })}
              </div>
            </div>
          ))}
          <div className="cafe-alert">
            <i>📦</i>
            <div>
              {t("cafe.home.coupons", {
                n: fmtNum(data?.availableCoupons ?? 0),
              })}
            </div>
          </div>
          <div className="cafe-alert">
            <i>⭐</i>
            <div>
              {t("cafe.home.noSub", {
                n: fmtNum(data?.customersWithoutSub ?? 0),
              })}
            </div>
          </div>
          <div className="cafe-quick">
            <Link to="/admin/drinks" hash="new">
              {t("cafe.home.newDrink")}
            </Link>
            <Link to="/admin/promotions" hash="new">
              {t("cafe.home.newPromo")}
            </Link>
            <Link to="/admin/reports">{t("cafe.home.report")}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
