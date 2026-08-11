import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { Alert, Button, PageContainer, PageHeader } from "@/components/kob";

/** Recharts is heavy (~440 kB) — load it only when the analytics charts render. */
const ChartsSection = lazy(() => import("./ChartsSection").then((m) => ({ default: m.ChartsSection })));
import { DataTables, buildTables } from "./DataTables";
import { DateRangeFilter } from "./DateRangeFilter";
import { FiltersBar } from "./FiltersBar";
import { InsightsCard } from "./InsightsCard";
import { KpiGrid } from "./KpiGrid";
import {
  applyFilters,
  branchComparison,
  buildInsights,
  computeKpis,
  drinkPopularity,
  ordersTrend,
  presetRange,
  revenueTrend,
  subscriptionDistribution,
} from "./derive";
import { exportCsv, exportExcel, exportPdf, printReport } from "./exporters";
import { loadAnalytics } from "./service";
import { EMPTY_FILTERS, type AnalyticsDataset, type AnalyticsFilters, type DateRange, type PresetKey } from "./types";

const EMPTY_DATASET: AnalyticsDataset = {
  sales: [],
  subscriptions: [],
  coupons: [],
  customers: [],
  branches: [],
  drinks: [],
  plans: [],
  cashiers: [],
  customerOptions: [],
  paymentMethods: [],
  activeMembers: 0,
};

export function AnalyticsShell() {
  const { lang } = useI18n();
  const isAr = lang === "ar";

  const [preset, setPreset] = useState<PresetKey>("last30");
  const [range, setRange] = useState<DateRange>(() => presetRange("last30", { from: "", to: "" }));
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);
  const [raw, setRaw] = useState<AnalyticsDataset>(EMPTY_DATASET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const money = useCallback(
    (value: number) =>
      new Intl.NumberFormat(isAr ? "ar-SA" : "en-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 2,
      }).format(value || 0),
    [isAr],
  );
  const num = useCallback(
    (value: number) => new Intl.NumberFormat(isAr ? "ar-SA" : "en-US").format(value || 0),
    [isAr],
  );
  const localize = useCallback(
    (value: { ar: string | null; en: string | null }) => (isAr ? value.ar || value.en : value.en || value.ar) ?? "—",
    [isAr],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRaw(await loadAnalytics(range));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setRaw(EMPTY_DATASET);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const data = useMemo(() => applyFilters(raw, filters), [raw, filters]);
  const kpis = useMemo(() => computeKpis(data, range), [data, range]);
  const tables = useMemo(() => buildTables(data, isAr, localize, money), [data, isAr, localize, money]);
  const insights = useMemo(() => buildInsights(data, kpis, isAr), [data, kpis, isAr]);

  const kpiSummary = useMemo(
    () => [
      { label: isAr ? "الإيرادات" : "Revenue", value: money(kpis.revenue) },
      { label: isAr ? "الطلبات" : "Orders", value: num(kpis.orders) },
      { label: isAr ? "متوسط الطلب" : "Average Order", value: money(kpis.averageOrder) },
      { label: isAr ? "الاشتراكات المباعة" : "Subscriptions Sold", value: num(kpis.subscriptionsSold) },
      { label: isAr ? "أعضاء نشطون" : "Active Members", value: num(kpis.activeMembers) },
    ],
    [isAr, kpis, money, num],
  );

  const handlePreset = (next: PresetKey) => {
    setPreset(next);
    if (next !== "custom") setRange(presetRange(next, range));
  };

  const handleExport = (kind: "csv" | "excel" | "pdf" | "print") => {
    const filename = `KOB-business-analytics-${range.from}-${range.to}`;
    const title = isAr ? "تحليلات الأعمال" : "Business Analytics";
    const subtitle = `${range.from} — ${range.to}`;
    if (kind === "csv") {
      exportCsv(tables.sales, filename);
      toast.success(isAr ? "تم تصدير CSV" : "CSV exported");
      return;
    }
    if (kind === "excel") {
      exportExcel(tables.sales, filename);
      toast.success(isAr ? "تم تصدير Excel" : "Excel exported");
      return;
    }
    const run = kind === "pdf" ? exportPdf : printReport;
    const opened = run({ title, subtitle, kpis: kpiSummary, table: tables.sales, isAr });
    if (!opened) toast.error(isAr ? "الرجاء السماح بالنوافذ المنبثقة للطباعة." : "Allow pop-ups to print the report.");
  };

  return (
    <PageContainer className="an-page">
      <PageHeader
        eyebrow="KOB Intelligence"
        title={isAr ? "تحليلات الأعمال" : "Business Analytics"}
        description={
          isAr
            ? "تحليلات شاملة للاشتراكات والمشروبات والإيرادات والعملاء."
            : "Complete analytics across subscriptions, drinks, revenue and customers."
        }
        action={
          <Button
            variant="secondary"
            loading={loading}
            leadingIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void load()}
          >
            {isAr ? "تحديث" : "Refresh"}
          </Button>
        }
      />

      <DateRangeFilter preset={preset} range={range} isAr={isAr} onPreset={handlePreset} onRange={setRange} />

      {error ? <Alert tone="danger">{error}</Alert> : null}

      <KpiGrid kpis={kpis} isAr={isAr} money={money} num={num} />

      <FiltersBar data={raw} filters={filters} isAr={isAr} onChange={setFilters} />

      <Suspense fallback={<div className="an-charts-fallback" aria-busy="true" aria-live="polite" />}>
      <ChartsSection
        isAr={isAr}
        money={money}
        revenue={revenueTrend(data, range)}
        orders={ordersTrend(data, range)}
        distribution={subscriptionDistribution(data, isAr)}
        drinks={drinkPopularity(data, isAr)}
        branches={branchComparison(data, isAr)}
      />
      </Suspense>

      <InsightsCard insights={insights} isAr={isAr} />

      <DataTables data={data} isAr={isAr} localize={localize} money={money} tables={tables} onExport={handleExport} />
    </PageContainer>
  );
}
