import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Headphones, MessageSquarePlus, Radio, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/providers/OrganizationProvider";
import { createTicket, listTickets } from "@/features/support/api";
import {
  categoryLabels,
  collectBrowserContext,
  OPEN_STATUSES,
  priorityLabels,
  statusLabels,
  type Ticket,
} from "@/features/support/types";

export const Route = createFileRoute("/admin/support")({
  head: () => ({
    meta: [
      { title: "مركز الدعم — KOB" },
      { name: "description", content: "أنشئ تذاكر الدعم الفني وتابع المحادثات والجلسات المباشرة مع فريق KOB." },
      { property: "og:title", content: "مركز الدعم — KOB" },
      { property: "og:description", content: "تذاكر الدعم الفني والجلسات المباشرة داخل منصة KOB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanySupportPortal,
});

const emptyForm = {
  category: "technical",
  priority: "medium",
  subject: "",
  description: "",
  sessionPreference: "none",
  scheduledAt: "",
  allowView: true,
  allowRemoteControl: false,
  allowVoice: false,
  allowRecording: false,
};

function CompanySupportPortal() {
  const navigate = useNavigate();
  const { organization, membership } = useOrganization();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!organization) return;
    try {
      setTickets(await listTickets(organization.id));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التذاكر");
    }
  }

  useEffect(() => {
    void load();
    if (!organization) return;
    const channel = supabase
      .channel(`company-tickets-${organization.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `organization_id=eq.${organization.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const stats = useMemo(
    () => ({
      open: tickets.filter((item) => OPEN_STATUSES.includes(item.status)).length,
      waiting: tickets.filter((item) => item.status === "waiting_company").length,
      live: tickets.filter((item) => item.status === "live").length,
      resolved: tickets.filter((item) => ["resolved", "closed"].includes(item.status)).length,
    }),
    [tickets],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!organization) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createTicket({
        organizationId: organization.id,
        createdByMemberId: membership?.id ?? null,
        category: form.category,
        priority: form.priority,
        subject: form.subject,
        description: form.description,
        sessionPreference: form.sessionPreference,
        scheduledAt: form.sessionPreference === "scheduled" ? form.scheduledAt : null,
        allowView: form.allowView,
        allowRemoteControl: form.allowRemoteControl,
        allowVoice: form.allowVoice,
        allowRecording: form.allowRecording,
        context: collectBrowserContext(),
      });
      setForm(emptyForm);
      setOpen(false);
      await load();
      navigate({ to: "/admin/support/$ticketId", params: { ticketId: created.id } });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "تعذر إنشاء التذكرة");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="sc-page" dir="rtl">
      <header className="sc-hero">
        <div>
          <span>KOB Support Center</span>
          <h1>مركز الدعم الفني</h1>
          <p>
            أنشئ تذكرة دعم، تابع المحادثة المباشرة مع فريق KOB، وتحكّم في صلاحيات الجلسة — كل ذلك داخل
            المتصفح دون أي برامج خارجية.
          </p>
        </div>
        <button className="sc-primary" onClick={() => setOpen((value) => !value)}>
          <MessageSquarePlus size={16} /> تذكرة جديدة
        </button>
      </header>

      {error && (
        <div className="sc-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <section className="sc-stats">
        <article>
          <Headphones />
          <div>
            <b>{stats.open}</b>
            <span>تذاكر مفتوحة</span>
          </div>
        </article>
        <article>
          <ShieldCheck />
          <div>
            <b>{stats.waiting}</b>
            <span>بانتظار ردكم</span>
          </div>
        </article>
        <article>
          <Radio />
          <div>
            <b>{stats.live}</b>
            <span>جلسات مباشرة</span>
          </div>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <b>{stats.resolved}</b>
            <span>تم حلها</span>
          </div>
        </article>
      </section>

      {open && (
        <form className="sc-form" onSubmit={submit}>
          <h2>إنشاء تذكرة دعم</h2>
          <div className="sc-form-grid">
            <label>
              نوع المشكلة
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الأولوية
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              الموضوع
              <input
                required
                maxLength={160}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </label>
            <label className="wide">
              وصف المشكلة
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label>
              نوع المساعدة
              <select
                value={form.sessionPreference}
                onChange={(e) => setForm({ ...form, sessionPreference: e.target.value })}
              >
                <option value="none">بدون جلسة</option>
                <option value="chat">محادثة</option>
                <option value="voice">صوت</option>
                <option value="scheduled">موعد مجدول</option>
                <option value="immediate">مساعدة فورية</option>
              </select>
            </label>
            {form.sessionPreference === "scheduled" && (
              <label>
                الموعد
                <input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </label>
            )}
          </div>
          <div className="sc-permissions">
            <span className="sc-permissions-title">صلاحيات الجلسة (يمكن تغييرها لاحقًا)</span>
            <label>
              <input
                type="checkbox"
                checked={form.allowView}
                onChange={(e) => setForm({ ...form, allowView: e.target.checked })}
              />
              مشاركة الشاشة للمشاهدة
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.allowRemoteControl}
                onChange={(e) => setForm({ ...form, allowRemoteControl: e.target.checked })}
              />
              تحكّم مشترك داخل KOB
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.allowVoice}
                onChange={(e) => setForm({ ...form, allowVoice: e.target.checked })}
              />
              المحادثة الصوتية
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.allowRecording}
                onChange={(e) => setForm({ ...form, allowRecording: e.target.checked })}
              />
              تسجيل الجلسة
            </label>
          </div>
          <div className="sc-actions">
            <button type="button" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <button className="sc-primary" disabled={creating}>
              {creating ? "جارٍ الإنشاء..." : "إنشاء التذكرة"}
            </button>
          </div>
        </form>
      )}

      <section className="sc-list">
        <div className="sc-section-title">
          <h2>تذاكر الشركة</h2>
          <span>{tickets.length} تذكرة</span>
        </div>
        {tickets.map((ticket) => (
          <button
            key={ticket.id}
            className="sc-ticket"
            onClick={() => navigate({ to: "/admin/support/$ticketId", params: { ticketId: ticket.id } })}
          >
            <div>
              <b>{ticket.ticketNumber}</b>
              <h3>{ticket.subject}</h3>
              <p>{ticket.description}</p>
            </div>
            <div className="sc-ticket-meta">
              <span className={`sc-status status-${ticket.status}`}>{statusLabels[ticket.status]}</span>
              <span className={`sc-priority priority-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span>
              <time>{new Date(ticket.createdAt).toLocaleString("ar-SA")}</time>
            </div>
          </button>
        ))}
        {!tickets.length && <div className="sc-empty">لا توجد تذاكر بعد. أنشئ أول تذكرة دعم.</div>}
      </section>
    </div>
  );
}
