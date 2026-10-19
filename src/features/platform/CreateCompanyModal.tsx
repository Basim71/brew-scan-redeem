import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check } from "lucide-react";
import { Modal } from "@/components/kob/Modal";
import { createCompanyWithManager } from "@/lib/platform-companies.functions";

const ERRORS: Record<string, string> = {
  code_taken: "كود الشركة مستخدم مسبقاً.",
  invalid_code: "كود الشركة يجب أن يكون 3 أحرف/أرقام على الأقل.",
  invalid_email: "البريد الإلكتروني غير صحيح.",
  weak_password: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
  email_taken: "البريد مستخدم بحساب آخر.",
  forbidden: "ليست لديك صلاحية إضافة شركات.",
  missing_name_ar: "اسم الشركة بالعربية مطلوب.",
  missing_manager_name: "اسم المدير مطلوب.",
  missing_email: "بريد المدير مطلوب.",
};

const randomCode = () => `KOB-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export function CreateCompanyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const create = useServerFn(createCompanyWithManager);
  const [f, setF] = useState({ nameAr: "", nameEn: "", code: randomCode(), phone: "", managerName: "", managerEmail: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const close = () => {
    setResult(null); setErr(null); setCopied(false);
    setF({ nameAr: "", nameEn: "", code: randomCode(), phone: "", managerName: "", managerEmail: "", password: "" });
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const r = await create({ data: f });
      setResult({ email: r.email, password: r.password });
      onCreated();
    } catch (x) {
      const m = x instanceof Error ? x.message : "";
      setErr(ERRORS[m] ?? (m || "تعذر إنشاء الشركة."));
    } finally { setBusy(false); }
  };

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/auth` : "/auth";
  const credText = result
    ? `بيانات دخول لوحة KOB\nالرابط: ${loginUrl}\nالبريد: ${result.email}\n${result.password ? `كلمة المرور: ${result.password}` : "كلمة المرور: كلمة مرور حسابك الحالي"}`
    : "";

  return (
    <Modal open={open} onClose={close} title={result ? "تم إنشاء الشركة" : "إضافة شركة جديدة"} size="lg">
      {result ? (
        <div className="platform-create-result" dir="rtl">
          <p>سلّم هذه البيانات لمدير الشركة ليدخل لوحة التحكم:</p>
          <pre>{credText}</pre>
          <div className="platform-create-actions">
            <button type="button" className="platform-primary-button" onClick={() => { navigator.clipboard.writeText(credText); setCopied(true); }}>
              {copied ? <Check /> : <Copy />} {copied ? "تم النسخ" : "نسخ بيانات الدخول"}
            </button>
            <button type="button" className="platform-secondary-button" onClick={close}>إغلاق</button>
          </div>
        </div>
      ) : (
        <form className="platform-create-form" dir="rtl" onSubmit={submit}>
          <h3>بيانات الشركة</h3>
          <div className="platform-create-grid">
            <label>الاسم بالعربية *<input required value={f.nameAr} onChange={set("nameAr")} /></label>
            <label>الاسم بالإنجليزية<input dir="ltr" value={f.nameEn} onChange={set("nameEn")} /></label>
            <label>كود الشركة *<input required dir="ltr" value={f.code} onChange={set("code")} /></label>
            <label>رقم الهاتف<input dir="ltr" value={f.phone} onChange={set("phone")} /></label>
          </div>
          <h3>بيانات مدير الشركة</h3>
          <div className="platform-create-grid">
            <label>الاسم الكامل *<input required value={f.managerName} onChange={set("managerName")} /></label>
            <label>البريد الإلكتروني *<input required type="email" dir="ltr" value={f.managerEmail} onChange={set("managerEmail")} /></label>
            <label className="wide">كلمة المرور (اتركها فارغة للتوليد التلقائي)<input dir="ltr" minLength={8} value={f.password} onChange={set("password")} /></label>
          </div>
          {err && <div className="platform-auth-error">{err}</div>}
          <div className="platform-create-actions">
            <button type="submit" className="platform-primary-button" disabled={busy}>{busy ? "جارٍ الإنشاء…" : "إنشاء الشركة"}</button>
            <button type="button" className="platform-secondary-button" onClick={close}>إلغاء</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
