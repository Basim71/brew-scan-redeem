import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, ShieldAlert, X } from "lucide-react";

import { listSettingsAudit, type SettingsAuditRow } from "@/services/company/company-settings.service";
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
      <div className="cs-stack">
        <Card title={isAr ? "سجل التغييرات" : "Audit log"}>
          <div className="cs-empty">
            {isAr ? "سجل التغييرات متاح لمالك الشركة فقط." : "The audit log is available to the company owner only."}
          </div>
        </Card>
      </div>
    );

  const fmt = (v: string | null) => (v === null ? "—" : v.length > 48 ? `${v.slice(0, 48)}…` : v);

  return (
    <div className="cs-stack">
      <Card title={isAr ? "لوحة السجل" : "Audit overview"}>
        <div className="cs-audit-stats">
          <article>
            <b>{(audit.data ?? []).length}</b>
            <span>{isAr ? "تغييرات مسجّلة" : "Recorded changes"}</span>
          </article>
          <article>
            <b>{securityCount}</b>
            <span>
              <ShieldAlert className="h-3.5 w-3.5" /> {isAr ? "أحداث أمنية" : "Security events"}
            </span>
          </article>
        </div>
      </Card>

      <Card title={isAr ? "الخط الزمني" : "Timeline"}>
        <div className="cs-toolbar">
          <label className="cs-search-field">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              placeholder={isAr ? "ابحث في السجل" : "Search the log"}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        {audit.isLoading ? (
          <div className="cs-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-empty">{isAr ? "لا توجد تغييرات بعد." : "No changes recorded yet."}</div>
        ) : (
          <ol className="cs-timeline">
            {rows.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => setSelected(row)}>
                  <time>{new Date(row.created_at).toLocaleString(isAr ? "ar-SA" : "en-GB")}</time>
                  <b>{row.field}</b>
                  <span className="cs-timeline-section" data-security={SECURITY_SECTIONS.has(row.section) ? "true" : "false"}>
                    {row.section}
                  </span>
                  <span className="cs-timeline-diff">
                    {fmt(row.old_value)} → {fmt(row.new_value)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {selected ? (
        <div className="cs-drawer-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <aside className="cs-drawer" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header>
              <b>{selected.field}</b>
              <button type="button" className="cs-ghost-btn" onClick={() => setSelected(null)} aria-label={isAr ? "إغلاق" : "Close"}>
                <X className="h-4 w-4" />
              </button>
            </header>
            <dl>
              <dt>{isAr ? "القسم" : "Section"}</dt>
              <dd>{selected.section}</dd>
              <dt>{isAr ? "التاريخ" : "When"}</dt>
              <dd>{new Date(selected.created_at).toLocaleString(isAr ? "ar-SA" : "en-GB")}</dd>
              <dt>{isAr ? "القيمة السابقة" : "Old value"}</dt>
              <dd><code>{selected.old_value ?? "—"}</code></dd>
              <dt>{isAr ? "القيمة الجديدة" : "New value"}</dt>
              <dd><code>{selected.new_value ?? "—"}</code></dd>
            </dl>
          </aside>
        </div>
      ) : null}
    </div>
  );
}