import { Filter, X } from "lucide-react";

import { EMPTY_FILTERS, type AnalyticsDataset, type AnalyticsFilters } from "./types";

const PAYMENT_LABELS: Record<string, [string, string]> = {
  cash: ["نقدي", "Cash"],
  card: ["بطاقة", "Card"],
  apple_pay: ["Apple Pay", "Apple Pay"],
  stc_pay: ["STC Pay", "STC Pay"],
  mada: ["مدى", "Mada"],
  bank_transfer: ["تحويل بنكي", "Bank Transfer"],
};

const STATUS_LABELS: Record<string, [string, string]> = {
  pending: ["قيد الانتظار", "Pending"],
  approved: ["مقبول", "Approved"],
  rejected: ["مرفوض", "Rejected"],
};

function Select({
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
    <label className="an-filter">
      <span>{label}</span>
      <select className="cs-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
  const set = (patch: Partial<AnalyticsFilters>) => onChange({ ...filters, ...patch });
  const name = (row: { name_ar: string | null; name_en: string | null }) =>
    (isAr ? row.name_ar || row.name_en : row.name_en || row.name_ar) ?? "—";
  const active = Object.values(filters).filter(Boolean).length;

  return (
    <section className="an-card an-filters">
      <header className="an-filters-head">
        <div>
          <Filter className="h-4 w-4" />
          <span>{isAr ? "الفلاتر" : "Filters"}</span>
          {active > 0 ? <em>{active}</em> : null}
        </div>
        {active > 0 ? (
          <button type="button" className="an-clear" onClick={() => onChange(EMPTY_FILTERS)}>
            <X className="h-3.5 w-3.5" />
            {isAr ? "مسح" : "Clear"}
          </button>
        ) : null}
      </header>

      <div className="an-filters-grid">
        <Select
          label={isAr ? "الفرع" : "Branch"}
          value={filters.branchId}
          onChange={(branchId) => set({ branchId })}
          placeholder={isAr ? "كل الفروع" : "All branches"}
          options={data.branches.map((row) => ({ value: row.id, label: name(row) }))}
        />
        <Select
          label={isAr ? "المشروب" : "Drink"}
          value={filters.drinkId}
          onChange={(drinkId) => set({ drinkId })}
          placeholder={isAr ? "كل المشروبات" : "All drinks"}
          options={data.drinks.map((row) => ({ value: row.id, label: name(row) }))}
        />
        <Select
          label={isAr ? "الباقة" : "Subscription Plan"}
          value={filters.planId}
          onChange={(planId) => set({ planId })}
          placeholder={isAr ? "كل الباقات" : "All plans"}
          options={data.plans.map((row) => ({ value: row.id, label: name(row) }))}
        />
        <Select
          label={isAr ? "الكاشير" : "Cashier"}
          value={filters.cashierId}
          onChange={(cashierId) => set({ cashierId })}
          placeholder={isAr ? "كل الموظفين" : "All cashiers"}
          options={data.cashiers.map((row) => ({ value: row.id, label: row.name }))}
        />
        <Select
          label={isAr ? "العميل" : "Customer"}
          value={filters.customerId}
          onChange={(customerId) => set({ customerId })}
          placeholder={isAr ? "كل العملاء" : "All customers"}
          options={data.customerOptions.map((row) => ({ value: row.id, label: row.name }))}
        />
        <label className="an-filter">
          <span>{isAr ? "الكوبون" : "Coupon"}</span>
          <input
            className="cs-input"
            value={filters.couponCode}
            placeholder={isAr ? "ابحث بالكود" : "Search code"}
            onChange={(event) => set({ couponCode: event.target.value })}
          />
        </label>
        <Select
          label={isAr ? "طريقة الدفع" : "Payment Method"}
          value={filters.paymentMethod}
          onChange={(paymentMethod) => set({ paymentMethod })}
          placeholder={isAr ? "كل الطرق" : "All methods"}
          options={data.paymentMethods.map((value) => ({
            value,
            label: (isAr ? PAYMENT_LABELS[value]?.[0] : PAYMENT_LABELS[value]?.[1]) ?? value,
          }))}
        />
        <Select
          label={isAr ? "الحالة" : "Status"}
          value={filters.status}
          onChange={(status) => set({ status })}
          placeholder={isAr ? "كل الحالات" : "All statuses"}
          options={Object.keys(STATUS_LABELS).map((value) => ({
            value,
            label: (isAr ? STATUS_LABELS[value]?.[0] : STATUS_LABELS[value]?.[1]) ?? value,
          }))}
        />
      </div>
    </section>
  );
}

export function statusLabel(status: string, isAr: boolean) {
  return (isAr ? STATUS_LABELS[status]?.[0] : STATUS_LABELS[status]?.[1]) ?? status;
}

export function paymentLabel(method: string, isAr: boolean) {
  return (isAr ? PAYMENT_LABELS[method]?.[0] : PAYMENT_LABELS[method]?.[1]) ?? method;
}