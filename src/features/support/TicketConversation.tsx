import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Loader2, Lock, Send, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

import { listEvents, listMessages, sendMessage } from "./api";
import { statusLabels, type TicketEvent, type TicketMessage, type TicketStatus } from "./types";

type Props = {
  ticketId: string;
  side: "company" | "agent";
};

const senderLabels: Record<string, string> = {
  company: "الشركة",
  agent: "فريق KOB",
  system: "النظام",
  ai: "مساعد KOB",
};

export function TicketConversation({ ticketId, side }: Props) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const includeInternal = side === "agent";

  async function load() {
    try {
      const [nextMessages, nextEvents] = await Promise.all([
        listMessages(ticketId, includeInternal),
        listEvents(ticketId),
      ]);
      setMessages(nextMessages);
      setEvents(nextEvents);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المحادثة");
    }
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`ticket-stream-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_events", filter: `ticket_id=eq.${ticketId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId, includeInternal]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const timeline = useMemo(() => events.slice(0, 25), [events]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({
        ticketId,
        body,
        senderKind: side,
        visibility: internal ? "internal" : "shared",
      });
      setBody("");
      await load();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال الرسالة");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="sc-conversation">
      <section className="sc-chat">
        <header className="sc-chat-head">
          <h3>المحادثة</h3>
          <span>{messages.length} رسالة</span>
        </header>
        <div className="sc-chat-body">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`sc-bubble sender-${message.senderKind} ${
                message.senderKind === side ? "own" : ""
              } ${message.visibility === "internal" ? "internal" : ""}`}
            >
              <div className="sc-bubble-top">
                <b>{senderLabels[message.senderKind] ?? message.senderKind}</b>
                {message.visibility === "internal" && (
                  <span className="sc-internal-tag">
                    <Lock size={12} /> ملاحظة داخلية
                  </span>
                )}
                <time>{new Date(message.createdAt).toLocaleString("ar-SA")}</time>
              </div>
              <p>{message.body}</p>
            </article>
          ))}
          {!messages.length && <div className="sc-empty">لا توجد رسائل بعد.</div>}
          <div ref={endRef} />
        </div>
        {error && <div className="sc-error">{error}</div>}
        <form className="sc-composer" onSubmit={submit}>
          <textarea
            rows={2}
            value={body}
            maxLength={4000}
            placeholder="اكتب رسالتك..."
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="sc-composer-actions">
            {side === "agent" && (
              <label className="sc-internal-toggle">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(event) => setInternal(event.target.checked)}
                />
                ملاحظة داخلية
              </label>
            )}
            <button className="sc-primary" disabled={sending || !body.trim()}>
              {sending ? <Loader2 className="sc-spin" size={16} /> : <Send size={16} />} إرسال
            </button>
          </div>
        </form>
      </section>
      <aside className="sc-timeline">
        <header>
          <Sparkles size={16} />
          <h3>الخط الزمني</h3>
        </header>
        <ol>
          {timeline.map((item) => (
            <li key={item.id}>
              <span className="sc-dot" />
              <div>
                <b>{describeEvent(item)}</b>
                <time>{new Date(item.createdAt).toLocaleString("ar-SA")}</time>
              </div>
            </li>
          ))}
          {!timeline.length && <li className="sc-empty">لا توجد أحداث.</li>}
        </ol>
      </aside>
    </div>
  );
}

function describeEvent(event: TicketEvent): string {
  if (event.eventType === "ticket_created") return "تم إنشاء التذكرة";
  if (event.eventType === "assigned") return "تم تعيين موظف دعم";
  if (event.eventType === "status_changed") {
    const from = event.fromStatus ? statusLabels[event.fromStatus as TicketStatus] ?? event.fromStatus : "-";
    const to = event.toStatus ? statusLabels[event.toStatus as TicketStatus] ?? event.toStatus : "-";
    return `تغيّرت الحالة من ${from} إلى ${to}`;
  }
  return event.message || event.eventType;
}
