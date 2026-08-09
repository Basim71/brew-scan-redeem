import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MonitorPlay, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { TicketConversation } from "@/features/support/TicketConversation";
import { SessionPanel } from "@/features/support/SessionPanel";
import { getRating, getTicket, setTicketStatus, submitRating, updateTicket } from "@/features/support/api";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
  type Ticket,
} from "@/features/support/types";

export const Route = createFileRoute("/admin/support/$ticketId")({
  head: () => ({
    meta: [
      { title: "تذكرة دعم — KOB" },
      { name: "description", content: "تفاصيل تذكرة الدعم، المحادثة المباشرة، صلاحيات الجلسة والتقييم." },
      { property: "og:title", content: "تذكرة دعم — KOB" },
      { property: "og:description", content: "تفاصيل تذكرة الدعم والمحادثة المباشرة مع فريق KOB." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyTicketDetail,
});

const PERMISSIONS: Array<{ key: keyof Ticket; column: string; label: string }> = [
  { key: "allowView", column: "allow_view", label: "مشاركة الشاشة للمشاهدة" },
  { key: "allowRemoteControl", column: "allow_remote_control", label: "تحكّم مشترك داخل KOB" },
  { key: "allowVoice", column: "allow_voice", label: "المحادثة الصوتية" },
  { key: "allowRecording", column: "allow_recording", label: "تسجيل الجلسة" },
];

function CompanyTicketDetail() {
  const { ticketId } = useParams({ from: "/admin/support/$ticketId" });
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [rating, setRating] = useState<any>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const [nextTicket, nextRating] = await Promise.all([getTicket(ticketId), getRating(ticketId)]);
      setTicket(nextTicket);
      setRating(nextRating);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التذكرة");
    }
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`company-ticket-${ticketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `id=eq.${ticketId}` }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function togglePermission(column: string, value: boolean) {
    try {
      setTicket(await updateTicket(ticketId, { [column]: value }));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "تعذر تحديث الصلاحيات");
    }
  }

  async function close() {
    try {
      setTicket(await setTicketStatus(ticketId, "closed"));
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "تعذر إغلاق التذكرة");
    }
  }

  async function rate() {
    try {
      await submitRating({ ticketId, rating: stars, resolved: true, comment });
      setComment("");
      await load();
    } catch (rateError) {
      setError(rateError instanceof Error ? rateError.message : "تعذر إرسال التقييم");
    }
  }

  if (!ticket) {
    return (
      <div className="sc-page" dir="rtl">
        {error ? <div className="sc-error">{error}</div> : <div className="sc-empty">جارٍ التحميل...</div>}
      </div>
    );
  }

  return (
    <div className="sc-page" dir="rtl">
      <header className="sc-detail-head">
        <button className="sc-back" onClick={() => navigate({ to: "/admin/support" })}>
          <ArrowRight size={16} /> رجوع للتذاكر
        </button>
        <div>
          <span>{ticket.ticketNumber}</span>
          <h1>{ticket.subject}</h1>
          <p>{ticket.description}</p>
        </div>
        <div className="sc-detail-badges">
          <span className={`sc-status status-${ticket.status}`}>{statusLabels[ticket.status]}</span>
          <span className={`sc-priority priority-${ticket.priority}`}>{priorityLabels[ticket.priority]}</span>
          <span className="sc-chip">{categoryLabels[ticket.category]}</span>
        </div>
      </header>

      {error && <div className="sc-error">{error}</div>}

      <SessionPanel ticketId={ticket.id} organizationId={ticket.organizationId} side="company" />

      <div className="sc-detail-grid">
        <TicketConversation ticketId={ticket.id} side="company" />

        <aside className="sc-side">
          <section className="sc-card">
            <h3>
              <MonitorPlay size={16} /> صلاحيات الجلسة
            </h3>
            <p className="sc-hint">
              لا يستطيع فريق KOB مشاهدة شاشتك أو التحكّم داخل التطبيق إلا بعد تفعيلك للصلاحية المناسبة.
            </p>
            {PERMISSIONS.map((permission) => (
              <label key={permission.column} className="sc-switch-row">
                <span>{permission.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(ticket[permission.key])}
                  onChange={(event) => void togglePermission(permission.column, event.target.checked)}
                />
              </label>
            ))}
          </section>

          <section className="sc-card">
            <h3>معلومات تم جمعها تلقائيًا</h3>
            <ul className="sc-context">
              {Object.entries(ticket.context ?? {}).map(([key, value]) => (
                <li key={key}>
                  <b>{key}</b>
                  <span>{String(value)}</span>
                </li>
              ))}
              {!Object.keys(ticket.context ?? {}).length && <li className="sc-empty">لا توجد بيانات.</li>}
            </ul>
          </section>

          <section className="sc-card">
            <h3>
              <Star size={16} /> التقييم
            </h3>
            {rating ? (
              <p className="sc-hint">تم إرسال تقييمكم: {rating.rating} / 5</p>
            ) : (
              <>
                <div className="sc-stars">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={value <= stars ? "active" : ""}
                      onClick={() => setStars(value)}
                    >
                      <Star size={18} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  value={comment}
                  placeholder="ملاحظاتكم (اختياري)"
                  onChange={(event) => setComment(event.target.value)}
                />
                <button className="sc-primary" onClick={() => void rate()}>
                  إرسال التقييم
                </button>
              </>
            )}
          </section>

          {!["closed", "cancelled"].includes(ticket.status) && (
            <button className="sc-ghost" onClick={() => void close()}>
              إغلاق التذكرة
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
