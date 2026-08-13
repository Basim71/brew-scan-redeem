import { useCallback, useEffect, useState } from "react";
import { Check, MonitorPlay, Play, ShieldCheck, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Alert, Button, Card, CardBody, CardHeader, Select, Text } from "@/components/kob";

import { LiveSessionRoom } from "./LiveSessionRoom";
import {
  approveSession,
  getLiveSession,
  rejectSession,
  requestSession,
  startSession,
  touchPresence,
  type SessionMode,
  type TicketSession,
} from "./sessions";

type Props = {
  ticketId: string;
  organizationId: string;
  side: "company" | "agent";
};

/** Session lifecycle: request → company approval → live room → end. */
export function SessionPanel({ ticketId, organizationId, side }: Props) {
  const { t } = useI18n();
  const [session, setSession] = useState<TicketSession | null>(null);
  const [mode, setMode] = useState<SessionMode>("assist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeLabels: Record<SessionMode, string> = {
    view: t("support.session.mode.view"),
    assist: t("support.session.mode.assist"),
    control: t("support.session.mode.control"),
  };

  const load = useCallback(async () => {
    try {
      setSession(await getLiveSession(ticketId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t("support.session.errors.loadSession"));
    }
  }, [ticketId, t]);

  useEffect(() => {
    void load();
    void touchPresence("online", ticketId);
    const channel = supabase
      .channel(`ticket-sessions-${ticketId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ticket_sessions", filter: `ticket_id=eq.${ticketId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ticketId, load]);

  async function run(action: () => Promise<TicketSession>) {
    setBusy(true);
    setError(null);
    try {
      setSession(await action());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t("support.session.errors.action"));
    } finally {
      setBusy(false);
    }
  }

  if (session?.status === "active") {
    return (
      <LiveSessionRoom
        session={session}
        ticketId={ticketId}
        side={side}
        onSessionChange={(next) => setSession(next.status === "ended" ? null : next)}
      />
    );
  }

  return (
    <Card>
      <CardHeader title={t("support.session.panel.title")} icon={<MonitorPlay size={18} />} />
      <CardBody className="kob-flex kob-flex-col kob-gap-4">
        {error && <Alert tone="danger">{error}</Alert>}

        {!session && side === "agent" && (
          <>
            <Text variant="bodySm" tone="muted">
              {t("support.session.panel.agentHint")}
            </Text>
            <Select
              label={t("support.session.panel.modeLabel")}
              value={mode}
              onChange={(event) => setMode(event.target.value as SessionMode)}
            >
              {Object.entries(modeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Button
              variant="primary"
              loading={busy}
              leadingIcon={<ShieldCheck size={16} />}
              onClick={() => void run(() => requestSession({ ticketId, organizationId, mode }))}
            >
              {t("support.session.panel.requestButton")}
            </Button>
          </>
        )}

        {!session && side === "company" && (
          <Text variant="bodySm" tone="muted">
            {t("support.session.panel.noSessionCompany")}
          </Text>
        )}

        {session?.status === "requested" && side === "company" && (
          <>
            <Text variant="bodySm" tone="muted">
              {t("support.session.panel.requestedCompany", {
                mode: modeLabels[session.mode],
                time: session.approvalExpiresAt
                  ? new Date(session.approvalExpiresAt).toLocaleTimeString("ar-SA")
                  : "—",
              })}
            </Text>
            <div className="kob-flex kob-gap-2">
              <Button
                variant="primary"
                loading={busy}
                leadingIcon={<Check size={16} />}
                onClick={() => void run(() => approveSession(session.id))}
              >
                {t("support.session.panel.approve")}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                leadingIcon={<X size={16} />}
                onClick={() => void run(() => rejectSession(session.id))}
              >
                {t("support.session.panel.reject")}
              </Button>
            </div>
          </>
        )}

        {session?.status === "requested" && side === "agent" && (
          <Text variant="bodySm" tone="muted">
            {t("support.session.panel.requestedAgent")}
          </Text>
        )}

        {session?.status === "approved" && (
          <>
            <Text variant="bodySm" tone="muted">
              {t("support.session.panel.approvedCompany", { mode: modeLabels[session.mode] })}
            </Text>
            {side === "agent" ? (
              <Button
                variant="primary"
                loading={busy}
                leadingIcon={<Play size={16} />}
                onClick={() => void run(() => startSession(session.id))}
              >
                {t("support.session.panel.startSession")}
              </Button>
            ) : (
              <Text variant="bodySm" tone="muted">
                {t("support.session.panel.approvedAgent")}
              </Text>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
