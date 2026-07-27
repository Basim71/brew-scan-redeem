import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { listCompanies, type CompanyRow } from "@/services/platform/companies.service";

export const Route = createFileRoute("/platform/companies")({ component: Companies });

function Companies() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    listCompanies()
      .then((r) => { if (alive) setRows(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "خطأ"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => rows.filter((x) => {
    const matches = !q || `${x.name_ar ?? ""} ${x.name_en ?? ""} ${x.organization_code}`.toLowerCase().includes(q.toLowerCase());
    const s = status === "all" || (status === "active" ? x.status === "active" : x.status !== "active");
    return matches && s;
  }), [rows, q, status]);

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/companies"]}>
      <div className="platform-page" dir="rtl">
        <header className="platform-page-header">
          <div>
            <span>Organizations</span>
            <h1>الشركات</h1>
            <p>إدارة جميع الشركات المشتركة في منصة KOB.</p>
          </div>
          <Building2 />
        </header>
        <div className="platform-toolbar">
          <label><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو كود الشركة" /></label>
          <div className="support-tabs">
            {(["all", "active", "suspended"] as const).map((s) => (
              <button key={s} className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
                {s === "all" ? "الكل" : s === "active" ? "نشطة" : "موقوفة"}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="platform-auth-error">{error}</div>}
        <div className="platform-table-wrap">
          <table className="platform-table">
            <thead><tr><th>الشركة</th><th>الكود</th><th>الحالة</th><th>تاريخ الإنشاء</th><th></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5}>جارٍ التحميل…</td></tr>}
              {!loading && !filtered.length && <tr><td colSpan={5}>لا توجد شركات مطابقة.</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name_ar || c.name_en}</strong><small>{c.name_ar && c.name_en ? c.name_en : ""}</small></td>
                  <td><code>{c.organization_code}</code></td>
                  <td>
                    <span className={`platform-status ${c.status}`}>
                      {c.status === "active" ? <ShieldCheck /> : <ShieldOff />}
                      {c.status === "active" ? "نشطة" : "موقوفة"}
                    </span>
                  </td>
                  <td>{new Date(c.created_at).toLocaleDateString("ar-SA")}</td>
                  <td>
                    <Link to="/platform/companies/$organizationId" params={{ organizationId: c.id }} className="platform-secondary-button">فتح</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformGate>
  );
}
