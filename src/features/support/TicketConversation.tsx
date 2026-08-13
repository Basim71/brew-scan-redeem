import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Lock, Send, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Badge, Button, Card, CardBody, CardHeader, EmptyState, Text, Textarea, Toggle } from "@/components/kob";

import { listEvents, listMessages, sendMessage } from "./api";
import { statusLabels, type TicketEvent, type TicketMessage, type TicketStatus } from "./types";

type Props = {
  ticketId: string;
  side: "company" | "agent";
};

export function TicketConversation({ ticketId, side }: Props) {
  const { t, lang } = useI18n();
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const includeInternal = side === "agent";
  const locale = lang === "ar" ? "ar-SA" : "en-US";

  const senderLabels: Record<string, string> = {
    company: t("support.conversation.senders.company"),
    agent: t("support.conversation.senders.agent"),
    system: t("support.conversation.senders.system"),
    ai: t("support.conversation.senders.ai"),
  };

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
      setError(loadError instanceof Error ? loadError.message : t("support.conversation.error"));
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
      setError(sendError instanceof Error ? sendError.message : t("support.conversation.sendError"));
    } finally {
      setSending(false);
    }
  }

  function describeEvent(event: TicketEvent): string {
    if (event.eventType === "ticket_created") return t("support.conversation.events.ticketCreated");
    if (event.eventType === "assigned") return t("support.conversation.events.assigned");
    if (event.eventType === "status_changed") {
      const from = event.fromStatus ? statusLabels[event.fromStatus as TicketStatus] ?? event.fromStatus : "-";
      const to = event.toStatus ? statusLabels[event.toStatus as TicketStatus] ?? event.toStatus : "-";
      return t("support.conversation.events.statusChanged", { from, to });
    }
    return event.message || event.eventType;
  }

  return (
    <div className="kob-grid kob-grid-cols-1 lg:kob-grid-cols-[2fr_1fr] kob-gap-4">
      <Card className="kob-flex kob-flex-col">
        <CardHeader
          title={t("support.conversation.title")}
          action={<Badge tone="neutral">{t("support.conversation.messageCount", { n: messages.length })}</Badge>}
        />
        <CardBody className="kob-flex kob-flex-col kob-gap-3">
          <div className="kob-flex kob-flex-col kob-gap-2 kob-max-h-[420px] kob-overflow-y-auto">
            {messages.map((message) => {
              const own = message.senderKind === side;
              return (
                <div
                  key={message.id}
                  className="kob-flex kob-flex-col kob-gap-1"
                  style={{ alignItems: own ? "flex-end" : "flex-start" }}
                >
                  <Card
                    tone={message.visibility === "internal" ? "engraved" : own ? "espresso" : "surface"}
                    className="kob-max-w-[85%]"
                  >
                    <CardBody className="kob-flex kob-flex-col kob-gap-1">
                      <div className="kob-flex kob-items-center kob-gap-2">
                        <Text variant="label" tone={own ? "inverse" : "primary"}>
                          {senderLabels[message.senderKind] ?? message.senderKind}
                        </Text>
                        {message.visibility === "internal" && (
                          <Badge tone="warning" icon={<Lock size={12} />}>
                            {t("support.conversation.internalNote")}
                          </Badge>
                        )}
                      </div>
                      <Text variant="body" tone={own ? "inverse" : "primary"}>
                        {message.body}
                      </Text>
                      <Text variant="caption" tone={own ? "inverse" : "muted"}>
                        {new Date(message.createdAt).toLocaleString(locale)}
                      </Text>
                    </CardBody>
                  </Card>
                </div>
              );
            })}
            {!messages.length && <EmptyState title={t("support.conversation.empty")} />}
            <div ref={endRef} />
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <form className="kob-flex kob-flex-col kob-gap-2" onSubmit={submit}>
            <Textarea
              rows={2}
              value={body}
              maxLength={4000}
              placeholder={t("support.conversation.placeholder")}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="kob-flex kob-items-center kob-justify-between kob-gap-2">
              {side === "agent" ? (
                <Toggle
                  label={t("support.conversation.internalNote")}
                  checked={internal}
                  onCheckedChange={setInternal}
                />
              ) : (
                <span />
              )}
              <Button
                type="submit"
                variant="primary"
                loading={sending}
                disabled={!body.trim()}
                leadingIcon={<Send size={16} />}
              >
                {t("support.conversation.send")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("support.conversation.timeline")} icon={<Sparkles size={16} />} />
        <CardBody>
          <ol className="kob-flex kob-flex-col kob-gap-3">
            {timeline.map((item) => (
              <li key={item.id} className="kob-flex kob-items-start kob-gap-2">
                <span className="kob-status-dot" data-tone="gold" aria-hidden />
                <div className="kob-flex kob-flex-col">
                  <Text variant="bodySm">{describeEvent(item)}</Text>
                  <Text variant="caption" tone="muted">
                    {new Date(item.createdAt).toLocaleString(locale)}
                  </Text>
                </div>
              </li>
            ))}
            {!timeline.length && (
              <li>
                <Text variant="bodySm" tone="muted">
                  {t("support.conversation.timelineEmpty")}
                </Text>
              </li>
            )}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
