import { useEffect, useState } from "react";
import { Building2, Pencil, ShieldCheck, ShieldOff, Trash2, Users, CreditCard, LifeBuoy } from "lucide-react";
import { Button, Input, Modal } from "@/components/kob";
import {
  getCompany, getCompanyCounts, listCompanyBranches, listCompanyMembers,
  type CompanyMember, type CompanyRow,
} from "@/services/platform/companies.service";
import { deleteCompany, setCompanyStatusFn, updateCompany } from "@/lib/platform-companies.functions";

type Props = { companyId: string | null; onClose: () => void; onChanged: () => void };

export function CompanyDetailsModal({ companyId, onClose, onChanged }: Props) {
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
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر التحميل"); }
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
    } catch (e) { setError(e instanceof Error ? e.message : "فشلت العملية"); }
    finally { setBusy(null); }
  }

  const active = company?.status === "active";
  const name = company?.name_ar || company?.name_en || "";

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
              <Button variant="ghost" onClick={() => setEditing(false)}>إلغاء</Button>
              <Button variant="gold" loading={busy === "save"} onClick={() => run("save", () => updateCompany({ data: { id: company.id, ...form } }))}>حفظ التعديلات</Button>
            </>
          ) : (
            <>
              <Button variant="danger" onClick={() => setConfirmDelete(confirmDelete ? "" : " ")}><Trash2 /> حذف</Button>
              <span style={{ flex: 1 }} />
              <Button variant="secondary" loading={busy === "status"}
                onClick={() => { if (confirm(active ? "تأكيد إيقاف الشركة؟" : "تأكيد تنشيط الشركة؟")) void run("status", () => setCompanyStatusFn({ data: { id: company.id, status: active ? "suspended" : "active" } })); }}>
                {active ? <><ShieldOff /> إيقاف التنشيط</> : <><ShieldCheck /> تنشيط</>}
              </Button>
              <Button variant="gold" onClick={() => setEditing(true)}><Pencil /> تعديل البيانات</Button>
            </>
          )}
        </div>
      )}
    >
      {error && <div className="platform-auth-error">{error}</div>}
      {!company ? <div className="platform-empty">جارٍ التحميل…</div> : (
        <div className="pc-body">
          <div className="pc-head">
            <span className={`platform-status ${company.status}`}>
              {active ? <ShieldCheck /> : <ShieldOff />}{active ? "نشطة" : "موقوفة"}
            </span>
            <small>منذ {new Date(company.created_at).toLocaleDateString("ar-SA")}</small>
          </div>

          <div className="pc-stats">
            <div><Building2 /><b>{counts.branches}</b><span>الفروع</span></div>
            <div><Users /><b>{counts.members}</b><span>الموظفون</span></div>
            <div><CreditCard /><b>{counts.activeSubscriptions}</b><span>اشتراكات نشطة</span></div>
            <div><LifeBuoy /><b>{counts.openCases}</b><span>تذاكر مفتوحة</span></div>
          </div>

          {editing ? (
            <div className="pc-form">
              <Input label="الاسم (عربي)" required value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
              <Input label="الاسم (English)" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
              <Input label="البريد" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          ) : (
            <dl className="pc-dl">
              <dt>الاسم (عربي)</dt><dd>{company.name_ar || "—"}</dd>
              <dt>الاسم (English)</dt><dd>{company.name_en || "—"}</dd>
              <dt>البريد</dt><dd>{company.email || "—"}</dd>
              <dt>الهاتف</dt><dd dir="ltr">{company.phone || "—"}</dd>
            </dl>
          )}

          <section className="pc-list">
            <h4>الفروع</h4>
            {!branches.length ? <p>لا توجد فروع.</p> : branches.map((b) => (
              <div key={b.id}><strong>{b.name_ar || b.name_en}</strong><span>{b.is_active ? "نشط" : "معطل"}</span></div>
            ))}
          </section>
          <section className="pc-list">
            <h4>الإدارة والموظفون</h4>
            {!members.length ? <p>لا يوجد موظفون.</p> : members.map((m) => (
              <div key={m.id}><strong>{m.profile?.full_name || "—"}<small>{m.profile?.email}</small></strong><span>{m.role}</span></div>
            ))}
          </section>

          {confirmDelete && (
            <div className="pc-danger">
              <p>سيتم حذف الشركة وكل فروعها واشتراكاتها وعملائها نهائياً. اكتب كود الشركة <code>{company.organization_code}</code> للتأكيد.</p>
              <input value={confirmDelete.trim()} onChange={(e) => setConfirmDelete(e.target.value || " ")} dir="ltr" />
              <Button variant="danger" loading={busy === "delete"} disabled={confirmDelete.trim().toUpperCase() !== company.organization_code.toUpperCase()}
                onClick={() => run("delete", () => deleteCompany({ data: { id: company.id } }), true)}>
                <Trash2 /> حذف نهائي
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
