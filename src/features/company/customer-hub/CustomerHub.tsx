import { useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "@/lib/i18n";
import {
  DataTable,
  NoResultsState,
  SearchInput,
  Select,
  StatusBadge,
  type Column,
  type StatusTone,
} from "@/components/kob";
import { aggregateCustomers, type CustomerAggregate } from "./aggregate";
import { loadCustomerHub, type HubBundle } from "./service";
import { CustomerDrawer } from "./CustomerDrawer";

type FilterKey = "all" | "active" | "expiring" | "expired";
type SortKey = "newest" | "oldest" | "spend" | "orders" | "recent";

const REFRESH_MS = 5000;

const STATUS_TONE: Record<CustomerAggregate["status"], StatusTone> = {
  active: "success",
  expiring: "warning",
  expired: "error",
  no_membership: "neutral",
};

function statusLabel(status: CustomerAggregate["status"], isAr: boolean) {
  return isAr
    ? {
        active: "نشط",
        expiring: "قارب على الانتهاء",
        expired: "منتهي",
        no_membership: "بدون عضوية",
      }[status]
    : { active: "Active", expiring: "Expiring", expired: "Expired", no_membership: "No Membership" }[status];
}

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
      if (filter === "active" && a.status !== "active") return false;
      if (filter === "expired" && a.status !== "expired") return false;
      if (filter === "expiring" && a.status !== "expiring") return false;
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

  const filterLabels: Record<FilterKey, string> = isAr
    ? { all: "الكل", active: "نشط", expiring: "قارب على الانتهاء", expired: "منتهي" }
    : { all: "All", active: "Active", expiring: "Expiring in 7 Days", expired: "Expired" };

  const columns: Column<CustomerAggregate>[] = [
    {
      key: "customer",
      header: isAr ? "العميل" : "Customer",
      render: (a) => (
        <div className="flex min-w-0 items-center gap-2">
          <div className="hub-avatar sm shrink-0">{a.customer.name.slice(0, 1)}</div>
          <div className="min-w-0">
            <strong className="block truncate">{a.customer.name}</strong>
            <small dir="ltr">{a.customer.phone}</small>
          </div>
        </div>
      ),
    },
    {
      key: "membership",
      header: isAr ? "العضوية" : "Membership",
      render: (a) =>
        a.activeSubscription
          ? isAr
            ? a.activeSubscription.plan?.name_ar
            : a.activeSubscription.plan?.name_en
          : "—",
    },
    {
      key: "status",
      header: isAr ? "الحالة" : "Status",
      render: (a) => <StatusBadge tone={STATUS_TONE[a.status]}>{statusLabel(a.status, isAr)}</StatusBadge>,
    },
    {
      key: "lastVisit",
      header: isAr ? "آخر زيارة" : "Last Visit",
      render: (a) => (a.lastVisit ? new Date(a.lastVisit).toLocaleDateString(isAr ? "ar-SA" : "en-US") : "—"),
    },
    {
      key: "favoriteDrink",
      header: isAr ? "المشروب المفضل" : "Favorite Drink",
      render: (a) => (a.favoriteDrink ? (isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en) : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "end",
      render: (a) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedId(a.customer.id);
          }}
        >
          {isAr ? "عرض" : "View"}
        </Button>
      ),
    },
  ];

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

      {error && <StatusBadge tone="error">{error}</StatusBadge>}

      <section className="hub-toolbar">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={isAr ? "ابحث بالاسم، الهاتف أو QR…" : "Search name, phone or QR…"}
          label={isAr ? "بحث" : "Search"}
        />
        <div className="hub-chips">
          {(["all", "active", "expiring", "expired"] as FilterKey[]).map((k) => (
            <button key={k} data-active={filter === k} onClick={() => setFilter(k)}>
              {filterLabels[k]}
            </button>
          ))}
        </div>
        <div className="hub-selects">
          <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label={isAr ? "الفرع" : "Branch"}>
            <option value="all">{isAr ? "كل الفروع" : "All Branches"}</option>
            {(bundle?.branches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {isAr ? b.name_ar : b.name_en}
              </option>
            ))}
          </Select>
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)} aria-label={isAr ? "الخطة" : "Plan"}>
            <option value="all">{isAr ? "كل الخطط" : "All Plans"}</option>
            {(bundle?.plans ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {isAr ? p.name_ar : p.name_en}
              </option>
            ))}
          </Select>
          <Select value={drinkId} onChange={(e) => setDrinkId(e.target.value)} aria-label={isAr ? "المشروب" : "Drink"}>
            <option value="all">{isAr ? "كل المشروبات" : "All Drinks"}</option>
            {drinkOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={isAr ? "الترتيب" : "Sort"}>
            <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
            <option value="oldest">{isAr ? "الأقدم" : "Oldest"}</option>
            <option value="spend">{isAr ? "الأعلى إنفاقًا" : "Highest Spending"}</option>
            <option value="orders">{isAr ? "الأكثر طلبًا" : "Most Orders"}</option>
            <option value="recent">{isAr ? "الأكثر نشاطًا" : "Recently Active"}</option>
          </Select>
          <div className="hub-view-toggle" role="tablist">
            <IconButton
              label={isAr ? "جدول" : "Table"}
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("table")}
            >
              <List className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={isAr ? "شبكة" : "Grid"}
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("grid")}
            >
              <Grid3x3 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>
      </section>

      <section className="hub-results">
        <div className="hub-results-head">
          <span>
            {fmtNum(filteredSorted.length)} {isAr ? "عميل" : "customers"}
          </span>
        </div>

        {loading && !bundle ? (
          <DataTable columns={columns} rows={[]} rowKey={(a) => a.customer.id} loading caption={isAr ? "العملاء" : "Customers"} />
        ) : filteredSorted.length === 0 ? (
          <NoResultsState
            title={isAr ? "لا توجد نتائج" : "No customers found"}
            description={isAr ? "لا توجد نتائج تطابق عوامل التصفية." : "No customers match your filters."}
          />
        ) : view === "table" ? (
          <DataTable
            columns={columns}
            rows={filteredSorted}
            rowKey={(a) => a.customer.id}
            caption={isAr ? "العملاء" : "Customers"}
          />
        ) : (
          <div className="hub-grid-view">
            {filteredSorted.map((a) => (
              <button key={a.customer.id} className="hub-card" onClick={() => setSelectedId(a.customer.id)}>
                <div className="hub-card-top">
                  <div className="hub-avatar">{a.customer.name.slice(0, 1)}</div>
                  <div className="hub-card-name min-w-0">
                    <strong className="block truncate">{a.customer.name}</strong>
                    <small dir="ltr">{a.customer.phone}</small>
                  </div>
                </div>
                <div className="hub-card-meta">
                  <StatusBadge tone={STATUS_TONE[a.status]}>{statusLabel(a.status, isAr)}</StatusBadge>
                  <small>{a.favoriteDrink ? (isAr ? a.favoriteDrink.name_ar : a.favoriteDrink.name_en) : "—"}</small>
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
