import { useMemo, useState } from "react";
import { Eye, FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";

import { Button, Card, CardBody, DataTable, Modal, StatusBadge, Tabs, type Column, type StatusTone } from "@/components/kob";
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

const STATUS_TONE: Record<string, StatusTone> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
};

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
  const noDataLabel = isAr ? "لا توجد بيانات لهذه الفترة." : "No data for this period.";

  const salesColumns: Column<SaleRecord>[] = [
    { key: "receipt", header: isAr ? "رقم الفاتورة" : "Receipt #", render: (row) => <span className="font-mono">{row.receipt}</span> },
    { key: "customer", header: isAr ? "العميل" : "Customer", render: (row) => row.customerName ?? "—" },
    { key: "cashier", header: isAr ? "الكاشير" : "Cashier", render: (row) => row.cashierName ?? "—" },
    { key: "branch", header: isAr ? "الفرع" : "Branch", render: (row) => localize(row.branchName) },
    { key: "drink", header: isAr ? "المشروب" : "Drink", render: (row) => localize(row.drinkName) },
    { key: "plan", header: isAr ? "الباقة" : "Subscription", render: (row) => localize(row.planName) },
    { key: "coupon", header: isAr ? "الكوبون" : "Coupon", render: (row) => <span className="font-mono">{row.couponCode ?? "—"}</span> },
    { key: "payment", header: isAr ? "الدفع" : "Payment", render: (row) => paymentLabel(row.paymentMethod, isAr) },
    { key: "amount", header: isAr ? "القيمة" : "Amount", numeric: true, align: "end", render: (row) => money(row.amount) },
    {
      key: "status",
      header: isAr ? "الحالة" : "Status",
      render: (row) => <StatusBadge tone={STATUS_TONE[row.status] ?? "neutral"}>{statusLabel(row.status, isAr)}</StatusBadge>,
    },
    { key: "createdAt", header: isAr ? "التاريخ" : "Created At", render: (row) => fmtDate(row.createdAt) },
    {
      key: "actions",
      header: isAr ? "إجراءات" : "Actions",
      render: (row) => (
        <Button variant="ghost" size="sm" leadingIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setReceipt(row)}>
          {isAr ? "عرض" : "View"}
        </Button>
      ),
    },
  ];

  const genericColumns: Column<(string | number)[]>[] =
    active?.columns.map((column, columnIndex) => ({
      key: `${column}-${columnIndex}`,
      header: column,
      render: (row) => String(row[columnIndex]),
    })) ?? [];

  return (
    <Card>
      <CardBody className="an-tables">
        <Tabs
          ariaLabel={isAr ? "جداول التحليلات" : "Analytics tables"}
          items={TABS.map((item) => ({ id: item.key, label: isAr ? item.ar : item.en }))}
          value={tab}
          onChange={(id) => setTab(id as TabKey)}
        />

        <div className="mt-4">
          {tab === "exports" ? (
            <div className="an-export-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <DataTable
              columns={salesColumns}
              rows={data.sales}
              rowKey={(row) => row.id}
              caption={isAr ? "جدول المبيعات" : "Sales table"}
              emptyDescription={noDataLabel}
            />
          ) : (
            <DataTable
              columns={genericColumns}
              rows={active!.rows}
              rowKey={(_row, index) => String(index)}
              caption={isAr ? (TABS.find((t) => t.key === tab)?.ar ?? "") : (TABS.find((t) => t.key === tab)?.en ?? "")}
              emptyDescription={noDataLabel}
            />
          )}
        </div>
      </CardBody>

      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={isAr ? "تفاصيل الفاتورة" : "Receipt details"}
        description={receipt ? <span className="font-mono">{receipt.receipt}</span> : undefined}
        footer={
          <Button variant="secondary" onClick={() => setReceipt(null)}>
            {isAr ? "إغلاق" : "Close"}
          </Button>
        }
      >
        {receipt ? (
          <dl className="an-receipt grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        ) : null}
      </Modal>
    </Card>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs opacity-60">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
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
