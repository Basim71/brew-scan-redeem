import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";

import { listSettingsAudit, type SettingsAuditRow } from "@/services/company/company-settings.service";
import {
  Badge,
  DataTable,
  EmptyState,
  LoadingState,
  NoResultsState,
  SearchInput,
  SideDrawer,
  StatCard,
  StatGrid,
  type Column,
} from "@/components/kob";
import { Card } from "./parts";
import type { SectionProps } from "./types";

const SECURITY_SECTIONS = new Set(["security", "employees"]);

export function AuditLogSection({ organizationId, isAr, isOwner }: SectionProps) {
  const audit = useQuery({
    queryKey: ["company-settings-audit", organizationId],
    enabled: isOwner,
    queryFn: () => listSettingsAudit(organizationId, 200),
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SettingsAuditRow | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = audit.data ?? [];
    if (!term) return all;
    return all.filter((r) =>
      [r.section, r.field, r.old_value, r.new_value].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [audit.data, search]);

  const securityCount = (audit.data ?? []).filter((r) => SECURITY_SECTIONS.has(r.section)).length;

  if (!isOwner)
    return (
      <div className="flex flex-col gap-4">
        <Card title={isAr ? "سجل التغييرات" : "Audit log"}>
          <EmptyState
            title={isAr ? "غير متاح" : "Not available"}
            description={isAr ? "سجل التغييرات متاح لمالك الشركة فقط." : "The audit log is available to the company owner only."}
          />
        </Card>
      </div>
    );

  const fmt = (v: string | null) => (v === null ? "—" : v.length > 48 ? `${v.slice(0, 48)}…` : v);
  const formatDate = (d: string) => new Date(d).toLocaleString(isAr ? "ar-SA" : "en-GB");

  const columns: Column<SettingsAuditRow>[] = [
    {
      key: "timestamp",
      header: isAr ? "التاريخ" : "Timestamp",
      render: (row) => (
        <button type="button" className="text-sm font-medium text-accent underline-offset-2 hover:underline" onClick={() => setSelected(row)}>
          {formatDate(row.created_at)}
        </button>
      ),
    },
    {
      key: "section",
      header: isAr ? "القسم" : "Section",
      render: (row) => (
        <Badge tone={SECURITY_SECTIONS.has(row.section) ? "warning" : "neutral"} icon={SECURITY_SECTIONS.has(row.section) ? <ShieldAlert className="h-3 w-3" /> : undefined}>
          {row.section}
        </Badge>
      ),
    },
    {
      key: "field",
      header: isAr ? "الحقل" : "Field",
      render: (row) => <b>{row.field}</b>,
    },
    {
      key: "change",
      header: isAr ? "التغيير" : "Change",
      render: (row) => (
        <span>
          {fmt(row.old_value)} → {fmt(row.new_value)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card title={isAr ? "لوحة السجل" : "Audit overview"}>
        <StatGrid>
          <StatCard label={isAr ? "تغييرات مسجّلة" : "Recorded changes"} value={(audit.data ?? []).length} />
          <StatCard
            label={isAr ? "أحداث أمنية" : "Security events"}
            value={securityCount}
            icon={<ShieldAlert className="h-4 w-4" />}
            tone={securityCount > 0 ? "warning" : "neutral"}
          />
        </StatGrid>
      </Card>

      <Card title={isAr ? "الخط الزمني" : "Timeline"}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder={isAr ? "ابحث في السجل" : "Search the log"}
            label={isAr ? "ابحث في السجل" : "Search the log"}
          />
        </div>
        {audit.isLoading ? (
          <LoadingState label={isAr ? "جارٍ التحميل…" : "Loading…"} />
        ) : (audit.data ?? []).length === 0 ? (
          <EmptyState title={isAr ? "لا توجد تغييرات بعد." : "No changes recorded yet."} />
        ) : rows.length === 0 ? (
          <NoResultsState
            title={isAr ? "لا توجد نتائج" : "No results"}
            description={isAr ? "جرّب كلمة بحث مختلفة." : "Try a different search term."}
          />
        ) : (
          <DataTable
            caption={isAr ? "سجل التغييرات" : "Audit log"}
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
          />
        )}
      </Card>

      <SideDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.field ?? ""}
        description={selected ? formatDate(selected.created_at) : undefined}
      >
        {selected ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt>{isAr ? "القسم" : "Section"}</dt>
            <dd>{selected.section}</dd>
            <dt>{isAr ? "التاريخ" : "When"}</dt>
            <dd>{formatDate(selected.created_at)}</dd>
            <dt>{isAr ? "القيمة السابقة" : "Old value"}</dt>
            <dd><code>{selected.old_value ?? "—"}</code></dd>
            <dt>{isAr ? "القيمة الجديدة" : "New value"}</dt>
            <dd><code>{selected.new_value ?? "—"}</code></dd>
          </dl>
        ) : null}
      </SideDrawer>
    </div>
  );
}
