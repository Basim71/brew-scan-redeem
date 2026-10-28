import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { CreateCompanyModal } from "@/features/platform/CreateCompanyModal";
import { CompanyDetailsModal } from "@/features/platform/CompanyDetailsModal";
import { ROLE_MATRIX } from "@/features/platform/access";
import { useI18n } from "@/lib/i18n";
import { listCompanies, type CompanyRow } from "@/services/platform/companies.service";

export const Route = createFileRoute("/platform/companies")({ component: Companies });

function Companies() {
  const { t, lang } = useI18n();
  const tr = (k: string) => t("platform.companies." + k);
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listCompanies()
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : tr("error")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tick]);

  const filtered = useMemo(() => rows.filter((x) => {
    const matches = !q || `${x.name_ar ?? ""} ${x.name_en ?? ""} ${x.organization_code}`.toLowerCase().includes(q.toLowerCase());
    const s = status === "all" || (status === "active" ? x.status === "active" : x.status !== "active");
    return matches && s;
  }), [rows, q, status]);

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/companies"]}>
      <div className="platform-page" dir={lang === "ar" ? "rtl" : "ltr"}>
        <header className="platform-page-header">
          <div>
            <span>{tr("eyebrow")}</span>
            <h1>{tr("title")}</h1>
            <p>{tr("lead")}</p>
          </div>
          <button type="button" className="platform-primary-button" onClick={() => setCreating(true)}>
            <Plus /> {tr("add")}
          </button>
        </header>
        <CompanyDetailsModal companyId={openId} onClose={() => setOpenId(null)} onChanged={() => setTick((t) => t + 1)} />
        <CreateCompanyModal open={creating} onClose={() => setCreating(false)} onCreated={() => setTick((t) => t + 1)} />
        <div className="platform-toolbar">
          <label><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("search")} /></label>
          <div className="support-tabs">
            {(["all", "active", "suspended"] as const).map((s) => (
              <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
                {tr(s)}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="platform-auth-error">{error}</div>}
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead><tr><th>{tr("col_company")}</th><th>{tr("col_code")}</th><th>{tr("col_status")}</th><th>{tr("col_created")}</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={4}>{tr("loading")}</td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={4}>{tr("empty")}</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="pc-row" onClick={() => setOpenId(c.id)}>
                  <td><button type="button" className="pc-name" onClick={(e) => { e.stopPropagation(); setOpenId(c.id); }}><strong>{(lang === "ar" ? c.name_ar || c.name_en : c.name_en || c.name_ar)}</strong></button><small>{c.name_ar && c.name_en ? (lang === "ar" ? c.name_en : c.name_ar) : ""}</small></td>
                  <td><code>{c.organization_code}</code></td>
                  <td>
                    <span className={`platform-status ${c.status}`}>
                      {c.status === "active" ? <ShieldCheck /> : <ShieldOff />}
                      {tr(c.status === "active" ? "active" : "suspended")}
                    </span>
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformGate>
  );
}
