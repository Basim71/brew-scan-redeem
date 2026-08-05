import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Headphones, Radio, Search, UserCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { claimTicket, listTickets } from "@/features/support/api";
import { categoryLabels, priorityLabels, statusLabels, type Ticket } from "@/features/support/types";

export const Route = createFileRoute("/platform/support")({
  head: () => ({
    meta: [
      { title: "لوحة الدعم — KOB Platform" },
      { name: "description", content: "فرز تذاكر الدعم، استلامها، وإدارة الجلسات المباشرة لفريق KOB." },
      { property: "og:title", content: "لوحة الدعم — KOB Platform" },
      { property: "og:description", content: "مركز عمليات فريق دعم KOB لإدارة التذاكر والجلسات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformSupportDashboard,
});

const TABS: Array<[string, string, any]> = [
  ["inbox", "الواردة", UserCheck],
  ["mine", "تذاكري", Headphones],
  ["live", "جلسات مباشرة", Radio],
  ["scheduled", "مجدولة", CalendarClock],
  ["closed", "المغلقة", CheckCircle2],
  ["all", "الكل", Search],
];

function PlatformSupportDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tab, setTab] = useState("inbox");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setTickets(await listTickets());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التذاكر");
    }
  }

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void load();
    const channel = supabase
      .channel("platform-support-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const shown = useMemo(
    () =>
      tickets.filter((ticket) => {
        const query = search.trim().toLowerCase();
        const haystack = `${ticket.ticketNumber} ${ticket.subject} ${ticket.description} ${
          ticket.organization?.name_ar ?? ""
        } ${ticket.organization?.name_en ?? ""}`.toLowerCase();
        const matches = !query || haystack.includes(query);
        const tabMatch =
          tab === "all" ||
          (tab === "inbox" && ["new", "waiting"].includes(ticket.status)) ||
          (tab === "mine" && ticket.assignedAgentUserId === userId && !["closed", "cancelled"].includes(ticket.status)) ||
          (tab === "live" && ticket.status === "live") ||
          (tab === "scheduled" && ticket.status === "scheduled") ||
          (tab === "closed" && ["resolved", "closed", "cancelled", "rejected"].includes(ticket.status));
        return matches && tabMatch;
      }),
    [tickets, search, tab, userId],
  );

  const stats = {
    inbox: tickets.filter((ticket) => ["new", "waiting"].includes(ticket.status)).length,
    live: tickets.filter((ticket) => ticket.status === "live").length,
    scheduled: tickets.filter((ticket) => ticket.status === "scheduled").length,
    critical: tickets.filter(
      (ticket) => ticket.priority === "critical" && !["closed", "cancelled"].includes(ticket.status),
    ).length,
  };

  async function claim(ticketId: string) {
    try {
      await claimTicket(ticketId);
      await load();
      navigate({ to: "/platform/support/$ticketId", params: { ticketId } });
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "تعذر استلام التذكرة");
    }
  }

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/support"]}>
      <div className="platform-page sc-page" dir="rtl">
        <header className="platform-page-header">
          <div>
            <span>KOB Support Center</span>
            <h1>لوحة الدعم الفني</h1>
            <p>استلم التذاكر، تابع المحادثات، وابدأ الجلسات المباشرة من مساحة عمل واحدة.</p>
          </div>
          <div className="platform-live-pill">
            <i /> تحديث مباشر
          </div>
        </header>

        {error && (
          <div className="sc-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <section className="sc-stats">
          <article>
            <Headphones />
            <div>
              <b>{stats.inbox}</b>
              <span>بانتظار الاستلام</span>
            </div>
          </article>
          <article>
            <Radio />
            <div>
              <b>{stats.live}</b>
              <span>جلسات نشطة</span>
            </div>
          </article>
          <article>
            <CalendarClock />
            <div>
              <b>{stats.scheduled}</b>
              <span>مجدولة</span>
            </div>
          </article>
          <article>
            <AlertTriangle />
            <div>
              <b>{stats.critical}</b>
              <span>تذاكر حرجة</span>
            </div>
          </article>
        </section>

        <div className="sc-toolbar">
          <div className="support-tabs">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <label className="sc-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث برقم التذكرة أو الشركة..."
            />
          </label>
        </div>

        <div className="support-request-grid">
          {shown.map((ticket) => (
            <article key={ticket.id} className={`support-request-card priority-${ticket.priority}`}>
              <div className="support-request-top">
                <span>{ticket.ticketNumber}</span>
                <b>{priorityLabels[ticket.priority]}</b>
              </div>
              <h3>{ticket.subject}</h3>
              <p>{ticket.organization?.name_ar || ticket.organization?.name_en || "شركة"}</p>
              <div className="sc-card-status">
                <span className={`sc-status status-${ticket.status}`}>{statusLabels[ticket.status]}</span>
                <span className="sc-chip">{categoryLabels[ticket.category]}</span>
              </div>
              <footer>
                <time>{new Date(ticket.scheduledAt || ticket.createdAt).toLocaleString("ar-SA")}</time>
                <div className="sc-card-actions">
                  {["new", "waiting"].includes(ticket.status) && (
                    <button className="sc-ghost" onClick={() => void claim(ticket.id)}>
                      استلام
                    </button>
                  )}
                  <button
                    className="platform-primary-button"
                    onClick={() => navigate({ to: "/platform/support/$ticketId", params: { ticketId: ticket.id } })}
                  >
                    فتح التذكرة
                  </button>
                </div>
              </footer>
            </article>
          ))}
          {!shown.length && <div className="platform-empty">لا توجد تذاكر مطابقة.</div>}
        </div>
      </div>
    </PlatformGate>
  );
}
