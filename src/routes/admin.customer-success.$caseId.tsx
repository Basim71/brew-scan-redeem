import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  History,
  MessageCircle,
  Radio,
  RotateCcw,
  Send,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/providers/OrganizationProvider";
import {
  addCaseMessage,
  getCase,
  getCaseFeedback,
  listCaseEvents,
  listCaseMessages,
  listSessionsForOrganization,
  listSupportRequestsForOrganization,
  submitCaseFeedback,
  updateCase,
  updateSupportRequest,
} from "@/features/customer-success/api";
import {
  caseStatusLabels,
  priorityLabels,
  supportRequestStatusLabels,
  type CaseEvent,
  type CaseFeedback,
  type CaseMessage,
  type CustomerSuccessCase,
  type SupportRequest,
  type SupportSession,
} from "@/features/customer-success/types";

export const Route = createFileRoute("/admin/customer-success/$caseId")({
  component: CompanyCaseDetails,
});

function CompanyCaseDetails() {
  const { caseId } = Route.useParams() as { caseId: string };
  const { organization, membership } = useOrganization();
  const [item, setItem] = useState<CustomerSuccessCase | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [feedback, setFeedback] = useState<CaseFeedback | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setError(null);
      const [c, m, ev, fb] = await Promise.all([
        getCase(caseId),
        listCaseMessages(caseId),
        listCaseEvents(caseId),
        getCaseFeedback(caseId),
      ]);
      setItem(c);
      // company only sees shared messages (RLS also enforces this)
      setMessages(m.filter((x) => x.visibility === "shared"));
      setEvents(ev);
      setFeedback(fb);
      if (organization) {
        const [rq, ss] = await Promise.all([
          listSupportRequestsForOrganization(organization.id),
          listSessionsForOrganization(organization.id),
        ]);
        setRequests(rq.filter((r) => (r as any).requested_by_case_id === caseId || true));
        setSessions(ss);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الحالة");
    }
  }

  useEffect(() => {
    void load();
    const c1 = supabase.channel(`admin-case-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_case_messages", filter: `case_id=eq.${caseId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_cases", filter: `id=eq.${caseId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_case_events", filter: `case_id=eq.${caseId}` }, () => void load())
      .subscribe();
    let c2: ReturnType<typeof supabase.channel> | null = null;
    if (organization) {
      c2 = supabase.channel(`admin-support-${organization.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "support_requests", filter: `organization_id=eq.${organization.id}` }, () => void load())
        .on("postgres_changes", { event: "*", schema: "public", table: "support_sessions", filter: `organization_id=eq.${organization.id}` }, () => void load())
        .subscribe();
    }
    return () => {
      void supabase.removeChannel(c1);
      if (c2) void supabase.removeChannel(c2);
    };
  }, [caseId, organization?.id]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try { await addCaseMessage(caseId, body, "shared"); setBody(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر الإرسال"); }
    finally { setBusy(false); }
  }

  async function patchCase(patch: Record<string, unknown>) {
    setBusy(true);
    try { await updateCase(caseId, patch); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث الحالة"); }
    finally { setBusy(false); }
  }

  async function respondRequest(id: string, accept: boolean, note?: string) {
    setBusy(true);
    try {
      await updateSupportRequest(id, {
        status: accept ? "accepted" : "declined",
        decided_at: new Date().toISOString(),
        decision_note: note ?? null,
      });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر تسجيل القرار"); }
    finally { setBusy(false); }
  }

  async function submitFeedbackForm(rating: number, resolved: boolean, comment: string) {
    if (!membership) return;
    setBusy(true);
    try {
      await submitCaseFeedback({ caseId, memberId: membership.id, rating, resolved, comment });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إرسال التقييم"); }
    finally { setBusy(false); }
  }

  if (!item) return <div className="cs-empty">جارٍ تحميل الحالة…</div>;

  const canClose = !["closed", "cancelled"].includes(item.status);
  const canReopen = ["resolved", "closed"].includes(item.status);
  const canFeedback = ["resolved", "closed"].includes(item.status) && !feedback;
  const activeSession = sessions.find((s) => s.status === "active");
  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <div className="cs-page" dir="rtl">
      <header className="cs-case-header">
        <div>
          <span>{item.caseNumber}</span>
          <h1>{item.title}</h1>
          <p>{item.description}</p>
        </div>
        <div>
          <span className={`status-${item.status}`}>{caseStatusLabels[item.status]}</span>
          <span className={`priority-${item.priority}`}>{priorityLabels[item.priority]}</span>
        </div>
      </header>

      {error && <div className="cs-error"><XCircle /> {error}</div>}

      <div className="cs-platform-actions">
        {canClose && (
          <button disabled={busy} onClick={() => patchCase({ status: "closed", closed_at: new Date().toISOString() })}>
            <XCircle /> إغلاق الحالة
          </button>
        )}
        {canReopen && (
          <button disabled={busy} onClick={() => patchCase({ status: "waiting_platform", closed_at: null, resolved_at: null })}>
            <RotateCcw /> إعادة فتح
          </button>
        )}
        {activeSession && (
          <span className="cs-live-pill"><Radio /> جلسة نشطة — {activeSession.mode}</span>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <section className="cs-approvals">
          <div className="cs-section-title"><h2><ShieldCheck /> طلبات موافقة</h2><span>{pendingRequests.length}</span></div>
          {pendingRequests.map((r) => (
            <article key={r.id} className="cs-approval-card">
              <header>
                <b>{r.type === "training" ? "طلب تدريب" : "طلب دخول دعم"}</b>
                <span className={`priority-${r.priority}`}>{r.priority}</span>
              </header>
              <h3>{r.subject}</h3>
              {r.description && <p>{r.description}</p>}
              <dl>
                <dt>الوضع المطلوب</dt><dd>{r.requestedMode}</dd>
                <dt>المدة</dt><dd>{r.durationMinutes} د</dd>
                <dt>الصوت</dt><dd>{r.allowVoice ? "مسموح" : "لا"}</dd>
                <dt>التسجيل</dt><dd>{r.allowRecording ? "مسموح" : "لا"}</dd>
                {r.requestedStartAt && <><dt>الموعد المقترح</dt><dd>{new Date(r.requestedStartAt).toLocaleString("ar-SA")}</dd></>}
              </dl>
              <footer>
                <button disabled={busy} className="cs-danger" onClick={() => respondRequest(r.id, false)}><XCircle /> رفض</button>
                <button disabled={busy} className="cs-primary" onClick={() => respondRequest(r.id, true)}><CheckCircle2 /> موافقة</button>
              </footer>
            </article>
          ))}
        </section>
      )}

      <div className="cs-workspace">
        <main className="cs-thread">
          <div className="cs-section-title"><h2><MessageCircle /> المحادثة</h2></div>
          <div className="cs-messages">
            {messages.map((m) => (
              <article key={m.id}>
                <p>{m.body}</p>
                <time>{new Date(m.createdAt).toLocaleString("ar-SA")}</time>
              </article>
            ))}
            {!messages.length && <div className="cs-empty">ابدأ المحادثة مع فريق KOB.</div>}
          </div>
          <form className="cs-composer platform" onSubmit={send}>
            <textarea
              value={body}
              maxLength={5000}
              onChange={(e) => setBody(e.target.value)}
              placeholder="اكتب رسالتك لفريق KOB…"
            />
            <button className="cs-primary" disabled={busy || !body.trim()}><Send /></button>
          </form>

          {canFeedback && (
            <FeedbackForm busy={busy} onSubmit={submitFeedbackForm} />
          )}
          {feedback && (
            <div className="cs-feedback-summary">
              <b>تقييمكم للحالة</b>
              <div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={i < feedback.rating ? "filled" : ""} />
                ))}
                <span>{feedback.resolved ? "تم حل المشكلة" : "لم تُحل بشكل كامل"}</span>
              </div>
              {feedback.comment && <p>{feedback.comment}</p>}
            </div>
          )}
        </main>

        <aside className="cs-sidebar">
          <section>
            <h3><Clock3 /> معلومات الحالة</h3>
            <dl>
              <dt>الحالة</dt><dd>{caseStatusLabels[item.status]}</dd>
              <dt>الأولوية</dt><dd>{priorityLabels[item.priority]}</dd>
              <dt>الإنشاء</dt><dd>{new Date(item.requestedAt).toLocaleString("ar-SA")}</dd>
              <dt>الموعد</dt><dd>{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("ar-SA") : "غير محدد"}</dd>
            </dl>
          </section>
          <section>
            <h3><ShieldCheck /> الصلاحيات</h3>
            <ul>
              <li>{item.allowView ? "✓" : "—"} مشاهدة</li>
              <li>{item.allowTemporaryEdit ? "✓" : "—"} تعديل مؤقت</li>
              <li>{item.allowVoice ? "✓" : "—"} صوت</li>
              <li>{item.allowRecording ? "✓" : "—"} تسجيل</li>
            </ul>
          </section>
          <section>
            <h3><History /> الجدول الزمني</h3>
            <ul className="cs-timeline">
              {events.map((ev) => (
                <li key={ev.id}>
                  <b>{eventLabel(ev)}</b>
                  <time>{new Date(ev.createdAt).toLocaleString("ar-SA")}</time>
                </li>
              ))}
              {!events.length && <li className="muted">لا توجد أحداث بعد.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function eventLabel(ev: CaseEvent): string {
  if (ev.eventType === "case_created") return "تم إنشاء الحالة";
  if (ev.eventType === "status_changed") {
    const to = ev.toStatus as keyof typeof caseStatusLabels;
    return `تغيير الحالة إلى: ${caseStatusLabels[to] ?? ev.toStatus}`;
  }
  if (ev.eventType === "assignee_changed") return "تغيير المكلَّف";
  return ev.eventType;
}

function FeedbackForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (rating: number, resolved: boolean, comment: string) => void | Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [resolved, setResolved] = useState(true);
  const [comment, setComment] = useState("");
  return (
    <form
      className="cs-feedback-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit(rating, resolved, comment);
      }}
    >
      <b>شاركنا رأيك</b>
      <div className="cs-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} من 5`}>
            <Star className={n <= rating ? "filled" : ""} />
          </button>
        ))}
      </div>
      <label>
        <input type="checkbox" checked={resolved} onChange={(e) => setResolved(e.target.checked)} />
        تم حل المشكلة بشكل مُرضٍ
      </label>
      <textarea
        rows={3}
        maxLength={2000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="ملاحظات إضافية (اختياري)"
      />
      <button className="cs-primary" disabled={busy}>إرسال التقييم</button>
    </form>
  );
}