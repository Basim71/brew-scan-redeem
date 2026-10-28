import { useEffect, useState } from "react";
import { Building2, Pencil, ShieldCheck, ShieldOff, Trash2, Users, CreditCard, LifeBuoy } from "lucide-react";
import { Button, Input, Modal } from "@/components/kob";
import {
  getCompany, getCompanyCounts, listCompanyBranches, listCompanyMembers,
  type CompanyMember, type CompanyRow,
} from "@/services/platform/companies.service";
import { useI18n } from "@/lib/i18n";
import { deleteCompany, setCompanyStatusFn, updateCompany } from "@/lib/platform-companies.functions";

type Props = { companyId: string | null; onClose: () => void; onChanged: () => void };

export function CompanyDetailsModal({ companyId, onClose, onChanged }: Props) {
  const { t, lang } = useI18n();
  const tr = (k: string, v?: Record<string, string | number>) => t("platform.companies." + k, v);
  const roleLabel = (r: string) => { const k = "platform.companies.role_" + r; const x = t(k); return x === k ? r : x; };
  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [counts, setCounts] = useState({ members: 0, branches: 0, activeSubscriptions: 0, openCases: 0 });
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ nameAr: "", nameEn: "", email: "", phone: "" });
  const [busy, setBusy] = useState<null | "save" | "status" | "delete">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  async function load(id: string) {
    try {
      const [c, ct, m, b] = await Promise.all([getCompany(id), getCompanyCounts(id), listCompanyMembers(id), listCompanyBranches(id)]);
      setCompany(c); setCounts(ct); setMembers(m); setBranches(b);
      if (c) setForm({ nameAr: c.name_ar ?? "", nameEn: c.name_en ?? "", email: c.email ?? "", phone: c.phone ?? "" });
    } catch (e) { setError(e instanceof Error ? e.message : tr("load_failed")); }
  }

  useEffect(() => {
    setCompany(null); setEditing(false); setError(null); setConfirmDelete("");
    if (companyId) void load(companyId);
  }, [companyId]);

  async function run(kind: "save" | "status" | "delete", fn: () => Promise<unknown>, close = false) {
    setBusy(kind); setError(null);
    try {
      await fn(); onChanged();
      if (close) onClose(); else if (companyId) await load(companyId);
      setEditing(false);
    } catch (e) { setError(e instanceof Error ? e.message : tr("op_failed")); }
    finally { setBusy(null); }
  }

  const active = company?.status === "active";
  const name = (lang === "ar" ? company?.name_ar || company?.name_en : company?.name_en || company?.name_ar) || "";

  return (
    <Modal
      open={!!companyId}
      onClose={onClose}
      size="lg"
      title={company ? name : "…"}
      description={company ? <code>{company.organization_code}</code> : undefined}
      footer={company && (
        <div className="pc-actions">
          {editing ? (
            <>
              <Button variant="ghost" onClick={() => setEditing(false)}>{tr("cancel")}</Button>
              <Button variant="gold" loading={busy === "save"} onClick={() => run("save", () => updateCompany({ data: { id: company.id, ...form } }))}>{tr("save")}</Button>
            </>
          ) : (
            <>
              <Button variant="danger" onClick={() => setConfirmDelete(confirmDelete ? "" : " ")}><Trash2 /> {tr("delete")}</Button>
              <span style={{ flex: 1 }} />
              <Button variant="secondary" loading={busy === "status"}
                onClick={() => { if (confirm(tr(active ? "confirm_suspend" : "confirm_activate"))) void run("status", () => setCompanyStatusFn({ data: { id: company.id, status: active ? "suspended" : "active" } })); }}>
                {active ? <><ShieldOff /> {tr("suspend")}</> : <><ShieldCheck /> {tr("activate")}</>}
              </Button>
              <Button variant="gold" onClick={() => setEditing(true)}><Pencil /> {tr("edit")}</Button>
            </>
          )}
        </div>
      )}
    >
      {error && <div className="platform-auth-error">{error}</div>}
      {!company ? <div className="platform-empty">{tr("loading")}</div> : (
        <div className="pc-body">
          <div className="pc-head">
            <span className={`platform-status ${company.status}`}>
              {active ? <ShieldCheck /> : <ShieldOff />}{tr(active ? "active" : "suspended")}
            </span>
            <small>{tr("since", { date: new Date(company.created_at).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US") })}</small>
          </div>

          <div className="pc-stats">
            <div><Building2 /><b>{counts.branches}</b><span>{tr("branches")}</span></div>
            <div><Users /><b>{counts.members}</b><span>{tr("members")}</span></div>
            <div><CreditCard /><b>{counts.activeSubscriptions}</b><span>{tr("subs")}</span></div>
            <div><LifeBuoy /><b>{counts.openCases}</b><span>{tr("tickets")}</span></div>
          </div>

          {editing ? (
            <div className="pc-form">
              <Input label={tr("name_ar")} required value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              <Input label={tr("name_en")} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              <Input label={tr("email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label={tr("phone")} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          ) : (
            <dl className="pc-dl">
              <dt>{tr("name_ar")}</dt><dd>{company.name_ar || "—"}</dd>
              <dt>{tr("name_en")}</dt><dd>{company.name_en || "—"}</dd>
              <dt>{tr("email")}</dt><dd>{company.email || "—"}</dd>
              <dt>{tr("phone")}</dt><dd dir="ltr">{company.phone || "—"}</dd>
            </dl>
          )}

          <section className="pc-list">
            <h4>{tr("branches")}</h4>
            {!branches.length ? <p>{tr("no_branches")}</p> : branches.map((b) => (
              <div key={b.id}><strong>{b.name_ar || b.name_en}</strong><span>{tr(b.is_active ? "branch_on" : "branch_off")}</span></div>
            ))}
          </section>
          <section className="pc-list">
            <h4>{tr("staff_title")}</h4>
            {!members.length ? <p>{tr("no_members")}</p> : members.map((m) => (
              <div key={m.id}><strong>{m.profile?.full_name || "—"}<small>{m.profile?.email}</small></strong><span>{roleLabel(m.role)}</span></div>
            ))}
          </section>

          {confirmDelete && (
            <div className="pc-danger">
              <p>{tr("delete_warn")} <code>{company.organization_code}</code></p>
              <input value={confirmDelete.trim()} onChange={(e) => setConfirmDelete(e.target.value || " ")} dir="ltr" />
              <Button variant="danger" loading={busy === "delete"} disabled={confirmDelete.trim().toUpperCase() !== company.organization_code.toUpperCase()}
                onClick={() => run("delete", () => deleteCompany({ data: { id: company.id } }), true)}>
                <Trash2 /> {tr("delete_final")}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
