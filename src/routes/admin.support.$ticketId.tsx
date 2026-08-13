import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, MonitorPlay, Star } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { TicketConversation } from "@/features/support/TicketConversation";
import { SessionPanel } from "@/features/support/SessionPanel";
import { getRating, getTicket, setTicketStatus, submitRating, updateTicket } from "@/features/support/api";
import {
  categoryLabels,
  priorityLabels,
  statusLabels,
  type Ticket,
  type TicketPriority,
  type TicketStatus,
} from "@/features/support/types";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  IconButton,
  kobToast,
  LoadingState,
  PageContainer,
  PageHeader,
  StatusBadge,
  Textarea,
} from "@/components/kob";

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

const PERMISSIONS: Array<{ key: keyof Ticket; column: string; labelKey: string }> = [
  { key: "allowView", column: "allow_view", labelKey: "support.form.permission_view" },
  { key: "allowRemoteControl", column: "allow_remote_control", labelKey: "support.form.permission_control" },
  { key: "allowVoice", column: "allow_voice", labelKey: "support.form.permission_voice" },
  { key: "allowRecording", column: "allow_recording", labelKey: "support.form.permission_recording" },
];

const STATUS_TONE: Record<TicketStatus, "success" | "warning" | "error" | "info" | "neutral"> = {
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

const PRIORITY_TONE: Record<TicketPriority, "success" | "warning" | "error" | "info" | "neutral"> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "error",
};

function CompanyTicketDetail() {
  const { ticketId } = useParams({ from: "/admin/support/$ticketId" });
  const navigate = useNavigate();
  const { t } = useI18n();
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
      setError(loadError instanceof Error ? loadError.message : t("support.detail.load_error_title"));
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
      kobToast.success(t("support.detail.permission_update_success"));
    } catch (toggleError) {
      kobToast.error(
        toggleError instanceof Error ? toggleError.message : t("support.detail.permission_update_error"),
      );
    }
  }

  async function close() {
    try {
      setTicket(await setTicketStatus(ticketId, "closed"));
      kobToast.success(t("support.detail.close_success"));
    } catch (closeError) {
      kobToast.error(closeError instanceof Error ? closeError.message : t("support.detail.close_error"));
    }
  }

  async function rate() {
    try {
      await submitRating({ ticketId, rating: stars, resolved: true, comment });
      setComment("");
      await load();
      kobToast.success(t("support.detail.rating_success"));
    } catch (rateError) {
      kobToast.error(rateError instanceof Error ? rateError.message : t("support.detail.rating_error"));
    }
  }

  if (!ticket) {
    return (
      <PageContainer>
        {error ? <Alert tone="danger" title={t("support.detail.load_error_title")}>{error}</Alert> : <LoadingState label={t("support.detail.loading")} />}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Button variant="ghost" leadingIcon={<ArrowRight size={16} />} onClick={() => navigate({ to: "/admin/support" })}>
        {t("support.back_to_tickets")}
      </Button>

      <PageHeader
        eyebrow={ticket.ticketNumber}
        title={ticket.subject}
        description={ticket.description}
        action={
          <div className="kob-inline-badges">
            <StatusBadge tone={STATUS_TONE[ticket.status]}>{statusLabels[ticket.status]}</StatusBadge>
            <Badge tone={PRIORITY_TONE[ticket.priority]}>{priorityLabels[ticket.priority]}</Badge>
            <Badge tone="neutral">{categoryLabels[ticket.category]}</Badge>
          </div>
        }
      />

      {error && <Alert tone="danger" title={t("support.detail.load_error_title")}>{error}</Alert>}

      <SessionPanel ticketId={ticket.id} organizationId={ticket.organizationId} side="company" />

      <div className="kob-detail-grid">
        <TicketConversation ticketId={ticket.id} side="company" />

        <aside className="kob-side-stack">
          <Card>
            <CardHeader
              title={
                <span className="kob-inline-icon">
                  <MonitorPlay size={16} /> {t("support.detail.permissions_title")}
                </span>
              }
            />
            <CardBody>
              <p className="kob-hint">{t("support.detail.permissions_hint")}</p>
              <div className="kob-toggle-list">
                {PERMISSIONS.map((permission) => (
                  <label key={permission.column} className="kob-switch-row">
                    <span>{t(permission.labelKey)}</span>
                    <input
                      type="checkbox"
                      className="kob-toggle-input"
                      checked={Boolean(ticket[permission.key])}
                      onChange={(event) => void togglePermission(permission.column, event.target.checked)}
                    />
                  </label>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("support.detail.context_title")} />
            <CardBody>
              <ul className="kob-context-list">
                {Object.entries(ticket.context ?? {}).map(([key, value]) => (
                  <li key={key}>
                    <b>{key}</b>
                    <span>{String(value)}</span>
                  </li>
                ))}
                {!Object.keys(ticket.context ?? {}).length && (
                  <li className="kob-hint">{t("support.detail.context_empty")}</li>
                )}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title={
                <span className="kob-inline-icon">
                  <Star size={16} /> {t("support.detail.rating_title")}
                </span>
              }
            />
            <CardBody>
              {rating ? (
                <p className="kob-hint">{t("support.detail.rating_submitted", { rating: rating.rating })}</p>
              ) : (
                <>
                  <div className="kob-star-row">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <IconButton
                        key={value}
                        label={t("support.detail.star_label", { value })}
                        variant="ghost"
                        size="sm"
                        data-active={value <= stars || undefined}
                        onClick={() => setStars(value)}
                      >
                        <Star size={18} />
                      </IconButton>
                    ))}
                  </div>
                  <Textarea
                    rows={3}
                    value={comment}
                    placeholder={t("support.detail.rating_comment_placeholder")}
                    onChange={(event) => setComment(event.target.value)}
                  />
                  <Button block onClick={() => void rate()}>
                    {t("support.detail.rating_submit")}
                  </Button>
                </>
              )}
            </CardBody>
          </Card>

          {!["closed", "cancelled"].includes(ticket.status) && (
            <Button variant="secondary" block onClick={() => void close()}>
              {t("support.detail.close_ticket")}
            </Button>
          )}
        </aside>
      </div>
    </PageContainer>
  );
}
