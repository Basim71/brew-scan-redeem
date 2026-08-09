import { useCallback, useEffect, useState } from "react";
import { Check, MonitorPlay, Play, ShieldCheck, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { LiveSessionRoom } from "./LiveSessionRoom";
import {
  approveSession,
  getLiveSession,
  rejectSession,
  requestSession,
  startSession,
  touchPresence,
  type SessionMode,
  type TicketSession,
} from "./sessions";

type Props = {
  ticketId: string;
  organizationId: string;
  side: "company" | "agent";
};

const MODE_LABELS: Record<SessionMode, string> = {
  view: "مشاهدة فقط",
  assist: "مساعدة موجّهة",
  control: "تحكّم مشترك داخل KOB",
};

/** Session lifecycle: request → company approval → live room → end. */
export function SessionPanel({ ticketId, organizationId, side }: Props) {
  const [session, setSession] = useState<TicketSession | null>(null);
  const [mode, setMode] = useState<SessionMode>("assist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSession(await getLiveSession(ticketId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الجلسة");
    }
  }, [ticketId]);

  useEffect(() => {
    void load();
    void touchPresence("online", ticketId);
    const channel = supabase
      .channel(`ticket-sessions-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_sessions", filter: `ticket_id=eq.${ticketId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ticketId, load]);

  async function run(action: () => Promise<TicketSession>) {
    setBusy(true);
    setError(null);
    try {
      setSession(await action());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  if (session?.status === "active") {
    return (
      <LiveSessionRoom
        session={session}
        ticketId={ticketId}
        side={side}
        onSessionChange={(next) => setSession(next.status === "ended" ? null : next)}
      />
    );
  }

  return (
    <section className="sc-card sc-session-panel" dir="rtl">
      <h3>
        <MonitorPlay size={16} /> الجلسة المباشرة
      </h3>
      {error && <div className="sc-error">{error}</div>}

      {!session && side === "agent" && (
        <>
          <p className="sc-hint">اطلب من الشركة جلسة مباشرة. لا تبدأ الجلسة قبل موافقتها الصريحة.</p>
          <label className="sc-field">
            نوع الجلسة
            <select value={mode} onChange={(event) => setMode(event.target.value as SessionMode)}>
              {Object.entries(MODE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="sc-primary"
            disabled={busy}
            onClick={() => void run(() => requestSession({ ticketId, organizationId, mode }))}
          >
            <ShieldCheck size={15} /> طلب جلسة من الشركة
          </button>
        </>
      )}

      {!session && side === "company" && <p className="sc-hint">لا توجد جلسة مباشرة حالية.</p>}

      {session?.status === "requested" && side === "company" && (
        <>
          <p className="sc-hint">
            طلب فريق KOB جلسة مباشرة ({MODE_LABELS[session.mode]}). الموافقة صالحة حتى{" "}
            {session.approvalExpiresAt ? new Date(session.approvalExpiresAt).toLocaleTimeString("ar-SA") : "—"}.
          </p>
          <div className="sc-session-actions">
            <button className="sc-primary" disabled={busy} onClick={() => void run(() => approveSession(session.id))}>
              <Check size={15} /> موافقة
            </button>
            <button className="sc-ghost" disabled={busy} onClick={() => void run(() => rejectSession(session.id))}>
              <X size={15} /> رفض
            </button>
          </div>
        </>
      )}

      {session?.status === "requested" && side === "agent" && (
        <p className="sc-hint">بانتظار موافقة الشركة على الجلسة…</p>
      )}

      {session?.status === "approved" && (
        <>
          <p className="sc-hint">وافقت الشركة على الجلسة ({MODE_LABELS[session.mode]}).</p>
          {side === "agent" ? (
            <button className="sc-primary" disabled={busy} onClick={() => void run(() => startSession(session.id))}>
              <Play size={15} /> بدء الجلسة
            </button>
          ) : (
            <p className="sc-hint">سيبدأ فريق KOB الجلسة الآن.</p>
          )}
        </>
      )}
    </section>
  );
}
