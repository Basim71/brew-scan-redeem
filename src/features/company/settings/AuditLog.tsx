import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
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
        <Card title={t("settings.audit.auditLog")}>
          <EmptyState
            title={t("settings.audit.notAvailable")}
            description={t("settings.audit.theAuditLogIsAvailableTo")}
          />
        </Card>
      </div>
    );

  const fmt = (v: string | null) => (v === null ? "—" : v.length > 48 ? `${v.slice(0, 48)}…` : v);
  const formatDate = (d: string) => new Date(d).toLocaleString(isAr ? "ar-SA" : "en-GB");

  const columns: Column<SettingsAuditRow>[] = [
    {
      key: "timestamp",
      header: t("settings.audit.timestamp"),
      render: (row) => (
        <button type="button" className="text-sm font-medium text-accent underline-offset-2 hover:underline" onClick={() => setSelected(row)}>
          {formatDate(row.created_at)}
        </button>
      ),
    },
    {
      key: "section",
      header: t("settings.audit.section"),
      render: (row) => (
        <Badge tone={SECURITY_SECTIONS.has(row.section) ? "warning" : "neutral"} icon={SECURITY_SECTIONS.has(row.section) ? <ShieldAlert className="h-3 w-3" /> : undefined}>
          {row.section}
        </Badge>
      ),
    },
    {
      key: "field",
      header: t("settings.audit.field"),
      render: (row) => <b>{row.field}</b>,
    },
    {
      key: "change",
      header: t("settings.audit.change"),
      render: (row) => (
        <span>
          {fmt(row.old_value)} → {fmt(row.new_value)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card title={t("settings.audit.auditOverview")}>
        <StatGrid>
          <StatCard label={t("settings.audit.recordedChanges")} value={(audit.data ?? []).length} />
          <StatCard
            label={t("settings.audit.securityEvents")}
            value={securityCount}
            icon={<ShieldAlert className="h-4 w-4" />}
            tone={securityCount > 0 ? "warning" : "neutral"}
          />
        </StatGrid>
      </Card>

      <Card title={t("settings.audit.timeline")}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder={t("settings.audit.searchTheLog")}
            label={t("settings.audit.searchTheLog")}
          />
        </div>
        {audit.isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : (audit.data ?? []).length === 0 ? (
          <EmptyState title={t("settings.audit.noChangesRecordedYet")} />
        ) : rows.length === 0 ? (
          <NoResultsState
            title={t("settings.audit.noResults")}
            description={t("settings.audit.tryADifferentSearchTerm")}
          />
        ) : (
          <DataTable
            caption={t("settings.audit.auditLog")}
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
            <dt>{t("settings.audit.section")}</dt>
            <dd>{selected.section}</dd>
            <dt>{t("settings.audit.when")}</dt>
            <dd>{formatDate(selected.created_at)}</dd>
            <dt>{t("settings.audit.oldValue")}</dt>
            <dd><code>{selected.old_value ?? "—"}</code></dd>
            <dt>{t("settings.audit.newValue")}</dt>
            <dd><code>{selected.new_value ?? "—"}</code></dd>
          </dl>
        ) : null}
      </SideDrawer>
    </div>
  );
}
