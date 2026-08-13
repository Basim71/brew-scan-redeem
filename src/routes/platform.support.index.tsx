import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Headphones, Radio, Search, UserCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { claimTicket, listTickets } from "@/features/support/api";
import { categoryLabels, priorityLabels, statusLabels, type Ticket, type TicketPriority } from "@/features/support/types";
import { useI18n } from "@/lib/i18n";
import {
  Badge,
  type BadgeTone,
  Button,
  DataTable,
  type Column,
  ErrorState,
  Pagination,
  PageContainer,
  SearchInput,
  SectionHeader,
  StatCard,
  StatGrid,
  StatusBadge,
  type StatusTone,
  Tabs,
  kobToast,
} from "@/components/kob";

export const Route = createFileRoute("/platform/support/")({
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

const STATUS_TONE: Record<Ticket["status"], StatusTone> = {
  new: "info",
  waiting: "warning",
  accepted: "info",
  assigned: "info",
  waiting_company: "warning",
  scheduled: "info",
  live: "success",
  resolved: "success",
  closed: "neutral",
  cancelled: "neutral",
  rejected: "error",
};

const PRIORITY_TONE: Record<TicketPriority, BadgeTone> = {
  critical: "error",
  high: "warning",
  medium: "info",
  low: "neutral",
};

/** SLA thresholds in minutes per priority — presentation-only, derived from existing timestamps. */
const SLA_THRESHOLD_MINUTES: Record<TicketPriority, number> = {
  critical: 30,
  high: 60,
  medium: 240,
  low: 480,
};

const CLOSED_STATUSES: Ticket["status"][] = ["resolved", "closed", "cancelled", "rejected"];

function getSlaTone(ticket: Ticket): { tone: BadgeTone; key: "ok" | "warning" | "danger" | "done" } {
  if (CLOSED_STATUSES.includes(ticket.status)) return { tone: "neutral", key: "done" };
  const reference = ticket.firstResponseAt ?? ticket.createdAt;
  const ageMinutes = (Date.now() - new Date(reference).getTime()) / 60000;
  const threshold = SLA_THRESHOLD_MINUTES[ticket.priority];
  if (ageMinutes < threshold * 0.6) return { tone: "success", key: "ok" };
  if (ageMinutes < threshold) return { tone: "warning", key: "warning" };
  return { tone: "error", key: "danger" };
}

const PAGE_SIZE = 10;

function PlatformSupportDashboard() {
  const navigate = useNavigate();
  const { t, fmtDate } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("inbox");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setTickets(await listTickets());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("support.queue.loadError"));
    } finally {
      setLoading(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  const TABS = [
    { id: "inbox", label: t("support.queue.tabs.inbox"), icon: <UserCheck size={16} /> },
    { id: "mine", label: t("support.queue.tabs.mine"), icon: <Headphones size={16} /> },
    { id: "live", label: t("support.queue.tabs.live"), icon: <Radio size={16} /> },
    { id: "scheduled", label: t("support.queue.tabs.scheduled"), icon: <CalendarClock size={16} /> },
    { id: "closed", label: t("support.queue.tabs.closed"), icon: <CheckCircle2 size={16} /> },
    { id: "all", label: t("support.queue.tabs.all"), icon: <Search size={16} /> },
  ];

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
          (tab === "closed" && CLOSED_STATUSES.includes(ticket.status));
        return matches && tabMatch;
      }),
    [tickets, search, tab, userId],
  );

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      kobToast.success(t("support.queue.claimed"), t("support.queue.claimedDescription"));
      navigate({ to: "/platform/support/$ticketId", params: { ticketId } });
    } catch (claimError) {
      kobToast.error(t("support.queue.claimError"));
    }
  }

  const columns: Column<Ticket>[] = [
    {
      key: "ticket",
      header: t("support.queue.table.ticket"),
      render: (ticket) => (
        <div className="kob-min-w-0">
          <strong>{ticket.ticketNumber}</strong>
          <div>{ticket.subject}</div>
        </div>
      ),
    },
    {
      key: "company",
      header: t("support.queue.table.company"),
      render: (ticket) => ticket.organization?.name_ar || ticket.organization?.name_en || "-",
    },
    {
      key: "status",
      header: t("support.queue.table.status"),
      render: (ticket) => <StatusBadge tone={STATUS_TONE[ticket.status]}>{statusLabels[ticket.status]}</StatusBadge>,
    },
    {
      key: "priority",
      header: t("support.queue.table.priority"),
      render: (ticket) => <Badge tone={PRIORITY_TONE[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>,
    },
    {
      key: "sla",
      header: t("support.queue.table.sla"),
      render: (ticket) => {
        const sla = getSlaTone(ticket);
        return <Badge tone={sla.tone}>{t(`support.queue.sla.${sla.key}`)}</Badge>;
      },
    },
    {
      key: "updated",
      header: t("support.queue.table.updated"),
      render: (ticket) => fmtDate(ticket.scheduledAt || ticket.createdAt),
    },
    {
      key: "actions",
      header: t("support.queue.table.actions"),
      align: "end",
      render: (ticket) => (
        <div className="kob-row-actions">
          {["new", "waiting"].includes(ticket.status) && (
            <Button size="sm" variant="secondary" onClick={() => void claim(ticket.id)}>
              {t("support.queue.claim")}
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate({ to: "/platform/support/$ticketId", params: { ticketId: ticket.id } })}
          >
            {t("support.queue.open")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/support"]}>
      <PageContainer size="xl">
        <SectionHeader
          title={t("support.queue.title")}
          description={t("support.queue.subtitle")}
          action={
            <Badge tone="success" icon={<Radio size={13} />}>
              {t("support.queue.liveUpdates")}
            </Badge>
          }
        />

        {error && <ErrorState description={error} onRetry={() => void load()} />}

        <StatGrid>
          <StatCard icon={<Headphones size={18} />} label={t("support.queue.stats.inbox")} value={stats.inbox} />
          <StatCard icon={<Radio size={18} />} label={t("support.queue.stats.live")} value={stats.live} tone="success" />
          <StatCard icon={<CalendarClock size={18} />} label={t("support.queue.stats.scheduled")} value={stats.scheduled} tone="info" />
          <StatCard icon={<AlertTriangle size={18} />} label={t("support.queue.stats.critical")} value={stats.critical} tone="danger" />
        </StatGrid>

        <div className="kob-toolbar">
          <Tabs items={TABS} value={tab} onChange={setTab} ariaLabel={t("support.queue.title")} />
          <SearchInput value={search} onValueChange={setSearch} placeholder={t("support.queue.searchPlaceholder")} />
        </div>

        <DataTable
          columns={columns}
          rows={pageRows}
          rowKey={(row) => row.id}
          loading={loading}
          caption={t("support.queue.table.caption")}
          emptyTitle={t("support.queue.emptyTitle")}
          emptyDescription={t("support.queue.emptyDescription")}
        />

        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} total={shown.length} />
      </PageContainer>
    </PlatformGate>
  );
}
