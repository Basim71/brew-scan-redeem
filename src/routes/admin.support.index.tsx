import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/providers/OrganizationProvider";
import { useI18n } from "@/lib/i18n";
import { createTicket, listTickets } from "@/features/support/api";
import { uploadTicketFile } from "@/features/support/sessions";
import {
  collectBrowserContext,
  type Ticket,
  type TicketCategory,
} from "@/features/support/types";
import { CafePage } from "@/features/company/cafe/ui";

export const Route = createFileRoute("/admin/support/")({
  head: () => ({
    meta: [
      { title: "Support · KOB" },
      { name: "description", content: "Contact the KOB team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPage,
});

const TOPICS: Array<{ id: TicketCategory; key: string }> = [
  { id: "technical", key: "cafe.support.board" },
  { id: "payment", key: "cafe.support.payments" },
  { id: "subscription", key: "cafe.support.subs" },
  { id: "feature_request", key: "cafe.support.idea" },
  { id: "other", key: "cafe.support.other" },
];

function solved(status: string) {
  return status === "resolved" || status === "closed" || status === "cancelled";
}

function SupportPage() {
  const navigate = useNavigate();
  const { t, fmtDay } = useI18n();
  const { organization, membership } = useOrganization();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [topic, setTopic] = useState<TicketCategory>("technical");
  const [description, setDescription] = useState("");
  const [share, setShare] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!organization) return;
    try {
      setTickets(await listTickets(organization.id));
      setError(null);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.support.sendError"),
      );
    }
  }

  useEffect(() => {
    void load();
    if (!organization) return;
    const channel = supabase
      .channel(`company-tickets-${organization.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
          filter: `organization_id=eq.${organization.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organization?.id]);

  async function submit() {
    if (!organization || description.trim().length < 4) {
      setError(t("cafe.support.needText"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const label = t(
        TOPICS.find((item) => item.id === topic)?.key ?? "cafe.support.other",
      );
      const created = await createTicket({
        organizationId: organization.id,
        createdByMemberId: membership?.id ?? null,
        category: topic,
        priority: "medium",
        subject: label,
        description: description.trim(),
        sessionPreference: share ? "immediate" : "none",
        allowView: share,
        allowRemoteControl: false,
        allowVoice: false,
        allowRecording: false,
        context: collectBrowserContext(),
      });
      if (file) {
        try {
          await uploadTicketFile(created.id, file);
        } catch {
          setError(t("cafe.support.attachError"));
        }
      }
      setDescription("");
      setFile(null);
      setShare(false);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("cafe.support.sendError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <CafePage
      title={t("cafe.support.title")}
      subtitle={t("cafe.support.subtitle")}
    >
      {error ? <div className="cafe-error">{error}</div> : null}
      <div className="cafe-split">
        <section className="cafe-card">
          <h2>{t("cafe.support.need")}</h2>
          <span className="cafe-label">{t("cafe.support.about")}</span>
          <div className="cafe-chips">
            {TOPICS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={
                  topic === item.id ? "cafe-chip mini on" : "cafe-chip mini"
                }
                onClick={() => setTopic(item.id)}
              >
                {t(item.key)}
              </button>
            ))}
          </div>
          <label style={{ display: "block", marginTop: 14 }}>
            <span className="cafe-label">{t("cafe.support.write")}</span>
            <textarea
              className="cafe-input"
              rows={5}
              value={description}
              placeholder={t("cafe.support.placeholder")}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label
            className="cafe-more"
            style={{ marginTop: 12, display: "block" }}
          >
            {file ? file.name : t("cafe.support.attach")}
            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="cafe-sale">
            <div>
              <b>{t("cafe.support.share")}</b>
              <div className="cafe-muted">{t("cafe.support.shareHint")}</div>
            </div>
            <button
              type="button"
              className={share ? "cafe-switch" : "cafe-switch off"}
              onClick={() => setShare((value) => !value)}
            >
              <i />
            </button>
          </div>
          <button
            type="button"
            className="cafe-btn"
            style={{ width: "100%", marginTop: 8 }}
            disabled={busy}
            onClick={() => void submit()}
          >
            {t("cafe.support.send")}
          </button>
        </section>
        <section className="cafe-card">
          <h2>{t("cafe.support.past")}</h2>
          {tickets.length === 0 ? (
            <div className="cafe-empty">{t("cafe.support.empty")}</div>
          ) : null}
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className="cafe-row"
              style={{
                width: "100%",
                border: 0,
                cursor: "pointer",
                textAlign: "inherit",
              }}
              onClick={() =>
                navigate({
                  to: "/admin/support/$ticketId",
                  params: { ticketId: ticket.id },
                })
              }
            >
              <span className="n">
                <b>{ticket.subject}</b>
                <div>
                  {ticket.description} · {fmtDay(ticket.createdAt)} ·{" "}
                  {ticket.ticketNumber}
                </div>
              </span>
              <span
                className={
                  solved(ticket.status) ? "cafe-status" : "cafe-status warn"
                }
              >
                {solved(ticket.status)
                  ? t("cafe.support.solved")
                  : t("cafe.support.open")}
              </span>
            </button>
          ))}
          <p className="cafe-note">{t("cafe.support.replyHint")}</p>
        </section>
      </div>
    </CafePage>
  );
}
