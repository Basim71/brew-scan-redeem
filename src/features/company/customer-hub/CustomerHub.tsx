import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Crown, Grid3x3, List, PlusCircle, Search, Users } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { aggregateCustomers, type CustomerAggregate } from "./aggregate";
import { loadCustomerHub, type HubBundle } from "./service";
import { getSavedView, saveView } from "./notes";
import { CustomerDrawer } from "./CustomerDrawer";

type FilterKey = "all" | "vip" | "active" | "expired" | "expiring" | "inactive" | "new";
type SortKey = "newest" | "oldest" | "spend" | "orders" | "recent";

const REFRESH_MS = 5000;

export function CustomerHub() {
  const { lang, fmtNum } = useI18n();
  const isAr = lang === "ar";
  const [bundle, setBundle] = useState<HubBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [branchId, setBranchId] = useState<string>("all");
  const [planId, setPlanId] = useState<string>("all");
  const [drinkId, setDrinkId] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<"table" | "grid">(getSavedView());

  const timerRef = useRef<number | null>(null);

  async function refresh() {
    try {
      const b = await loadCustomerHub();
      setBundle(b);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      void refresh();
    };
    timerRef.current = window.setInterval(tick, REFRESH_MS);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => saveView(view), [view]);

  const aggregates = useMemo<CustomerAggregate[]>(() => (bundle ? aggregateCustomers(bundle) : []), [bundle]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = aggregates.filter((a) => {
      if (q) {
        const hay = `${a.customer.name} ${a.customer.phone} ${a.customer.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter === "vip" && !a.isVip) return false;
      if (filter === "active" && a.status !== "active") return false;
      if (filter === "expired" && a.status !== "expired") return false;
      if (filter === "expiring" && a.status !== "expiring") return false;
      if (filter === "inactive" && a.status !== "inactive") return false;
      if (filter === "new" && !a.isNew) return false;
      if (branchId !== "all" && a.primaryBranch?.id !== branchId) return false;
      if (planId !== "all" && a.activeSubscription?.plan?.id !== planId) return false;
      if (drinkId !== "all" && a.favoriteDrink?.id !== drinkId) return false;
      return true;
    });
    list = list.sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.customer.created_at.localeCompare(a.customer.created_at);
        case "oldest":
          return a.customer.created_at.localeCompare(b.customer.created_at);
        case "spend":
          return b.totalSpend - a.totalSpend;
        case "orders":
          return b.approvedCount - a.approvedCount;
        case "recent":
          return (b.lastVisit ?? "").localeCompare(a.lastVisit ?? "");
      }
    });
    return list;
  }, [aggregates, search, filter, branchId, planId, drinkId, sort]);

  const selected = useMemo(
    () => aggregates.find((a) => a.customer.id === selectedId) ?? null,
    [aggregates, selectedId],
  );

  const drinkOptions = useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const a of aggregates) {
      if (a.favoriteDrink) {
        map.set(a.favoriteDrink.id, {
          id: a.favoriteDrink.id,
          label: isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en,
        });
      }
    }
    return Array.from(map.values());
  }, [aggregates, isAr]);

  return (
    <div className="hub-page" dir={isAr ? "rtl" : "ltr"}>
      <header className="hub-header">
        <div>
          <span className="hub-eyebrow">{isAr ? "الإدارة" : "Command"}</span>
          <h1>{isAr ? "مركز العملاء" : "Customer Hub"}</h1>
          <p>
            {isAr
              ? "ابحث عن العملاء واستعرض معلوماتهم من مكان واحد."
              : "Search customers and review their information in one place."}
          </p>
        </div>
      </header>

      {error && <div className="hub-alert error">{error}</div>}

      <section className="hub-toolbar">
        <label className="hub-search">
          <Search className="h-4 w-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? "ابحث بالاسم، الهاتف أو QR…" : "Search name, phone or QR…"}
          />
        </label>
        <div className="hub-chips">
          {(["all", "vip", "active", "expiring", "expired", "inactive", "new"] as FilterKey[]).map((k) => (
            <button key={k} data-active={filter === k} onClick={() => setFilter(k)}>
              {isAr
                ? {
                    all: "الكل",
                    vip: "VIP",
                    active: "نشط",
                    expiring: "قارب على الانتهاء",
                    expired: "منتهي",
                    inactive: "غير نشط",
                    new: "جديد",
                  }[k]
                : {
                    all: "All",
                    vip: "VIP",
                    active: "Active",
                    expiring: "Expiring",
                    expired: "Expired",
                    inactive: "Inactive",
                    new: "New",
                  }[k]}
            </button>
          ))}
        </div>
        <div className="hub-selects">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="all">{isAr ? "كل الفروع" : "All Branches"}</option>
            {(bundle?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.name_ar : b.name_en}
              </option>
            ))}
          </select>
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="all">{isAr ? "كل الخطط" : "All Plans"}</option>
            {(bundle?.plans ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {isAr ? p.name_ar : p.name_en}
              </option>
            ))}
          </select>
          <select value={drinkId} onChange={(e) => setDrinkId(e.target.value)}>
            <option value="all">{isAr ? "كل المشروبات" : "All Drinks"}</option>
            {drinkOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
            <option value="oldest">{isAr ? "الأقدم" : "Oldest"}</option>
            <option value="spend">{isAr ? "الأعلى إنفاقًا" : "Highest Spending"}</option>
            <option value="orders">{isAr ? "الأكثر طلبًا" : "Most Orders"}</option>
            <option value="recent">{isAr ? "الأكثر نشاطًا" : "Recently Active"}</option>
          </select>
          <div className="hub-view-toggle" role="tablist">
            <button data-active={view === "table"} onClick={() => setView("table")} aria-label="Table">
              <List className="h-4 w-4" />
            </button>
            <button data-active={view === "grid"} onClick={() => setView("grid")} aria-label="Grid">
              <Grid3x3 className="h-4 w-4" />
            </button>
          </div>
          <Link to="/admin/sell-coupon" className="hub-btn primary">
            <PlusCircle className="h-4 w-4" />
            {isAr ? "بيع عضوية" : "Sell Membership"}
          </Link>
        </div>
      </section>

      <section className="hub-results">
        <div className="hub-results-head">
          <span>
            {fmtNum(filteredSorted.length)} {isAr ? "عميل" : "customers"}
          </span>
        </div>

        {loading && !bundle ? (
          <div className="hub-skeleton">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} />
            ))}
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="hub-empty-panel">
            <Users className="h-6 w-6" />
            <p>{isAr ? "لا توجد نتائج" : "No customers match your filters."}</p>
          </div>
        ) : view === "table" ? (
          <div className="hub-table-wrap">
            <table className="hub-table">
              <thead>
                <tr>
                  <th>{isAr ? "العميل" : "Customer"}</th>
                  <th>{isAr ? "العضوية" : "Membership"}</th>
                  <th>{isAr ? "الحالة" : "Status"}</th>
                  <th>{isAr ? "آخر زيارة" : "Last Visit"}</th>
                  <th>{isAr ? "المشروب المفضل" : "Favorite Drink"}</th>
                  <th>{isAr ? "الإنفاق" : "Spend"}</th>
                  <th>{isAr ? "الطلبات" : "Orders"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((a) => (
                  <tr key={a.customer.id} onClick={() => setSelectedId(a.customer.id)}>
                    <td>
                      <div className="hub-cell-customer">
                        <div className="hub-avatar sm">{a.customer.name.slice(0, 1)}</div>
                        <div>
                          <strong>{a.customer.name}</strong>
                          <small dir="ltr">{a.customer.phone}</small>
                        </div>
                        {a.isVip && (
                          <span className="hub-tag vip">
                            <Crown className="h-3 w-3" />
                            VIP
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {a.activeSubscription
                        ? isAr
                          ? a.activeSubscription.plan?.name_ar
                          : a.activeSubscription.plan?.name_en
                        : "—"}
                    </td>
                    <td>
                      <span className={`hub-tag ${a.status}`}>{a.status}</span>
                    </td>
                    <td>{a.lastVisit ? new Date(a.lastVisit).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "—"}</td>
                    <td>{a.favoriteDrink ? (isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en) : "—"}</td>
                    <td>{fmtNum(a.totalSpend)}</td>
                    <td>{fmtNum(a.approvedCount)}</td>
                    <td>
                      <button
                        className="hub-btn ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(a.customer.id);
                        }}
                      >
                        {isAr ? "عرض" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="hub-grid-view">
            {filteredSorted.map((a) => (
              <button key={a.customer.id} className="hub-card" onClick={() => setSelectedId(a.customer.id)}>
                <div className="hub-card-top">
                  <div className="hub-avatar">{a.customer.name.slice(0, 1)}</div>
                  <div className="hub-card-name">
                    <strong>{a.customer.name}</strong>
                    <small dir="ltr">{a.customer.phone}</small>
                  </div>
                  {a.isVip && (
                    <span className="hub-tag vip">
                      <Crown className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="hub-card-meta">
                  <span className={`hub-tag ${a.status}`}>{a.status}</span>
                  <small>{a.favoriteDrink ? (isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en) : "—"}</small>
                </div>
                <div className="hub-card-stats">
                  <div>
                    <b>{fmtNum(a.approvedCount)}</b>
                    <span>{isAr ? "طلب" : "orders"}</span>
                  </div>
                  <div>
                    <b>{fmtNum(a.totalSpend)}</b>
                    <span>{isAr ? "إنفاق" : "spend"}</span>
                  </div>
                  <div>
                    <b>{fmtNum(a.loyalty.score)}</b>
                    <span>{isAr ? "ولاء" : "loyalty"}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <CustomerDrawer aggregate={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
