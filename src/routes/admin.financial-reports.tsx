import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  CalendarRange,
  Download,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/financial-reports")({
  component: FinancialReportsPage,
});

type SaleRow = {
  id: string;
  code: string;
  price: number | string;
  sold_at: string | null;
  branch?: { name_en?: string | null; name_ar?: string | null } | null;
  plan?: { name?: string | null; duration_days?: number | null } | null;
};

function FinancialReportsPage() {
  const { lang, fmtNum } = useI18n();
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(todayISO());
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    const endExclusive = new Date(`${endDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const { data, error: reportError } = await supabase
      .from("coupons")
      .select("id,code,price,sold_at,branch:branches(name_en,name_ar),plan:plans(name,duration_days)")
      .eq("status", "sold")
      .gte("sold_at", `${startDate}T00:00:00`)
      .lt("sold_at", endExclusive.toISOString())
      .order("sold_at", { ascending: false });

    if (reportError) {
      setError(reportError.message);
      setSales([]);
    } else {
      setSales((data ?? []) as unknown as SaleRow[]);
    }

    setLoading(false);
  }, [endDate, startDate]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const totalRevenue = useMemo(() => sales.reduce((sum, row) => sum + Number(row.price || 0), 0), [sales]);
  const averageSale = sales.length ? totalRevenue / sales.length : 0;
  const chartData = useMemo(() => buildPlanData(sales), [sales]);

  function exportCsv() {
    const headers = ["Coupon", "Plan", "Branch", "Price (SAR)", "Sold At"];
    const rows = sales.map((sale) => [
      sale.code,
      sale.plan?.name ?? "",
      lang === "ar" ? sale.branch?.name_ar ?? sale.branch?.name_en ?? "" : sale.branch?.name_en ?? sale.branch?.name_ar ?? "",
      Number(sale.price || 0).toFixed(2),
      sale.sold_at ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `KOB-financial-report-${startDate}-${endDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="kob-financial-page">
      <div className="kob-page-header kob-financial-header">
        <div>
          <span className="kob-dashboard-kicker">KOB Finance</span>
          <h1 className="kob-page-title">{lang === "ar" ? "التقارير المالية" : "Financial Reports"}</h1>
          <p className="kob-page-description">{lang === "ar" ? "تحليل قيمة الاشتراكات المباعة حسب الفترة والباقة والفرع." : "Analyze sold subscriptions by date, plan, and branch."}</p>
        </div>

        <button type="button" className="btn-brass kob-export-button" onClick={exportCsv} disabled={sales.length === 0}>
          <Download className="h-4 w-4" />
          {lang === "ar" ? "تصدير CSV" : "Export CSV"}
        </button>
      </div>

      <section className="kob-report-filter panel-warm">
        <label>
          <span>{lang === "ar" ? "من تاريخ" : "From"}</span>
          <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="inset-well" />
        </label>
        <label>
          <span>{lang === "ar" ? "إلى تاريخ" : "To"}</span>
          <input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} className="inset-well" />
        </label>
        <button type="button" className="btn-ghost-brass" onClick={() => void loadReport()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {lang === "ar" ? "تحديث التقرير" : "Refresh Report"}
        </button>
      </section>

      {error && <div className="kob-dashboard-error">{error}</div>}

      <div className="kob-financial-summary">
        <SummaryCard icon={<BadgeDollarSign className="h-5 w-5" />} label={lang === "ar" ? "إجمالي الإيرادات" : "Total Revenue"} value={money(totalRevenue, lang)} />
        <SummaryCard icon={<ShoppingBag className="h-5 w-5" />} label={lang === "ar" ? "عدد المبيعات" : "Sales Count"} value={fmtNum(sales.length)} />
        <SummaryCard icon={<ReceiptText className="h-5 w-5" />} label={lang === "ar" ? "متوسط قيمة البيع" : "Average Sale"} value={money(averageSale, lang)} />
        <SummaryCard icon={<CalendarRange className="h-5 w-5" />} label={lang === "ar" ? "الفترة" : "Period"} value={`${startDate} — ${endDate}`} />
      </div>

      <div className="kob-financial-grid">
        <section className="panel-warm kob-financial-chart-card">
          <div className="kob-card-header">
            <h2 className="kob-card-title">{lang === "ar" ? "الإيرادات حسب الباقة" : "Revenue by Plan"}</h2>
          </div>
          <div className="kob-financial-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="rgba(111,78,57,.12)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#806f65", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#806f65", fontSize: 11 }} />
                <Tooltip formatter={(value) => money(Number(value), lang)} contentStyle={{ borderRadius: 16, border: "1px solid rgba(111,78,57,.14)", background: "#fffdf9" }} />
                <Bar dataKey="revenue" fill="#c98745" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel-warm kob-financial-table-card">
          <div className="kob-card-header">
            <h2 className="kob-card-title">{lang === "ar" ? "سجل المبيعات" : "Sales Ledger"}</h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-caramel" />}
          </div>

          <div className="kob-table-wrapper">
            <table className="kob-table min-w-[760px]">
              <thead>
                <tr>
                  <th>{lang === "ar" ? "الكوبون" : "Coupon"}</th>
                  <th>{lang === "ar" ? "الباقة" : "Plan"}</th>
                  <th>{lang === "ar" ? "الفرع" : "Branch"}</th>
                  <th>{lang === "ar" ? "القيمة" : "Amount"}</th>
                  <th className="text-end">{lang === "ar" ? "تاريخ البيع" : "Sold At"}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="font-mono">{sale.code}</td>
                    <td>{sale.plan?.name ?? "—"}</td>
                    <td>{lang === "ar" ? sale.branch?.name_ar ?? sale.branch?.name_en ?? "—" : sale.branch?.name_en ?? sale.branch?.name_ar ?? "—"}</td>
                    <td className="font-semibold text-caramel">{money(Number(sale.price || 0), lang)}</td>
                    <td className="text-end">{sale.sold_at ? new Date(sale.sold_at).toLocaleString(lang === "ar" ? "ar-SA" : "en-US") : "—"}</td>
                  </tr>
                ))}
                {!loading && sales.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-cream-dim">{lang === "ar" ? "لا توجد مبيعات في الفترة المحددة." : "No sales in the selected period."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <article className="kob-financial-summary-card"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function buildPlanData(rows: SaleRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = row.plan?.name ?? "Other";
    map.set(name, (map.get(name) ?? 0) + Number(row.price || 0));
  }
  return Array.from(map, ([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

function money(value: number, lang: string) {
  return new Intl.NumberFormat(lang === "ar" ? "ar-SA" : "en-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function firstDayOfMonth() { const date = new Date(); return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10); }
