import { useMemo, useState } from "react";
import { Eye, FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";

import { paymentLabel, statusLabel } from "./FiltersBar";
import type { ExportTable } from "./exporters";
import type { AnalyticsDataset, SaleRecord } from "./types";

export type TabKey = "sales" | "subscriptions" | "customers" | "coupons" | "exports";

const TABS: Array<{ key: TabKey; ar: string; en: string }> = [
  { key: "sales", ar: "المبيعات", en: "Sales" },
  { key: "subscriptions", ar: "الاشتراكات", en: "Subscriptions" },
  { key: "customers", ar: "العملاء", en: "Customers" },
  { key: "coupons", ar: "الكوبونات", en: "Coupons" },
  { key: "exports", ar: "التصدير", en: "Exports" },
];

type Localize = (value: { ar: string | null; en: string | null }) => string;

export function buildTables(
  data: AnalyticsDataset,
  isAr: boolean,
  localize: Localize,
  money: (value: number) => string,
): Record<Exclude<TabKey, "exports">, ExportTable> {
  return {
    sales: {
      columns: isAr
        ? ["رقم الفاتورة", "العميل", "الكاشير", "الفرع", "المشروب", "الباقة", "الكوبون", "الدفع", "القيمة", "الحالة", "التاريخ"]
        : ["Receipt #", "Customer", "Cashier", "Branch", "Drink", "Subscription", "Coupon", "Payment", "Amount", "Status", "Created At"],
      rows: data.sales.map((row) => [
        row.receipt,
        row.customerName ?? "—",
        row.cashierName ?? "—",
        localize(row.branchName),
        localize(row.drinkName),
        localize(row.planName),
        row.couponCode ?? "—",
        paymentLabel(row.paymentMethod, isAr),
        money(row.amount),
        statusLabel(row.status, isAr),
        row.createdAt,
      ]),
    },
    subscriptions: {
      columns: isAr
        ? ["العميل", "الجوال", "الباقة", "الفرع", "الكوبون", "البداية", "النهاية", "القيمة", "الحالة"]
        : ["Customer", "Phone", "Plan", "Branch", "Coupon", "Start", "End", "Amount", "Status"],
      rows: data.subscriptions.map((row) => [
        row.customerName ?? "—",
        row.customerPhone ?? "—",
        localize(row.planName),
        localize(row.branchName),
        row.couponCode ?? "—",
        row.startDate,
        row.endDate,
        money(row.price),
        row.status,
      ]),
    },
    customers: {
      columns: isAr
        ? ["العميل", "الجوال", "الاشتراكات", "الطلبات", "الإنفاق", "آخر نشاط", "تاريخ التسجيل"]
        : ["Customer", "Phone", "Subscriptions", "Orders", "Spend", "Last Activity", "Joined"],
      rows: data.customers.map((row) => [
        row.name,
        row.phone,
        row.subscriptions,
        row.orders,
        money(row.spend),
        row.lastActivity ?? "—",
        row.createdAt.slice(0, 10),
      ]),
    },
    coupons: {
      columns: isAr
        ? ["الكود", "الباقة", "الفرع", "القيمة", "الحالة", "تاريخ البيع"]
        : ["Code", "Plan", "Branch", "Amount", "Status", "Sold At"],
      rows: data.coupons.map((row) => [
        row.code,
        localize(row.planName),
        localize(row.branchName),
        money(row.price),
        row.status,
        row.soldAt ?? "—",
      ]),
    },
  };
}

export function DataTables({
  data,
  isAr,
  localize,
  money,
  tables,
  onExport,
}: {
  data: AnalyticsDataset;
  isAr: boolean;
  localize: Localize;
  money: (value: number) => string;
  tables: Record<Exclude<TabKey, "exports">, ExportTable>;
  onExport: (kind: "csv" | "excel" | "pdf" | "print") => void;
}) {
  const [tab, setTab] = useState<TabKey>("sales");
  const [receipt, setReceipt] = useState<SaleRecord | null>(null);
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }),
    [isAr],
  );
  const fmtDate = (value: string | null) => (value ? dateFmt.format(new Date(value)) : "—");

  const active = tab === "exports" ? null : tables[tab];

  return (
    <section className="an-card an-tables">
      <div className="an-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            data-active={tab === item.key ? "true" : "false"}
            onClick={() => setTab(item.key)}
          >
            {isAr ? item.ar : item.en}
          </button>
        ))}
      </div>

      {tab === "exports" ? (
        <div className="an-export-grid">
          <ExportTile
            icon={<FileDown className="h-5 w-5" />}
            title={isAr ? "تصدير CSV" : "Export CSV"}
            hint={isAr ? "ملف نصي مناسب لأي نظام" : "Universal spreadsheet file"}
            onClick={() => onExport("csv")}
          />
          <ExportTile
            icon={<FileSpreadsheet className="h-5 w-5" />}
            title={isAr ? "تصدير Excel" : "Export Excel"}
            hint={isAr ? "يفتح مباشرة في Excel" : "Opens natively in Excel"}
            onClick={() => onExport("excel")}
          />
          <ExportTile
            icon={<FileText className="h-5 w-5" />}
            title={isAr ? "تصدير PDF" : "Export PDF"}
            hint={isAr ? "حفظ التقرير كملف PDF" : "Save the report as PDF"}
            onClick={() => onExport("pdf")}
          />
          <ExportTile
            icon={<Printer className="h-5 w-5" />}
            title={isAr ? "طباعة التقرير" : "Print Report"}
            hint={isAr ? "طباعة ملخص الفترة" : "Print the period summary"}
            onClick={() => onExport("print")}
          />
        </div>
      ) : tab === "sales" ? (
        <div className="an-table-wrap">
          <table className="an-table">
            <thead>
              <tr>
                {active!.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
                <th>{isAr ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {data.sales.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono">{row.receipt}</td>
                  <td>{row.customerName ?? "—"}</td>
                  <td>{row.cashierName ?? "—"}</td>
                  <td>{localize(row.branchName)}</td>
                  <td>{localize(row.drinkName)}</td>
                  <td>{localize(row.planName)}</td>
                  <td className="font-mono">{row.couponCode ?? "—"}</td>
                  <td>{paymentLabel(row.paymentMethod, isAr)}</td>
                  <td className="an-amount">{money(row.amount)}</td>
                  <td>
                    <span className={`an-status an-status-${row.status}`}>{statusLabel(row.status, isAr)}</span>
                  </td>
                  <td>{fmtDate(row.createdAt)}</td>
                  <td>
                    <button type="button" className="an-view" onClick={() => setReceipt(row)}>
                      <Eye className="h-3.5 w-3.5" />
                      {isAr ? "عرض" : "View"}
                    </button>
                  </td>
                </tr>
              ))}
              {data.sales.length === 0 ? (
                <tr>
                  <td colSpan={active!.columns.length + 1} className="an-empty">
                    {isAr ? "لا توجد بيانات لهذه الفترة." : "No data for this period."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="an-table-wrap">
          <table className="an-table">
            <thead>
              <tr>
                {active!.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active!.rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{String(cell)}</td>
                  ))}
                </tr>
              ))}
              {active!.rows.length === 0 ? (
                <tr>
                  <td colSpan={active!.columns.length} className="an-empty">
                    {isAr ? "لا توجد بيانات لهذه الفترة." : "No data for this period."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {receipt ? (
        <div className="an-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setReceipt(null)}>
          <div className="an-modal" onClick={(event) => event.stopPropagation()}>
            <header>
              <h3>{isAr ? "تفاصيل الفاتورة" : "Receipt details"}</h3>
              <span className="font-mono">{receipt.receipt}</span>
            </header>
            <dl className="an-receipt">
              <ReceiptRow label={isAr ? "العميل" : "Customer"} value={receipt.customerName ?? "—"} />
              <ReceiptRow label={isAr ? "الجوال" : "Phone"} value={receipt.customerPhone ?? "—"} />
              <ReceiptRow label={isAr ? "الكاشير" : "Cashier"} value={receipt.cashierName ?? "—"} />
              <ReceiptRow label={isAr ? "الفرع" : "Branch"} value={localize(receipt.branchName)} />
              <ReceiptRow label={isAr ? "المشروب" : "Drink"} value={localize(receipt.drinkName)} />
              <ReceiptRow label={isAr ? "الباقة" : "Subscription"} value={localize(receipt.planName)} />
              <ReceiptRow label={isAr ? "الكوبون" : "Coupon"} value={receipt.couponCode ?? "—"} />
              <ReceiptRow label={isAr ? "طريقة الدفع" : "Payment"} value={paymentLabel(receipt.paymentMethod, isAr)} />
              <ReceiptRow label={isAr ? "القيمة" : "Amount"} value={money(receipt.amount)} />
              <ReceiptRow label={isAr ? "الحالة" : "Status"} value={statusLabel(receipt.status, isAr)} />
              <ReceiptRow label={isAr ? "التاريخ" : "Created At"} value={fmtDate(receipt.createdAt)} />
              {receipt.note ? <ReceiptRow label={isAr ? "ملاحظة" : "Note"} value={receipt.note} /> : null}
            </dl>
            <footer>
              <button type="button" className="cs-btn" onClick={() => setReceipt(null)}>
                {isAr ? "إغلاق" : "Close"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ExportTile({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="an-export-tile" onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
      <small>{hint}</small>
    </button>
  );
}