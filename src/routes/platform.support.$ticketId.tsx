import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MonitorPlay, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { TicketConversation } from "@/features/support/TicketConversation";
import { claimTicket, getTicket, setTicketStatus, updateTicket } from "@/features/support/api";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
  type Ticket,
  type TicketStatus,
} from "@/features/support/types";

export const Route = createFileRoute("/platform/support/$ticketId")({
  head: () => ({
    meta: [
      { title: "تذكرة دعم — KOB Platform" },
      { name: "description", content: "إدارة تذكرة الدعم: الاستلام، الحالة، الجلسة المباشرة، والملاحظات الداخلية." },
      { property: "og:title", content: "تذكرة دعم — KOB Platform" },
      { property: "og:description", content: "مساحة عمل موظف دعم KOB لإدارة التذكرة والجلسة." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformTicketDetail,
});

const STATUS_ACTIONS: TicketStatus[] = ["accepted", "waiting_company", "scheduled", "live", "resolved", "closed"];

const PERMISSION_ROWS: Array<{ key: keyof Ticket; label: string }> = [
  { key: "allowView", label: "مشاهدة الشاشة" },
  { key: "allowRemoteControl", label: "تحكّم مشترك داخل KOB" },
  { key: "allowVoice", label: "المحادثة الصوتية" },
  { key: "allowRecording", label: "تسجيل الجلسة" },
];

function PlatformTicketDetail() {
  const { ticketId } = useParams({ from: "/platform/support/$ticketId" });
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setTicket(await getTicket(ticketId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التذكرة");
    }
  }

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void load();
    const channel = supabase
      .channel(`platform-ticket-${ticketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `id=eq.${ticketId}` }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function changeStatus(status: TicketStatus) {
    try {
      setTicket(await setTicketStatus(ticketId, status));
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "تعذر تحديث الحالة");
    }
  }

  async function assignToMe() {
    try {
      setTicket(await claimTicket(ticketId));
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "تعذر استلام التذكرة");
    }
  }

  async function bumpPriority(priority: string) {
    try {
      setTicket(await updateTicket(ticketId, { priority }));
    } catch (priorityError) {
      setError(priorityError instanceof Error ? priorityError.message : "تعذر تحديث الأولوية");
    }
  }

  if (!ticket) {
    return (
      <PlatformGate allow={ROLE_MATRIX["/platform/support"]}>
        <div className="platform-page sc-page" dir="rtl">
          {error ? <div className="sc-error">{error}</div> : <div className="sc-empty">جارٍ التحميل...</div>}
        </div>
      </PlatformGate>
    );
  }

  const isMine = ticket.assignedAgentUserId === userId;

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/support"]}>
      <div className="platform-page sc-page" dir="rtl">
        <header className="sc-detail-head">
          <button className="sc-back" onClick={() => navigate({ to: "/platform/support" })}>
            <ArrowRight size={16} /> رجوع للوحة الدعم
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

        <div className="sc-detail-grid">
          <TicketConversation ticketId={ticket.id} side="agent" />

          <aside className="sc-side">
            <section className="sc-card">
              <h3>
                <ShieldCheck size={16} /> الإدارة
              </h3>
              {!isMine && (
                <button className="sc-primary" onClick={() => void assignToMe()}>
                  استلام التذكرة
                </button>
              )}
              {isMine && <p className="sc-hint">التذكرة معيّنة لك.</p>}
              <label className="sc-field">
                الأولوية
                <select value={ticket.priority} onChange={(event) => void bumpPriority(event.target.value)}>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sc-status-actions">
                {STATUS_ACTIONS.map((status) => (
                  <button
                    key={status}
                    className={ticket.status === status ? "active" : ""}
                    onClick={() => void changeStatus(status)}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </section>

            <section className="sc-card">
              <h3>
                <MonitorPlay size={16} /> صلاحيات الشركة
              </h3>
              <p className="sc-hint">هذه الصلاحيات تُمنح من الشركة فقط ولا يمكن تعديلها من هنا.</p>
              {PERMISSION_ROWS.map((row) => (
                <div key={String(row.key)} className="sc-perm-view">
                  <span>{row.label}</span>
                  <b className={ticket[row.key] ? "on" : "off"}>{ticket[row.key] ? "مسموح" : "غير مسموح"}</b>
                </div>
              ))}
            </section>

            <section className="sc-card">
              <h3>سياق الشركة</h3>
              <ul className="sc-context">
                <li>
                  <b>الشركة</b>
                  <span>{ticket.organization?.name_ar || ticket.organization?.name_en || "-"}</span>
                </li>
                {Object.entries(ticket.context ?? {}).map(([key, value]) => (
                  <li key={key}>
                    <b>{key}</b>
                    <span>{String(value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </PlatformGate>
  );
}
