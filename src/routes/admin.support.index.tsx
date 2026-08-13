import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Headphones, MessageSquarePlus, Radio, ShieldCheck } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useI18n } from "@/lib/i18n";
import { createTicket, listTickets } from "@/features/support/api";
import { uploadTicketFile } from "@/features/support/sessions";
import {
  categoryLabels,
  collectBrowserContext,
  OPEN_STATUSES,
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
  DataTable,
  Field,
  FileUpload,
  FormDialog,
  Input,
  kobToast,
  PageContainer,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  StatGrid,
  StatCard,
  StatusBadge,
  Textarea,
  Toggle,
  type Column,
} from "@/components/kob";

export const Route = createFileRoute("/admin/support/")({
  head: () => ({
    meta: [
      { title: "مركز الدعم — KOB" },
      { name: "description", content: "أنشئ تذاكر الدعم الفني وتابع المحادثات والجلسات المباشرة مع فريق KOB." },
      { property: "og:title", content: "مركز الدعم — KOB" },
      { property: "og:description", content: "تذاكر الدعم الفني والجلسات المباشرة داخل منصة KOB." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanySupportPortal,
});

const emptyForm = {
  category: "technical",
  priority: "medium",
  subject: "",
  description: "",
  sessionPreference: "none",
  scheduledAt: "",
  allowView: true,
  allowRemoteControl: false,
  allowVoice: false,
  allowRecording: false,
};

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

const PAGE_SIZE = 10;

function CompanySupportPortal() {
  const navigate = useNavigate();
  const { t, fmtDate } = useI18n();
  const { organization, membership } = useOrganization();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  async function load() {
    if (!organization) return;
    setLoading(true);
    try {
      setTickets(await listTickets(organization.id));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("support.list.load_error_title"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    if (!organization) return;
    const channel = supabase
      .channel(`company-tickets-${organization.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets", filter: `organization_id=eq.${organization.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization?.id]);

  const stats = useMemo(
    () => ({
      open: tickets.filter((item) => OPEN_STATUSES.includes(item.status)).length,
      waiting: tickets.filter((item) => item.status === "waiting_company").length,
      live: tickets.filter((item) => item.status === "live").length,
      resolved: tickets.filter((item) => ["resolved", "closed"].includes(item.status)).length,
    }),
    [tickets],
  );

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== "all" && ticket.status !== statusFilter) return false;
      if (priorityFilter !== "all" && ticket.priority !== priorityFilter) return false;
      if (q && !`${ticket.ticketNumber} ${ticket.subject}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const pagedTickets = filteredTickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  function closeDialog() {
    setOpen(false);
    setForm(emptyForm);
    setAttachments([]);
  }

  async function submit() {
    if (!organization) return;
    setCreating(true);
    try {
      const created = await createTicket({
        organizationId: organization.id,
        createdByMemberId: membership?.id ?? null,
        category: form.category,
        priority: form.priority,
        subject: form.subject,
        description: form.description,
        sessionPreference: form.sessionPreference,
        scheduledAt: form.sessionPreference === "scheduled" ? form.scheduledAt : null,
        allowView: form.allowView,
        allowRemoteControl: form.allowRemoteControl,
        allowVoice: form.allowVoice,
        allowRecording: form.allowRecording,
        context: collectBrowserContext(),
      });
      if (attachments.length) {
        try {
          for (const file of attachments) {
            await uploadTicketFile(created.id, file);
          }
        } catch {
          kobToast.error(t("support.form.attachment_error"));
        }
      }
      kobToast.success(t("support.form.create_success"));
      closeDialog();
      await load();
      navigate({ to: "/admin/support/$ticketId", params: { ticketId: created.id } });
    } catch (createError) {
      kobToast.error(createError instanceof Error ? createError.message : t("support.form.create_error"));
    } finally {
      setCreating(false);
    }
  }

  const columns: Column<Ticket>[] = [
    { key: "number", header: t("support.list.col_number"), render: (row) => row.ticketNumber },
    {
      key: "subject",
      header: t("support.list.col_subject"),
      render: (row) => (
        <div className="kob-min-w-0">
          <strong>{row.subject}</strong>
          <p className="kob-truncate-1">{row.description}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: t("support.list.col_status"),
      render: (row) => <StatusBadge tone={STATUS_TONE[row.status]}>{statusLabels[row.status]}</StatusBadge>,
    },
    {
      key: "priority",
      header: t("support.list.col_priority"),
      render: (row) => <Badge tone={PRIORITY_TONE[row.priority]}>{priorityLabels[row.priority]}</Badge>,
    },
    {
      key: "created",
      header: t("support.list.col_created"),
      render: (row) => fmtDate(row.createdAt),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="KOB Support Center"
        title={t("support.title")}
        description={t("support.subtitle")}
        action={
          <Button leadingIcon={<MessageSquarePlus size={16} />} onClick={() => setOpen(true)}>
            {t("support.new_ticket")}
          </Button>
        }
      />

      {error && <Alert tone="danger" title={t("support.list.load_error_title")}>{error}</Alert>}

      <StatGrid>
        <StatCard icon={<Headphones />} label={t("support.stats.open")} value={stats.open} />
        <StatCard icon={<ShieldCheck />} label={t("support.stats.waiting")} value={stats.waiting} tone="warning" />
        <StatCard icon={<Radio />} label={t("support.stats.live")} value={stats.live} tone="success" />
        <StatCard icon={<CheckCircle2 />} label={t("support.stats.resolved")} value={stats.resolved} tone="neutral" />
      </StatGrid>

      <div className="kob-toolbar">
        <SearchInput value={search} onValueChange={setSearch} placeholder={t("support.list.search_placeholder")} />
        <Select
          label={t("support.list.status_filter")}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">{t("support.list.all")}</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label={t("support.list.priority_filter")}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">{t("support.list.all")}</option>
          {Object.entries(priorityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={pagedTickets}
        rowKey={(row) => row.id}
        loading={loading}
        caption={t("support.list.title")}
        emptyTitle={t("support.list.empty_title")}
        emptyDescription={t("support.list.empty_description")}
        emptyAction={
          <Button leadingIcon={<MessageSquarePlus size={16} />} onClick={() => setOpen(true)}>
            {t("support.new_ticket")}
          </Button>
        }
      />

      {!loading && filteredTickets.length > 0 && (
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} total={filteredTickets.length} />
      )}

      <FormDialog
        open={open}
        onClose={closeDialog}
        title={t("support.form.title")}
        description={t("support.form.description")}
        onSubmit={() => void submit()}
        submitLabel={t("support.form.submit")}
        busy={creating}
        size="lg"
      >
        <div className="kob-form-grid">
          <Select
            label={t("support.form.category")}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            label={t("support.form.priority")}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Input
            className="kob-col-span-2"
            label={t("support.form.subject")}
            required
            maxLength={160}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <Textarea
            className="kob-col-span-2"
            label={t("support.form.description_field")}
            required
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label={t("support.form.session_preference")}
            value={form.sessionPreference}
            onChange={(e) => setForm({ ...form, sessionPreference: e.target.value })}
          >
            <option value="none">{t("support.form.session_none")}</option>
            <option value="chat">{t("support.form.session_chat")}</option>
            <option value="voice">{t("support.form.session_voice")}</option>
            <option value="scheduled">{t("support.form.session_scheduled")}</option>
            <option value="immediate">{t("support.form.session_immediate")}</option>
          </Select>
          {form.sessionPreference === "scheduled" && (
            <Input
              type="datetime-local"
              label={t("support.form.scheduled_at")}
              required
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          )}
        </div>

        <Field label={t("support.form.permissions_title")}>
          {() => (
            <div className="kob-toggle-list">
              <Toggle
                label={t("support.form.permission_view")}
                checked={form.allowView}
                onCheckedChange={(next) => setForm({ ...form, allowView: next })}
              />
              <Toggle
                label={t("support.form.permission_control")}
                checked={form.allowRemoteControl}
                onCheckedChange={(next) => setForm({ ...form, allowRemoteControl: next })}
              />
              <Toggle
                label={t("support.form.permission_voice")}
                checked={form.allowVoice}
                onCheckedChange={(next) => setForm({ ...form, allowVoice: next })}
              />
              <Toggle
                label={t("support.form.permission_recording")}
                checked={form.allowRecording}
                onCheckedChange={(next) => setForm({ ...form, allowRecording: next })}
              />
            </div>
          )}
        </Field>

        <FileUpload
          label={t("support.form.attachments")}
          hint={t("support.form.attachments_hint")}
          multiple
          onFiles={(files) => setAttachments((prev) => [...prev, ...files])}
        >
          {t("support.form.upload_cta")}
        </FileUpload>
        {attachments.length > 0 && (
          <ul className="kob-file-list">
            {attachments.map((file, index) => (
              <li key={`${file.name}-${index}`}>{file.name}</li>
            ))}
          </ul>
        )}
      </FormDialog>
    </PageContainer>
  );
}
