import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Clock3,
  GraduationCap,
  History,
  LockKeyhole,
  MessageCircle,
  PhoneCall,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Square,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/providers/PlatformProvider";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import {
  addCaseMessage,
  createSupportRequest,
  createSupportSession,
  endSupportSession,
  getCase,
  getCaseFeedback,
  listCaseEvents,
  listCaseMessages,
  listSessionsForOrganization,
  listSupportRequestsForOrganization,
  logSupportActivity,
  startSupportSession,
  updateCase,
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

export const Route = createFileRoute("/platform/customer-success/$caseId")({
  component: PlatformCaseDetails,
});

function PlatformCaseDetails() {
  const { caseId } = Route.useParams() as { caseId: string };
  const { profile } = usePlatform();
  const [item, setItem] = useState<CustomerSuccessCase | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [feedback, setFeedback] = useState<CaseFeedback | null>(null);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState<null | "support" | "training">(null);

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
      setMessages(m);
      setEvents(ev);
      setFeedback(fb);
      const [rq, ss] = await Promise.all([
        listSupportRequestsForOrganization(c.organizationId),
        listSessionsForOrganization(c.organizationId),
      ]);
      setRequests(rq);
      setSessions(ss);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تحميل الحالة");
    }
  }

  useEffect(() => {
    void load();
    const c = supabase.channel(`platform-case-${caseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_case_messages", filter: `case_id=eq.${caseId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_cases", filter: `id=eq.${caseId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "customer_success_case_events", filter: `case_id=eq.${caseId}` }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(c); };
  }, [caseId]);

  async function patchCase(patch: Record<string, unknown>) {
    setBusy(true);
    try { await updateCase(caseId, patch); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر تحديث الحالة"); }
    finally { setBusy(false); }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try { await addCaseMessage(caseId, body, internal ? "internal" : "shared"); setBody(""); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "تعذر الإرسال"); }
    finally { setBusy(false); }
  }

  const acceptedRequest = useMemo(
    () => requests.find((r) => r.status === "accepted" && r.type === "support"),
    [requests],
  );
  const activeSession = sessions.find((s) => s.status === "active");

  async function startSession() {
    if (!item || !profile || !acceptedRequest) return;
    setBusy(true);
    try {
      // approval window: 60 minutes
      const approval = new Date(Date.now() + 60 * 60_000).toISOString();
      const { id } = await createSupportSession({
        organizationId: item.organizationId,
        platformMemberId: profile.id,
        approvedByCompanyUserId: acceptedRequest.requestedBy,
        requestId: acceptedRequest.id,
        mode: acceptedRequest.requestedMode,
        voiceEnabled: acceptedRequest.allowVoice,
        recordingEnabled: acceptedRequest.allowRecording,
        approvalExpiresAt: approval,
      });
      await startSupportSession(id);
      await logSupportActivity({ sessionId: id, action: "session_started", targetType: "case", targetId: caseId });
      await patchCase({ status: "active" });
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر بدء الجلسة"); }
    finally { setBusy(false); }
  }

  async function endSession(id: string) {
    setBusy(true);
    try {
      await endSupportSession(id, "ended_by_platform");
      await logSupportActivity({ sessionId: id, action: "session_ended", targetType: "case", targetId: caseId });
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنهاء الجلسة"); }
    finally { setBusy(false); }
  }

  if (!item) return <div className="cs-empty">جارٍ تحميل الحالة…</div>;

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/customer-success"]}>
      <div className="cs-page" dir="rtl">
        <header className="cs-case-header">
          <div>
            <span>{item.caseNumber}</span>
            <h1>{item.title}</h1>
            <p>{item.organization?.name_ar || item.organization?.name_en} · {item.description}</p>
          </div>
          <div>
            <span className={`status-${item.status}`}>{caseStatusLabels[item.status]}</span>
            <span className={`priority-${item.priority}`}>{priorityLabels[item.priority]}</span>
          </div>
        </header>

        {error && <div className="cs-error"><XCircle /> {error}</div>}

        <div className="cs-platform-actions">
          <button disabled={busy} onClick={() => patchCase({ assigned_platform_member_id: profile?.id, status: "assigned", first_response_at: new Date().toISOString() })}>
            <UserRoundCheck /> استلام
          </button>
          <button disabled={busy} onClick={() => patchCase({ status: "waiting_company" })}>بانتظار الشركة</button>
          <button disabled={busy || !!activeSession} onClick={() => setShowRequest("support")}>
            <ShieldCheck /> طلب دخول دعم
          </button>
          <button disabled={busy} onClick={() => setShowRequest("training")}>
            <GraduationCap /> اقتراح تدريب
          </button>
          {acceptedRequest && !activeSession && (
            <button disabled={busy} className="cs-primary" onClick={startSession}>
              <Play /> بدء الجلسة
            </button>
          )}
          {activeSession && (
            <button disabled={busy} className="cs-danger" onClick={() => endSession(activeSession.id)}>
              <Square /> إنهاء الجلسة
            </button>
          )}
          <button disabled={busy} onClick={() => patchCase({ status: "resolved", resolved_at: new Date().toISOString() })}>
            <CheckCircle2 /> تم الحل
          </button>
        </div>

        {showRequest && (
          <RequestForm
            type={showRequest}
            onClose={() => setShowRequest(null)}
            onSubmit={async (input) => {
              setBusy(true);
              try {
                await createSupportRequest({ ...input, organizationId: item.organizationId, type: showRequest });
                await patchCase({ status: "waiting_company" });
                setShowRequest(null);
              } catch (e) { setError(e instanceof Error ? e.message : "تعذر إنشاء الطلب"); }
              finally { setBusy(false); }
            }}
          />
        )}

        <div className="cs-workspace">
          <main className="cs-thread">
            <div className="cs-section-title">
              <h2><MessageCircle /> سجل الحالة</h2>
              {activeSession && <span className="cs-live-pill"><Radio /> جلسة {activeSession.mode}</span>}
            </div>
            <div className="cs-messages">
              {messages.map((m) => (
                <article key={m.id} className={m.visibility === "internal" ? "internal" : ""}>
                  <strong>
                    {m.visibility === "internal" ? <><LockKeyhole /> ملاحظة داخلية</> : "رسالة مشتركة"}
                  </strong>
                  <p>{m.body}</p>
                  <time>{new Date(m.createdAt).toLocaleString("ar-SA")}</time>
                </article>
              ))}
              {!messages.length && <div className="cs-empty">لا توجد رسائل بعد.</div>}
            </div>
            <form className="cs-composer platform" onSubmit={send}>
              <label className="cs-internal-toggle">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                ملاحظة داخلية
              </label>
              <textarea
                value={body}
                maxLength={5000}
                onChange={(e) => setBody(e.target.value)}
                placeholder={internal ? "لن تظهر هذه الملاحظة للشركة" : "اكتب ردًا للشركة…"}
              />
              <button className="cs-primary" disabled={busy || !body.trim()}><Send /></button>
            </form>
          </main>

          <aside className="cs-sidebar">
            <section>
              <h3><Clock3 /> إدارة الحالة</h3>
              <dl>
                <dt>الحالة</dt><dd>{caseStatusLabels[item.status]}</dd>
                <dt>الأولوية</dt><dd>{priorityLabels[item.priority]}</dd>
                <dt>الجلسة المفضلة</dt><dd>{item.sessionPreference}</dd>
                <dt>الموعد</dt><dd>{item.scheduledAt ? new Date(item.scheduledAt).toLocaleString("ar-SA") : "غير محدد"}</dd>
                <dt>المكلَّف</dt><dd>{item.assignedPlatformMemberId ? "معيّن" : "غير معيّن"}</dd>
              </dl>
            </section>

            <section>
              <h3><ShieldCheck /> طلبات وموافقات</h3>
              {!requests.length && <p className="cs-empty">لا توجد طلبات.</p>}
              <ul className="cs-request-list">
                {requests.map((r) => (
                  <li key={r.id}>
                    <b>{r.type === "training" ? <><GraduationCap /> تدريب</> : <><PhoneCall /> دعم</>} · {r.subject}</b>
                    <small>{supportRequestStatusLabels[r.status]}</small>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3><History /> الجدول الزمني</h3>
              <ul className="cs-timeline">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <b>{ev.eventType}</b>
                    {ev.toStatus && <span>{caseStatusLabels[ev.toStatus as keyof typeof caseStatusLabels] ?? ev.toStatus}</span>}
                    <time>{new Date(ev.createdAt).toLocaleString("ar-SA")}</time>
                  </li>
                ))}
                {!events.length && <li className="muted">لا توجد أحداث بعد.</li>}
              </ul>
            </section>

            {feedback && (
              <section>
                <h3>تقييم الشركة</h3>
                <p>التقييم: {feedback.rating}/5 · {feedback.resolved ? "تم الحل" : "لم يُحل"}</p>
                {feedback.comment && <p className="muted">{feedback.comment}</p>}
              </section>
            )}
          </aside>
        </div>
      </div>
    </PlatformGate>
  );
}

function RequestForm({
  type,
  onClose,
  onSubmit,
}: {
  type: "support" | "training";
  onClose: () => void;
  onSubmit: (input: {
    subject: string;
    description: string;
    priority: "normal" | "high" | "urgent";
    requestedStartAt: string | null;
    durationMinutes: number;
    requestedMode: "view" | "assist" | "edit";
    allowVoice: boolean;
    allowRecording: boolean;
  }) => void | Promise<void>;
}) {
  const [subject, setSubject] = useState(type === "training" ? "جلسة تدريب" : "طلب دخول للدعم");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [startAt, setStartAt] = useState("");
  const [duration, setDuration] = useState(30);
  const [mode, setMode] = useState<"view" | "assist" | "edit">("view");
  const [voice, setVoice] = useState(true);
  const [rec, setRec] = useState(false);

  return (
    <form
      className="cs-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSubmit({
          subject, description, priority,
          requestedStartAt: startAt ? new Date(startAt).toISOString() : null,
          durationMinutes: duration,
          requestedMode: mode,
          allowVoice: voice, allowRecording: rec,
        });
      }}
    >
      <h2>{type === "training" ? "اقتراح جلسة تدريب" : "طلب دخول دعم"}</h2>
      <div className="cs-form-grid">
        <label className="wide">الموضوع
          <input required maxLength={160} value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="wide">الوصف
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <label>الأولوية
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
            <option value="normal">عادي</option>
            <option value="high">مرتفع</option>
            <option value="urgent">عاجل</option>
          </select>
        </label>
        <label>الوضع
          <select value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="view">مشاهدة فقط</option>
            <option value="assist">مساعدة</option>
            <option value="edit">تعديل مؤقت</option>
          </select>
        </label>
        <label>الموعد
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <label>المدة (دقيقة)
          <input type="number" min={10} max={480} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
      </div>
      <div className="cs-permissions">
        <label><input type="checkbox" checked={voice} onChange={(e) => setVoice(e.target.checked)} /> صوت</label>
        <label><input type="checkbox" checked={rec} onChange={(e) => setRec(e.target.checked)} /> تسجيل</label>
      </div>
      <div className="cs-actions">
        <button type="button" onClick={onClose}>إلغاء</button>
        <button className="cs-primary">إرسال الطلب</button>
      </div>
    </form>
  );
}