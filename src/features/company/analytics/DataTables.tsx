import { useMemo, useState } from "react";
import { Eye, FileDown, FileSpreadsheet, FileText, Printer } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import {
  Button,
  Card,
  CardBody,
  Caption,
  DataTable,
  Modal,
  StatusBadge,
  Tabs,
  Text,
  type Column,
  type StatusTone,
} from "@/components/kob";
import { paymentLabel, statusLabel } from "./FiltersBar";
import type { ExportTable } from "./exporters";
import type { AnalyticsDataset, SaleRecord } from "./types";

export type TabKey = "sales" | "subscriptions" | "customers" | "coupons" | "exports";

const TAB_KEYS: TabKey[] = ["sales", "subscriptions", "customers", "coupons", "exports"];

const STATUS_TONE: Record<string, StatusTone> = {
  approved: "success",
  pending: "warning",
  rejected: "error",
};

type Localize = (value: { ar: string | null; en: string | null }) => string;
type T = (key: string) => string;

export function buildTables(
  data: AnalyticsDataset,
  isAr: boolean,
  localize: Localize,
  money: (value: number) => string,
  t: T,
): Record<Exclude<TabKey, "exports">, ExportTable> {
  return {
    sales: {
      columns: [
        t("analytics.tables.columns.receipt"),
        t("analytics.tables.columns.customer"),
        t("analytics.tables.columns.cashier"),
        t("analytics.tables.columns.branch"),
        t("analytics.tables.columns.drink"),
        t("analytics.tables.columns.subscription"),
        t("analytics.tables.columns.coupon"),
        t("analytics.tables.columns.payment"),
        t("analytics.tables.columns.amount"),
        t("analytics.tables.columns.status"),
        t("analytics.tables.columns.createdAt"),
      ],
      rows: data.sales.map((row) => [
        row.receipt,
        row.customerName ?? "—",
        row.cashierName ?? "—",
        localize(row.branchName),
        localize(row.drinkName),
        localize(row.planName),
        row.couponCode ?? "—",
        paymentLabel(row.paymentMethod, t),
        money(row.amount),
        statusLabel(row.status, t),
        row.createdAt,
      ]),
    },
    subscriptions: {
      columns: [
        t("analytics.tables.columns.customer"),
        t("analytics.tables.columns.phone"),
        t("analytics.tables.columns.plan"),
        t("analytics.tables.columns.branch"),
        t("analytics.tables.columns.coupon"),
        t("analytics.tables.columns.start"),
        t("analytics.tables.columns.end"),
        t("analytics.tables.columns.amount"),
        t("analytics.tables.columns.status"),
      ],
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
      columns: [
        t("analytics.tables.columns.customer"),
        t("analytics.tables.columns.phone"),
        t("analytics.tables.columns.subscriptionsCount"),
        t("analytics.tables.columns.orders"),
        t("analytics.tables.columns.spend"),
        t("analytics.tables.columns.lastActivity"),
        t("analytics.tables.columns.joined"),
      ],
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
      columns: [
        t("analytics.tables.columns.code"),
        t("analytics.tables.columns.plan"),
        t("analytics.tables.columns.branch"),
        t("analytics.tables.columns.amount"),
        t("analytics.tables.columns.status"),
        t("analytics.tables.columns.soldAt"),
      ],
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
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>("sales");
  const [receipt, setReceipt] = useState<SaleRecord | null>(null);
  const dateFmt = useMemo(
    () => new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", { dateStyle: "medium", timeStyle: "short" }),
    [isAr],
  );
  const fmtDate = (value: string | null) => (value ? dateFmt.format(new Date(value)) : "—");

  const active = tab === "exports" ? null : tables[tab];
  const noDataLabel = t("analytics.tables.noData");

  const salesColumns: Column<SaleRecord>[] = [
    { key: "receipt", header: t("analytics.tables.columns.receipt"), render: (row) => <span className="font-mono">{row.receipt}</span> },
    { key: "customer", header: t("analytics.tables.columns.customer"), render: (row) => row.customerName ?? "—" },
    { key: "cashier", header: t("analytics.tables.columns.cashier"), render: (row) => row.cashierName ?? "—" },
    { key: "branch", header: t("analytics.tables.columns.branch"), render: (row) => localize(row.branchName) },
    { key: "drink", header: t("analytics.tables.columns.drink"), render: (row) => localize(row.drinkName) },
    { key: "plan", header: t("analytics.tables.columns.subscription"), render: (row) => localize(row.planName) },
    { key: "coupon", header: t("analytics.tables.columns.coupon"), render: (row) => <span className="font-mono">{row.couponCode ?? "—"}</span> },
    { key: "payment", header: t("analytics.tables.columns.payment"), render: (row) => paymentLabel(row.paymentMethod, t) },
    { key: "amount", header: t("analytics.tables.columns.amount"), numeric: true, align: "end", render: (row) => money(row.amount) },
    {
      key: "status",
      header: t("analytics.tables.columns.status"),
      render: (row) => <StatusBadge tone={STATUS_TONE[row.status] ?? "neutral"}>{statusLabel(row.status, t)}</StatusBadge>,
    },
    { key: "createdAt", header: t("analytics.tables.columns.createdAt"), render: (row) => fmtDate(row.createdAt) },
    {
      key: "actions",
      header: t("analytics.tables.columns.actions"),
      render: (row) => (
        <Button variant="ghost" size="sm" leadingIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setReceipt(row)}>
          {t("analytics.tables.view")}
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
          ariaLabel={t("analytics.tables.ariaLabel")}
          items={TAB_KEYS.map((key) => ({ id: key, label: t(`analytics.tables.tabs.${key}`) }))}
          value={tab}
          onChange={(id) => setTab(id as TabKey)}
        />

        <div className="mt-4">
          {tab === "exports" ? (
            <div className="an-export-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ExportTile
                icon={<FileDown className="h-5 w-5" />}
                title={t("analytics.exports.csvTitle")}
                hint={t("analytics.exports.csvHint")}
                onClick={() => onExport("csv")}
              />
              <ExportTile
                icon={<FileSpreadsheet className="h-5 w-5" />}
                title={t("analytics.exports.excelTitle")}
                hint={t("analytics.exports.excelHint")}
                onClick={() => onExport("excel")}
              />
              <ExportTile
                icon={<FileText className="h-5 w-5" />}
                title={t("analytics.exports.pdfTitle")}
                hint={t("analytics.exports.pdfHint")}
                onClick={() => onExport("pdf")}
              />
              <ExportTile
                icon={<Printer className="h-5 w-5" />}
                title={t("analytics.exports.printTitle")}
                hint={t("analytics.exports.printHint")}
                onClick={() => onExport("print")}
              />
            </div>
          ) : tab === "sales" ? (
            <DataTable
              columns={salesColumns}
              rows={data.sales}
              rowKey={(row) => row.id}
              caption={t("analytics.tables.salesCaption")}
              emptyDescription={noDataLabel}
            />
          ) : (
            <DataTable
              columns={genericColumns}
              rows={active!.rows}
              rowKey={(_row, index) => String(index)}
              caption={t(`analytics.tables.tabs.${tab}`)}
              emptyDescription={noDataLabel}
            />
          )}
        </div>
      </CardBody>

      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title={t("analytics.tables.receipt.title")}
        description={receipt ? <span className="font-mono">{receipt.receipt}</span> : undefined}
        footer={
          <Button variant="secondary" onClick={() => setReceipt(null)}>
            {t("analytics.tables.receipt.close")}
          </Button>
        }
      >
        {receipt ? (
          <dl className="an-receipt grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ReceiptRow label={t("analytics.tables.columns.customer")} value={receipt.customerName ?? "—"} />
            <ReceiptRow label={t("analytics.tables.columns.phone")} value={receipt.customerPhone ?? "—"} />
            <ReceiptRow label={t("analytics.tables.columns.cashier")} value={receipt.cashierName ?? "—"} />
            <ReceiptRow label={t("analytics.tables.columns.branch")} value={localize(receipt.branchName)} />
            <ReceiptRow label={t("analytics.tables.columns.drink")} value={localize(receipt.drinkName)} />
            <ReceiptRow label={t("analytics.tables.columns.subscription")} value={localize(receipt.planName)} />
            <ReceiptRow label={t("analytics.tables.columns.coupon")} value={receipt.couponCode ?? "—"} />
            <ReceiptRow label={t("analytics.tables.columns.payment")} value={paymentLabel(receipt.paymentMethod, t)} />
            <ReceiptRow label={t("analytics.tables.columns.amount")} value={money(receipt.amount)} />
            <ReceiptRow label={t("analytics.tables.columns.status")} value={statusLabel(receipt.status, t)} />
            <ReceiptRow label={t("analytics.tables.columns.createdAt")} value={fmtDate(receipt.createdAt)} />
            {receipt.note ? <ReceiptRow label={t("analytics.tables.receipt.note")} value={receipt.note} /> : null}
          </dl>
        ) : null}
      </Modal>
    </Card>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Caption as="dt" tone="muted">
        {label}
      </Caption>
      <Text as="dd" variant="bodySm" className="font-medium">
        {value}
      </Text>
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
      <Text as="strong" variant="bodySm" className="font-semibold">
        {title}
      </Text>
      <Caption as="small" tone="muted">
        {hint}
      </Caption>
    </button>
  );
}
