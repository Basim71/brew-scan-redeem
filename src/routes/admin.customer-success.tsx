import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CalendarClock, CheckCircle2, Headphones, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/components/tenant/OrganizationProvider";
import { createCase, listCases } from "@/modules/customer-success/api";
import { caseStatusLabels, priorityLabels, type CustomerSuccessCase } from "@/modules/customer-success/types";

export const Route = createFileRoute("/admin/customer-success" as any)({ component: CustomerSuccessPage });

const emptyForm = {
  category: "technical",
  priority: "medium",
  title: "",
  description: "",
  sessionPreference: "none",
  scheduledAt: "",
  allowView: true,
  allowTemporaryEdit: false,
  allowVoice: false,
  allowRecording: false,
};

function CustomerSuccessPage() {
  const navigate = useNavigate();
  const { organization, membership } = useOrganization();
  const [cases, setCases] = useState<CustomerSuccessCase[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    if (!organization) return;
    try { setCases(await listCases(organization.id)); } catch (e) { setError(e instanceof Error ? e.message : "تعذر تحميل الحالات"); }
  }

  useEffect(() => {
    void load();
    if (!organization) return;
    const channel = supabase.channel(`customer-success-${organization.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_cases", filter: `organization_id=eq.${organization.id}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [organization?.id]);

  const stats = useMemo(() => ({
    open: cases.filter((item) => !["closed", "cancelled"].includes(item.status)).length,
    waiting: cases.filter((item) => item.status === "waiting_company").length,
    scheduled: cases.filter((item) => item.status === "scheduled").length,
    resolved: cases.filter((item) => ["resolved", "closed"].includes(item.status)).length,
  }), [cases]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!organization || !membership) return;
    setCreating(true); setError(null);
    try {
      const created = await createCase({
        organizationId: organization.id,
        createdByMemberId: membership.id,
        ...form,
        scheduledAt: form.sessionPreference === "scheduled" ? form.scheduledAt : null,
      });
      setForm(emptyForm); setOpen(false); await load();
      navigate({ to: "/admin/customer-success/$caseId" as any, params: { caseId: created.id } as any });
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء الحالة"); }
    finally { setCreating(false); }
  }

  return <div className="cs-page" dir="rtl">
    <header className="cs-hero"><div><span>Customer Success</span><h1>الدعم ونجاح العملاء</h1><p>أنشئ حالة دعم أو تدريب، تابع الموافقات والجلسات، واحتفظ بتاريخ كامل لكل مشكلة.</p></div><button className="cs-primary" onClick={() => setOpen((v) => !v)}><MessageSquarePlus/> حالة جديدة</button></header>
    {error && <div className="cs-error"><AlertCircle/>{error}</div>}
    <section className="cs-stats">
      <article><Headphones/><div><b>{stats.open}</b><span>حالات مفتوحة</span></div></article>
      <article><ShieldCheck/><div><b>{stats.waiting}</b><span>بانتظار موافقتكم</span></div></article>
      <article><CalendarClock/><div><b>{stats.scheduled}</b><span>جلسات مجدولة</span></div></article>
      <article><CheckCircle2/><div><b>{stats.resolved}</b><span>تم حلها</span></div></article>
    </section>
    {open && <form className="cs-form" onSubmit={submit}>
      <h2>إنشاء حالة جديدة</h2>
      <div className="cs-form-grid">
        <label>نوع الطلب<select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value})}><option value="technical">مشكلة تقنية</option><option value="training">تدريب</option><option value="feature_request">طلب ميزة</option><option value="billing">الفوترة</option><option value="branch_setup">إعداد فرع</option><option value="pos_integration">ربط POS</option><option value="other">أخرى</option></select></label>
        <label>الأولوية<select value={form.priority} onChange={(e)=>setForm({...form,priority:e.target.value})}><option value="critical">حرجة</option><option value="high">مرتفعة</option><option value="medium">متوسطة</option><option value="low">منخفضة</option></select></label>
        <label className="wide">العنوان<input required maxLength={160} value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})}/></label>
        <label className="wide">الوصف<textarea required rows={5} value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></label>
        <label>نوع المساعدة<select value={form.sessionPreference} onChange={(e)=>setForm({...form,sessionPreference:e.target.value})}><option value="none">بدون جلسة</option><option value="chat">محادثة</option><option value="voice">صوت</option><option value="scheduled">موعد مجدول</option><option value="immediate">مساعدة فورية</option></select></label>
        {form.sessionPreference === "scheduled" && <label>الموعد<input type="datetime-local" required value={form.scheduledAt} onChange={(e)=>setForm({...form,scheduledAt:e.target.value})}/></label>}
      </div>
      <div className="cs-permissions">
        <label><input type="checkbox" checked={form.allowView} onChange={(e)=>setForm({...form,allowView:e.target.checked})}/> السماح بالمشاهدة</label>
        <label><input type="checkbox" checked={form.allowTemporaryEdit} onChange={(e)=>setForm({...form,allowTemporaryEdit:e.target.checked})}/> السماح بالتعديل المؤقت</label>
        <label><input type="checkbox" checked={form.allowVoice} onChange={(e)=>setForm({...form,allowVoice:e.target.checked})}/> السماح بالصوت</label>
        <label><input type="checkbox" checked={form.allowRecording} onChange={(e)=>setForm({...form,allowRecording:e.target.checked})}/> السماح بالتسجيل</label>
      </div>
      <div className="cs-actions"><button type="button" onClick={()=>setOpen(false)}>إلغاء</button><button className="cs-primary" disabled={creating}>{creating?"جارٍ الإنشاء...":"إنشاء الحالة"}</button></div>
    </form>}
    <section className="cs-list"><div className="cs-section-title"><h2>حالات الشركة</h2><span>{cases.length} حالة</span></div>
      {cases.map((item)=><button key={item.id} className="cs-case" onClick={()=>navigate({to:"/admin/customer-success/$caseId" as any,params:{caseId:item.id} as any})}>
        <div><b>{item.caseNumber}</b><h3>{item.title}</h3><p>{item.description}</p></div>
        <div className="cs-case-meta"><span className={`status-${item.status}`}>{caseStatusLabels[item.status]}</span><span className={`priority-${item.priority}`}>{priorityLabels[item.priority]}</span><time>{new Date(item.requestedAt).toLocaleString("ar-SA")}</time></div>
      </button>)}
      {!cases.length && <div className="cs-empty">لا توجد حالات بعد. أنشئ أول حالة دعم أو تدريب.</div>}
    </section>
  </div>;
}
