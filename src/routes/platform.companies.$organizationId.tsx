import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Building2, ShieldCheck, ShieldOff } from "lucide-react";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX, canManageCompanyStatus } from "@/features/platform/access";
import {
  getCompany,
  getCompanyCounts,
  listCompanyBranches,
  listCompanyMembers,
  setCompanyStatus,
  type CompanyRow,
  type CompanyMember,
} from "@/services/platform/companies.service";
import { usePlatform } from "@/providers/PlatformProvider";

export const Route = createFileRoute("/platform/companies/$organizationId")({ component: CompanyDetails });

type Tab = "overview" | "members" | "branches";

function CompanyDetails() {
  const { organizationId } = Route.useParams() as { organizationId: string };
  const { profile } = usePlatform();
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [counts, setCounts] = useState({ members: 0, branches: 0, activeSubscriptions: 0, openCases: 0 });
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    try {
      const [c, ct, m, b] = await Promise.all([
        getCompany(organizationId),
        getCompanyCounts(organizationId),
        listCompanyMembers(organizationId),
        listCompanyBranches(organizationId),
      ]);
      setCompany(c);
      setCounts(ct);
      setMembers(m);
      setBranches(b);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الشركة");
    }
  }

  useEffect(() => { void reload(); }, [organizationId]);

  async function toggleStatus() {
    if (!company) return;
    const next = company.status === "active" ? "suspended" : "active";
    if (!confirm(next === "suspended" ? "تأكيد إيقاف الشركة؟" : "تأكيد تفعيل الشركة؟")) return;
    setSaving(true);
    try { await setCompanyStatus(company.id, next); await reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "فشلت العملية"); }
    finally { setSaving(false); }
  }

  const canManage = canManageCompanyStatus(profile?.role);

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/companies"]}>
      <div className="platform-page" dir="rtl">
        <div style={{ marginBottom: 12 }}>
          <Link to="/platform/companies" className="platform-secondary-button"><ArrowRight /> الرجوع للشركات</Link>
        </div>
        {error && <div className="platform-auth-error">{error}</div>}
        {!company ? <div className="platform-empty">جارٍ التحميل…</div> : (
          <>
            <header className="platform-page-header">
              <div>
                <span>{company.organization_code}</span>
                <h1>{company.name_ar || company.name_en}</h1>
                <p>{company.name_ar && company.name_en ? company.name_en : "—"}</p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className={`platform-status ${company.status}`}>
                  {company.status === "active" ? <ShieldCheck /> : <ShieldOff />}
                  {company.status === "active" ? "نشطة" : "موقوفة"}
                </span>
                {canManage && (
                  <Button variant="primary" loading={saving} onClick={toggleStatus}>
                    {company.status === "active" ? "إيقاف" : "تفعيل"}
                  </Button>
                )}
              </div>
            </header>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <article><Building2 /><div><b>{counts.branches}</b><span>الفروع</span></div></article>
              <article><ShieldCheck /><div><b>{counts.members}</b><span>الأعضاء</span></div></article>
              <article><div><b>{counts.activeSubscriptions}</b><span>اشتراكات نشطة</span></div></article>
              <article><div><b>{counts.openCases}</b><span>حالات مفتوحة</span></div></article>
            </section>

            <div className="platform-toolbar">
              <div className="support-tabs">
                {(["overview", "members", "branches"] as Tab[]).map((t) => (
                  <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
                    {t === "overview" ? "نظرة عامة" : t === "members" ? "الأعضاء" : "الفروع"}
                  </button>
                ))}
              </div>
            </div>

            {tab === "overview" && (
              <div className="platform-table-wrap">
                <dl className="platform-dl">
                  <dt>الكود</dt><dd><code>{company.organization_code}</code></dd>
                  <dt>الاسم (عربي)</dt><dd>{company.name_ar || "—"}</dd>
                  <dt>الاسم (English)</dt><dd>{company.name_en || "—"}</dd>
                  <dt>البريد</dt><dd>{company.email || "—"}</dd>
                  <dt>الهاتف</dt><dd>{company.phone || "—"}</dd>
                  <dt>تاريخ الإنشاء</dt><dd>{new Date(company.created_at).toLocaleString("ar-SA")}</dd>
                </dl>
              </div>
            )}

            {tab === "members" && (
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead><tr><th>العضو</th><th>الدور</th><th>الحالة</th><th>الفرع</th><th>تاريخ الانضمام</th></tr></thead>
                  <tbody>
                    {!members.length && <tr><td colSpan={5}>لا يوجد أعضاء.</td></tr>}
                    {members.map((m) => (
                      <tr key={m.id}>
                        <td><strong>{m.profile?.full_name || "—"}</strong><small>{m.profile?.email}</small></td>
                        <td>{m.role}</td>
                        <td>{m.status}</td>
                        <td>{m.branch_id ? <code>{m.branch_id.slice(0, 8)}</code> : "—"}</td>
                        <td>{new Date(m.created_at).toLocaleDateString("ar-SA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === "branches" && (
              <div className="platform-table-wrap">
                <table className="platform-table">
                  <thead><tr><th>الفرع</th><th>الحالة</th><th>تاريخ الإنشاء</th></tr></thead>
                  <tbody>
                    {!branches.length && <tr><td colSpan={3}>لا توجد فروع.</td></tr>}
                    {branches.map((b) => (
                      <tr key={b.id}>
                        <td><strong>{b.name_ar || b.name_en}</strong>{b.name_ar && b.name_en && <small>{b.name_en}</small>}</td>
                        <td>{b.is_active ? "نشط" : "معطل"}</td>
                        <td>{new Date(b.created_at).toLocaleDateString("ar-SA")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </PlatformGate>
  );
}