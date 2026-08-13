import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Download, History, MonitorPlay, Paperclip, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PlatformGate } from "@/features/platform/PlatformGate";
import { ROLE_MATRIX } from "@/features/platform/access";
import { TicketConversation } from "@/features/support/TicketConversation";
import { SessionPanel } from "@/features/support/SessionPanel";
import { AgentAssistPanel } from "@/features/support/AgentAssistPanel";
import { claimTicket, getTicket, setTicketStatus, updateTicket } from "@/features/support/api";
import { getFileUrl, listTicketFiles, touchPresence, type TicketFile } from "@/features/support/sessions";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
  type Ticket,
  type TicketStatus,
} from "@/features/support/types";
import { useI18n } from "@/lib/i18n";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  LoadingState,
  PageContainer,
  Select,
  StatusBadge,
  StatusDot,
  type StatusTone,
  kobToast,
} from "@/components/kob";

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

const STATUS_TONE: Record<TicketStatus, StatusTone> = {
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

const PERMISSION_ROWS: Array<{ key: keyof Ticket }> = [
  { key: "allowView" },
  { key: "allowRemoteControl" },
  { key: "allowVoice" },
  { key: "allowRecording" },
];

type TimelineEvent = {
  id: number;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  message: string | null;
  createdAt: string;
};

function PlatformTicketDetail() {
  const { ticketId } = useParams({ from: "/platform/support/$ticketId" });
  const navigate = useNavigate();
  const { t, fmtDate } = useI18n();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [files, setFiles] = useState<TicketFile[]>([]);

  async function load() {
    try {
      setTicket(await getTicket(ticketId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("support.queue.loadError"));
    }
  }

  async function loadTimeline() {
    const { data } = await (supabase as any)
      .from("ticket_events")
      .select("id, event_type, from_status, to_status, message, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false })
      .limit(20);
    setEvents(
      (data ?? []).map((row: any) => ({
        id: row.id,
        eventType: row.event_type,
        fromStatus: row.from_status ?? null,
        toStatus: row.to_status ?? null,
        message: row.message ?? null,
        createdAt: row.created_at,
      })),
    );
  }

  async function loadFiles() {
    try {
      setFiles(await listTicketFiles(ticketId));
    } catch {
      setFiles([]);
    }
  }

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void load();
    void loadTimeline();
    void loadFiles();
    void touchPresence("online", ticketId);
    const channel = supabase
      .channel(`platform-ticket-${ticketId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `id=eq.${ticketId}` }, () => {
        void load();
        void loadTimeline();
      })
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
      kobToast.error(t("support.detail.statusError"));
    }
  }

  async function assignToMe() {
    try {
      setTicket(await claimTicket(ticketId));
      kobToast.success(t("support.queue.claimed"), t("support.queue.claimedDescription"));
    } catch (claimError) {
      kobToast.error(t("support.detail.claimError"));
    }
  }

  async function bumpPriority(priority: string) {
    try {
      setTicket(await updateTicket(ticketId, { priority }));
    } catch (priorityError) {
      kobToast.error(t("support.detail.priorityError"));
    }
  }

  async function download(file: TicketFile) {
    const url = await getFileUrl(file);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!ticket) {
    return (
      <PlatformGate allow={ROLE_MATRIX["/platform/support"]}>
        <PageContainer size="xl">
          {error ? <EmptyState title={error} /> : <LoadingState label={t("support.detail.loading")} />}
        </PageContainer>
      </PlatformGate>
    );
  }

  const isMine = ticket.assignedAgentUserId === userId;

  return (
    <PlatformGate allow={ROLE_MATRIX["/platform/support"]}>
      <PageContainer size="xl">
        <Button variant="ghost" size="sm" leadingIcon={<ArrowRight size={16} />} onClick={() => navigate({ to: "/platform/support" })}>
          {t("support.detail.back")}
        </Button>

        <div className="kob-detail-head">
          <div>
            <span>{ticket.ticketNumber}</span>
            <h1>{ticket.subject}</h1>
            <p>{ticket.description}</p>
          </div>
          <div className="kob-detail-badges">
            <StatusBadge tone={STATUS_TONE[ticket.status]}>{statusLabels[ticket.status]}</StatusBadge>
            <Badge tone="warning">{priorityLabels[ticket.priority]}</Badge>
            <Badge tone="neutral">{categoryLabels[ticket.category]}</Badge>
            <StatusDot tone="success" label={t("support.detail.presenceOnline")} />
          </div>
        </div>

        {error && <EmptyState title={error} />}

        <SessionPanel ticketId={ticket.id} organizationId={ticket.organizationId} side="agent" />

        <div className="kob-detail-grid">
          <div className="kob-detail-main">
            <Card>
              <CardHeader title={t("support.detail.customerInfo")} />
              <CardBody>
                <dl className="kob-desc-list">
                  <div>
                    <dt>{t("support.detail.company")}</dt>
                    <dd>{ticket.organization?.name_ar || ticket.organization?.name_en || "-"}</dd>
                  </div>
                  <div>
                    <dt>{t("support.detail.ticketNumber")}</dt>
                    <dd>{ticket.ticketNumber}</dd>
                  </div>
                  <div>
                    <dt>{t("support.detail.createdAt")}</dt>
                    <dd>{fmtDate(ticket.createdAt)}</dd>
                  </div>
                  {ticket.scheduledAt && (
                    <div>
                      <dt>{t("support.detail.scheduledAt")}</dt>
                      <dd>{fmtDate(ticket.scheduledAt)}</dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>

            <TicketConversation ticketId={ticket.id} side="agent" />

            <Card>
              <CardHeader title={t("support.detail.timeline")} icon={<History size={16} />} />
              <CardBody>
                {events.length ? (
                  <ul className="kob-timeline">
                    {events.map((event) => (
                      <li key={event.id}>
                        <b>{event.toStatus ? statusLabels[event.toStatus as TicketStatus] ?? event.toStatus : event.eventType}</b>
                        {event.message ? <p>{event.message}</p> : null}
                        <time>{fmtDate(event.createdAt)}</time>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t("support.detail.timelineEmpty")} />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("support.detail.attachments")} icon={<Paperclip size={16} />} />
              <CardBody>
                {files.length ? (
                  <ul className="kob-file-list">
                    {files.map((file) => (
                      <li key={file.id}>
                        <span>{file.fileName}</span>
                        <Button size="sm" variant="ghost" leadingIcon={<Download size={14} />} onClick={() => void download(file)}>
                          {t("support.detail.download")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t("support.detail.attachmentsEmpty")} />
                )}
              </CardBody>
            </Card>
          </div>

          <aside className="kob-detail-side">
            <Card>
              <CardHeader title={t("support.detail.management")} icon={<ShieldCheck size={16} />} />
              <CardBody>
                {!isMine && (
                  <Button variant="primary" block onClick={() => void assignToMe()}>
                    {t("support.detail.assignToMe")}
                  </Button>
                )}
                {isMine && <p className="kob-hint">{t("support.detail.assignedToYou")}</p>}
                <Select label={t("support.detail.priority")} value={ticket.priority} onChange={(event) => void bumpPriority(event.target.value)}>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <div className="kob-field">
                  <label>{t("support.detail.statusActions")}</label>
                  <div className="kob-status-actions">
                    {STATUS_ACTIONS.map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={ticket.status === status ? "primary" : "secondary"}
                        onClick={() => void changeStatus(status)}
                      >
                        {statusLabels[status]}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t("support.detail.companyPermissions")} icon={<MonitorPlay size={16} />} />
              <CardBody>
                <p className="kob-hint">{t("support.detail.permissionsHint")}</p>
                {PERMISSION_ROWS.map((row) => (
                  <div key={String(row.key)} className="kob-perm-row">
                    <span>{t(`support.permissions.${String(row.key)}`)}</span>
                    <Badge tone={ticket[row.key] ? "success" : "neutral"}>
                      {ticket[row.key] ? t("support.detail.allowed") : t("support.detail.notAllowed")}
                    </Badge>
                  </div>
                ))}
              </CardBody>
            </Card>

            <AgentAssistPanel ticketId={ticket.id} />

            <Card>
              <CardHeader title={t("support.detail.context")} />
              <CardBody>
                <dl className="kob-desc-list">
                  <div>
                    <dt>{t("support.detail.company")}</dt>
                    <dd>{ticket.organization?.name_ar || ticket.organization?.name_en || "-"}</dd>
                  </div>
                  {Object.entries(ticket.context ?? {}).map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </aside>
        </div>
      </PageContainer>
    </PlatformGate>
  );
}
