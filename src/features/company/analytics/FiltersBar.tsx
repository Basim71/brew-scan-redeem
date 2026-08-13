import { Filter, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { Badge, Button, Card, CardBody, CardHeader, Select as KobSelect, Input } from "@/components/kob";
import { EMPTY_FILTERS, type AnalyticsDataset, type AnalyticsFilters } from "./types";

const PAYMENT_KEYS = ["cash", "card", "apple_pay", "stc_pay", "mada", "bank_transfer"] as const;
const STATUS_KEYS = ["pending", "approved", "rejected"] as const;

function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <KobSelect label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </KobSelect>
  );
}

export function FiltersBar({
  data,
  filters,
  isAr,
  onChange,
}: {
  data: AnalyticsDataset;
  filters: AnalyticsFilters;
  isAr: boolean;
  onChange: (filters: AnalyticsFilters) => void;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<AnalyticsFilters>) => onChange({ ...filters, ...patch });
  const name = (row: { name_ar: string | null; name_en: string | null }) =>
    (isAr ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? "—";
  const active = Object.values(filters).filter(Boolean).length;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4 shrink-0" />
            {t("analytics.filters.title")}
            {active > 0 ? <Badge tone="gold">{active}</Badge> : null}
          </span>
        }
        action={
          active > 0 ? (
            <Button variant="ghost" size="sm" leadingIcon={<X className="h-3.5 w-3.5" />} onClick={() => onChange(EMPTY_FILTERS)}>
              {t("analytics.filters.clear")}
            </Button>
          ) : null
        }
      />
      <CardBody>
        <div className="an-filters-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label={t("analytics.filters.branch")}
            value={filters.branchId}
            onChange={(branchId) => set({ branchId })}
            placeholder={t("analytics.filters.allBranches")}
            options={data.branches.map((row) => ({ value: row.id, label: name(row) }))}
          />
          <FilterSelect
            label={t("analytics.filters.drink")}
            value={filters.drinkId}
            onChange={(drinkId) => set({ drinkId })}
            placeholder={t("analytics.filters.allDrinks")}
            options={data.drinks.map((row) => ({ value: row.id, label: name(row) }))}
          />
          <FilterSelect
            label={t("analytics.filters.plan")}
            value={filters.planId}
            onChange={(planId) => set({ planId })}
            placeholder={t("analytics.filters.allPlans")}
            options={data.plans.map((row) => ({ value: row.id, label: name(row) }))}
          />
          <FilterSelect
            label={t("analytics.filters.cashier")}
            value={filters.cashierId}
            onChange={(cashierId) => set({ cashierId })}
            placeholder={t("analytics.filters.allCashiers")}
            options={data.cashiers.map((row) => ({ value: row.id, label: row.name }))}
          />
          <FilterSelect
            label={t("analytics.filters.customer")}
            value={filters.customerId}
            onChange={(customerId) => set({ customerId })}
            placeholder={t("analytics.filters.allCustomers")}
            options={data.customerOptions.map((row) => ({ value: row.id, label: row.name }))}
          />
          <Input
            label={t("analytics.filters.coupon")}
            value={filters.couponCode}
            placeholder={t("analytics.filters.searchCode")}
            onChange={(event) => set({ couponCode: event.target.value })}
          />
          <FilterSelect
            label={t("analytics.filters.paymentMethod")}
            value={filters.paymentMethod}
            onChange={(paymentMethod) => set({ paymentMethod })}
            placeholder={t("analytics.filters.allMethods")}
            options={data.paymentMethods.map((value) => ({
              value,
              label: t(`analytics.payment.${value}`),
            }))}
          />
          <FilterSelect
            label={t("analytics.filters.status")}
            value={filters.status}
            onChange={(status) => set({ status })}
            placeholder={t("analytics.filters.allStatuses")}
            options={STATUS_KEYS.map((value) => ({
              value,
              label: t(`analytics.status.${value}`),
            }))}
          />
        </div>
      </CardBody>
    </Card>
  );
}

export function statusLabel(status: string, t: (key: string) => string) {
  return (STATUS_KEYS as readonly string[]).includes(status) ? t(`analytics.status.${status}`) : status;
}

export function paymentLabel(method: string, t: (key: string) => string) {
  return (PAYMENT_KEYS as readonly string[]).includes(method) ? t(`analytics.payment.${method}`) : method;
}
