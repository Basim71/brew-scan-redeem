import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Circle,
  Compass,
  Crosshair,
  MonitorPlay,
  MonitorUp,
  MousePointer2,
  Paperclip,
  PhoneOff,
  Send,
  ShieldOff,
  Video,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  IconButton,
  Input,
  StatusDot,
  Text,
  Toggle,
} from "@/components/kob";

import { listMessages, sendMessage } from "./api";
import {
  endSession,
  getFileUrl,
  listActivity,
  listPermissions,
  listTicketFiles,
  logActivity,
  PERMISSION_KEYS,
  saveRecording,
  setPermission,
  setSessionFlags,
  uploadTicketFile,
  type ActivityRow,
  type PermissionKey,
  type TicketFile,
  type TicketSession,
} from "./sessions";
import type { TicketMessage } from "./types";

type Side = "company" | "agent";

type Props = {
  session: TicketSession;
  ticketId: string;
  side: Side;
  onSessionChange?: (session: TicketSession) => void;
};

type CoControlAction =
  | { type: "navigate"; path: string }
  | { type: "highlight"; selector: string }
  | { type: "scroll"; direction: "top" | "bottom" };

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
};

const QUICK_PATHS: Array<{ key: string; path: string }> = [
  { key: "admin", path: "/admin" },
  { key: "plans", path: "/admin/plans" },
  { key: "coupons", path: "/admin/coupons" },
  { key: "drinks", path: "/admin/drinks" },
  { key: "settings", path: "/admin/settings" },
];

export function LiveSessionRoom({ session, ticketId, side, onSessionChange }: Props) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const channelRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);

  const locale = lang === "ar" ? "ar-SA" : "en-US";

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [files, setFiles] = useState<TicketFile[]>([]);
  const [body, setBody] = useState("");
  const [peers, setPeers] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [pathInput, setPathInput] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);

  const coControlAllowed = Boolean(permissions.co_control);
  const screenAllowed = Boolean(permissions.screen_share);
  const recordingAllowed = Boolean(permissions.recording);

  const permissionLabels: Record<PermissionKey, string> = {
    co_control: t("support.session.permissions.coControl"),
    screen_share: t("support.session.permissions.screenShare"),
    recording: t("support.session.permissions.recording"),
    voice: t("support.session.permissions.voice"),
    files: t("support.session.permissions.files"),
  };

  const actionLabels: Record<string, string> = {
    session_requested: t("support.session.log.actions.session_requested"),
    session_approved: t("support.session.log.actions.session_approved"),
    session_rejected: t("support.session.log.actions.session_rejected"),
    session_started: t("support.session.log.actions.session_started"),
    session_ended: t("support.session.log.actions.session_ended"),
    permission_granted: t("support.session.log.actions.permission_granted"),
    permission_revoked: t("support.session.log.actions.permission_revoked"),
    screen_share_started: t("support.session.log.actions.screen_share_started"),
    screen_share_stopped: t("support.session.log.actions.screen_share_stopped"),
    recording_started: t("support.session.log.actions.recording_started"),
    recording_saved: t("support.session.log.actions.recording_saved"),
    co_control_navigate: t("support.session.log.actions.co_control_navigate"),
    co_control_highlight: t("support.session.log.actions.co_control_highlight"),
    co_control_scroll: t("support.session.log.actions.co_control_scroll"),
    file_shared: t("support.session.log.actions.file_shared"),
  };

  function describeAction(action: string): string {
    return actionLabels[action] ?? action;
  }

  const refreshMeta = useCallback(async () => {
    try {
      const [perm, log, msgs, fileRows] = await Promise.all([
        listPermissions(session.id),
        listActivity(session.id),
        listMessages(ticketId, side === "agent"),
        listTicketFiles(ticketId),
      ]);
      const map: Record<string, boolean> = {};
      perm.forEach((row) => {
        map[row.permission] = row.granted;
      });
      setPermissions(map);
      setActivity(log);
      setMessages(msgs);
      setFiles(fileRows);
    } catch (metaError) {
      setError(metaError instanceof Error ? metaError.message : t("support.session.errors.loadMeta"));
    }
  }, [session.id, ticketId, side, t]);

  /* ------------ realtime channel: signaling + presence + cursor + co-control ------------ */
  useEffect(() => {
    void refreshMeta();
    const channel = supabase.channel(`kob-session-${session.id}`, {
      config: { presence: { key: side } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        setPeers(Object.keys(channel.presenceState() ?? {}));
      })
      .on("broadcast", { event: "signal" }, ({ payload }: any) => {
        void handleSignal(payload);
      })
      .on("broadcast", { event: "cursor" }, ({ payload }: any) => {
        if (side === "company") setCursor({ x: payload.x, y: payload.y });
      })
      .on("broadcast", { event: "co_control" }, ({ payload }: any) => {
        if (side === "company") void applyCoControl(payload as CoControlAction);
      })
      .on("broadcast", { event: "refresh" }, () => {
        void refreshMeta();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_permissions", filter: `session_id=eq.${session.id}` },
        () => void refreshMeta(),
      )
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ side, at: new Date().toISOString() });
        }
      });

    return () => {
      cleanupPeer();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, side]);

  function broadcast(event: string, payload: unknown) {
    channelRef.current?.send({ type: "broadcast", event, payload });
  }

  function cleanupPeer() {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setSharing(false);
    setReceiving(false);
    setRecording(false);
  }

  /* ------------ WebRTC ------------ */

  function createPeer(): RTCPeerConnection {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pc.onicecandidate = (event) => {
      if (event.candidate) broadcast("signal", { kind: "ice", from: side, candidate: event.candidate.toJSON() });
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
        void remoteVideoRef.current.play().catch(() => undefined);
        setReceiving(true);
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function handleSignal(payload: any) {
    if (!payload || payload.from === side) return;
    try {
      if (payload.kind === "offer" && side === "agent") {
        const pc = pcRef.current ?? createPeer();
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        broadcast("signal", { kind: "answer", from: side, sdp: answer });
      } else if (payload.kind === "answer" && side === "company") {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      } else if (payload.kind === "ice") {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      } else if (payload.kind === "stopped") {
        if (side === "agent") {
          cleanupPeer();
        }
      }
    } catch (signalError) {
      setError(signalError instanceof Error ? signalError.message : t("support.session.errors.signal"));
    }
  }

  /** Company-only: publish the KOB screen to the agent. */
  async function startScreenShare() {
    if (!screenAllowed) {
      setError(t("support.session.errors.shareNotAllowed"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      localStreamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => void stopScreenShare());
      const pc = createPeer();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      broadcast("signal", { kind: "offer", from: side, sdp: offer });
      setSharing(true);
      await setSessionFlags(session.id, { screen_share_active: true, current_path: window.location.pathname });
      await logActivity(session.id, "screen_share_started", { path: window.location.pathname });
      broadcast("refresh", {});
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : t("support.session.errors.startShare"));
    }
  }

  async function stopScreenShare() {
    broadcast("signal", { kind: "stopped", from: side });
    cleanupPeer();
    await setSessionFlags(session.id, { screen_share_active: false });
    await logActivity(session.id, "screen_share_stopped", {});
    broadcast("refresh", {});
  }

  /* ------------ recording (agent side, on the received stream) ------------ */

  function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    const stream = (remoteVideoRef.current?.srcObject as MediaStream | null) ?? null;
    if (!stream) {
      setError(t("support.session.errors.noStream"));
      return;
    }
    if (!recordingAllowed) {
      setError(t("support.session.errors.recordingNotAllowed"));
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    chunksRef.current = [];
    recordStartRef.current = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      setRecording(false);
      try {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        await saveRecording({
          ticketId,
          sessionId: session.id,
          blob,
          durationSeconds: (Date.now() - recordStartRef.current) / 1000,
        });
        await setSessionFlags(session.id, { recording_active: false });
        broadcast("refresh", {});
        void refreshMeta();
      } catch (recordError) {
        setError(recordError instanceof Error ? recordError.message : t("support.session.errors.saveRecording"));
      }
    };
    recorder.start(1000);
    recorderRef.current = recorder;
    setRecording(true);
    void setSessionFlags(session.id, { recording_active: true });
    void logActivity(session.id, "recording_started", {});
    broadcast("refresh", {});
  }

  /* ------------ scoped co-control ------------ */

  async function applyCoControl(action: CoControlAction) {
    if (!coControlAllowed) return;
    if (action.type === "navigate") {
      if (!action.path.startsWith("/")) return;
      await logActivity(session.id, "co_control_navigate", { path: action.path });
      void navigate({ to: action.path as never });
    } else if (action.type === "highlight") {
      setHighlight(action.selector);
      await logActivity(session.id, "co_control_highlight", { selector: action.selector });
      window.setTimeout(() => setHighlight(null), 4000);
    } else if (action.type === "scroll") {
      window.scrollTo({ top: action.direction === "top" ? 0 : document.body.scrollHeight, behavior: "smooth" });
      await logActivity(session.id, "co_control_scroll", { direction: action.direction });
    }
    broadcast("refresh", {});
  }

  function sendCoControl(action: CoControlAction) {
    if (!coControlAllowed) {
      setError(t("support.session.errors.coControlNotAllowed"));
      return;
    }
    broadcast("co_control", action);
  }

  /* ------------ permissions (company only) ------------ */

  async function togglePermission(key: PermissionKey, granted: boolean) {
    setBusy(true);
    try {
      await setPermission(session.id, key, granted);
      if (!granted && key === "screen_share" && sharing) await stopScreenShare();
      await refreshMeta();
      broadcast("refresh", {});
    } catch (permError) {
      setError(permError instanceof Error ? permError.message : t("support.session.errors.updatePermission"));
    } finally {
      setBusy(false);
    }
  }

  async function revokeAll() {
    setBusy(true);
    try {
      for (const key of PERMISSION_KEYS) await setPermission(session.id, key, false);
      if (sharing) await stopScreenShare();
      await refreshMeta();
      broadcast("refresh", {});
    } finally {
      setBusy(false);
    }
  }

  /* ------------ chat + files ------------ */

  async function submitMessage() {
    if (!body.trim()) return;
    try {
      await sendMessage({ ticketId, body, senderKind: side });
      setBody("");
      await refreshMeta();
      broadcast("refresh", {});
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : t("support.session.errors.sendMessage"));
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      await uploadTicketFile(ticketId, file);
      await logActivity(session.id, "file_shared", { name: file.name });
      await refreshMeta();
      broadcast("refresh", {});
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("support.session.errors.uploadFile"));
    } finally {
      setBusy(false);
    }
  }

  async function openFile(file: TicketFile) {
    const url = await getFileUrl(file);
    if (url) window.open(url, "_blank", "noopener");
  }

  async function finish() {
    setBusy(true);
    try {
      const next = await endSession(session.id, side === "company" ? "company_ended" : "agent_ended");
      cleanupPeer();
      onSessionChange?.(next);
      broadcast("refresh", {});
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : t("support.session.errors.endSession"));
    } finally {
      setBusy(false);
    }
  }

  /* ------------ highlight overlay on company side ------------ */
  useEffect(() => {
    if (!highlight) return;
    const element = document.querySelector(highlight);
    if (!element) return;
    element.classList.add("kob-cocontrol-highlight");
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => element.classList.remove("kob-cocontrol-highlight");
  }, [highlight]);

  const bothPresent = peers.includes("company") && peers.includes("agent");
  const chat = useMemo(() => messages.slice(-40), [messages]);

  const modeLabel =
    session.mode === "control"
      ? t("support.session.mode.control")
      : session.mode === "assist"
        ? t("support.session.mode.assist")
        : t("support.session.mode.view");

  return (
    <section className="kob-flex kob-flex-col kob-gap-4">
      <Card>
        <CardBody className="kob-flex kob-flex-wrap kob-items-center kob-justify-between kob-gap-3">
          <div className="kob-flex kob-items-center kob-gap-2">
            <StatusDot tone="success" label={t("support.session.title")} />
            <Text variant="h3">{t("support.session.title")}</Text>
            <Badge tone="gold">{modeLabel}</Badge>
          </div>
          <div className="kob-flex kob-items-center kob-gap-3">
            <Badge tone={peers.includes("company") ? "success" : "neutral"}>
              {t("support.session.presence.company")}
            </Badge>
            <Badge tone={peers.includes("agent") ? "success" : "neutral"}>
              {t("support.session.presence.agent")}
            </Badge>
            {!bothPresent && (
              <Text variant="caption" tone="muted">
                {t("support.session.presence.waiting")}
              </Text>
            )}
          </div>
          <Button variant="danger" size="sm" loading={busy} leadingIcon={<PhoneOff size={15} />} onClick={() => void finish()}>
            {t("support.session.end")}
          </Button>
        </CardBody>
      </Card>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="kob-grid kob-grid-cols-1 xl:kob-grid-cols-[2fr_1fr] kob-gap-4">
        <div className="kob-flex kob-flex-col kob-gap-3">
          <Card>
            <CardBody>
              {side === "agent" ? (
                <div
                  className="kob-relative kob-aspect-video kob-overflow-hidden kob-rounded-lg kob-bg-black/80"
                  onPointerMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    broadcast("cursor", {
                      x: (event.clientX - rect.left) / rect.width,
                      y: (event.clientY - rect.top) / rect.height,
                    });
                  }}
                >
                  <video ref={remoteVideoRef} playsInline autoPlay muted className="kob-h-full kob-w-full kob-object-contain" />
                  {!receiving && (
                    <div className="kob-absolute kob-inset-0 kob-flex kob-flex-col kob-items-center kob-justify-center kob-gap-2 kob-text-white">
                      <MonitorPlay size={28} />
                      <Text variant="bodySm" tone="inverse">
                        {t("support.session.stage.waitingShare")}
                      </Text>
                    </div>
                  )}
                </div>
              ) : (
                <div className="kob-flex kob-flex-col kob-items-center kob-gap-3 kob-py-8 kob-text-center">
                  <MonitorUp size={26} />
                  <Text variant="h4">
                    {sharing ? t("support.session.stage.sharingActive") : t("support.session.stage.sharingInactive")}
                  </Text>
                  <Text variant="bodySm" tone="muted" className="kob-max-w-md">
                    {t("support.session.stage.shareHint")}
                  </Text>
                  {sharing ? (
                    <Button variant="danger" leadingIcon={<ShieldOff size={15} />} onClick={() => void stopScreenShare()}>
                      {t("support.session.stage.stopShare")}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      leadingIcon={<MonitorUp size={15} />}
                      disabled={!screenAllowed}
                      onClick={() => void startScreenShare()}
                    >
                      {t("support.session.stage.startShare")}
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {side === "agent" && (
            <Card>
              <CardBody className="kob-flex kob-flex-col kob-gap-3">
                <Button
                  variant={recording ? "danger" : "secondary"}
                  size="sm"
                  disabled={!recordingAllowed}
                  leadingIcon={recording ? <Circle size={14} /> : <Video size={14} />}
                  onClick={toggleRecording}
                >
                  {recording ? t("support.session.recording.stop") : t("support.session.recording.start")}
                </Button>

                <div className="kob-flex kob-flex-col kob-gap-2">
                  <div className="kob-flex kob-items-center kob-gap-2">
                    <Crosshair size={14} />
                    <Text variant="label">
                      {t("support.session.coControl.label")}
                      {!coControlAllowed ? ` ${t("support.session.coControl.notAllowed")}` : ""}
                    </Text>
                  </div>
                  <div className="kob-flex kob-flex-wrap kob-gap-2">
                    {QUICK_PATHS.map((item) => (
                      <Button
                        key={item.path}
                        variant="ghost"
                        size="sm"
                        leadingIcon={<Compass size={13} />}
                        onClick={() => sendCoControl({ type: "navigate", path: item.path })}
                      >
                        {t(`support.session.coControl.quickPaths.${item.key}`)}
                      </Button>
                    ))}
                  </div>
                  <div className="kob-flex kob-flex-wrap kob-items-center kob-gap-2">
                    <Input
                      value={pathInput}
                      placeholder={t("support.session.coControl.pathPlaceholder")}
                      onChange={(event) => setPathInput(event.target.value)}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (pathInput.trim().startsWith("/")) sendCoControl({ type: "navigate", path: pathInput.trim() });
                      }}
                    >
                      {t("support.session.coControl.go")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => sendCoControl({ type: "scroll", direction: "bottom" })}>
                      {t("support.session.coControl.scrollBottom")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => sendCoControl({ type: "scroll", direction: "top" })}>
                      {t("support.session.coControl.scrollTop")}
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="kob-flex kob-flex-col kob-gap-3">
          {side === "company" && (
            <Card>
              <CardHeader title={t("support.session.permissions.title")} description={t("support.session.permissions.hint")} />
              <CardBody className="kob-flex kob-flex-col kob-gap-2">
                {PERMISSION_KEYS.map((key) => (
                  <Toggle
                    key={key}
                    label={permissionLabels[key]}
                    checked={Boolean(permissions[key])}
                    disabled={busy}
                    onCheckedChange={(next) => void togglePermission(key, next)}
                  />
                ))}
                <Button variant="ghost" size="sm" disabled={busy} leadingIcon={<ShieldOff size={14} />} onClick={() => void revokeAll()}>
                  {t("support.session.permissions.revokeAll")}
                </Button>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title={t("support.session.chat.title")} />
            <CardBody className="kob-flex kob-flex-col kob-gap-2">
              <div className="kob-flex kob-flex-col kob-gap-2 kob-max-h-[280px] kob-overflow-y-auto">
                {chat.map((message) => {
                  const own = message.senderKind === side;
                  return (
                    <div key={message.id} className="kob-flex kob-flex-col" style={{ alignItems: own ? "flex-end" : "flex-start" }}>
                      <Card tone={own ? "espresso" : "surface"} className="kob-max-w-[85%]">
                        <CardBody className="kob-flex kob-flex-col kob-gap-1">
                          <Text variant="label" tone={own ? "inverse" : "primary"}>
                            {message.senderKind === "company"
                              ? t("support.session.presence.company")
                              : message.senderKind === "agent"
                                ? t("support.session.presence.agent")
                                : t("support.conversation.senders.system")}
                          </Text>
                          <Text variant="bodySm" tone={own ? "inverse" : "primary"}>
                            {message.body}
                          </Text>
                        </CardBody>
                      </Card>
                    </div>
                  );
                })}
                {!chat.length && <EmptyState title={t("support.session.chat.empty")} />}
              </div>
              <div className="kob-flex kob-items-center kob-gap-2">
                <Input
                  value={body}
                  placeholder={t("support.session.chat.placeholder")}
                  onChange={(event) => setBody(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submitMessage();
                  }}
                />
                <label className="kob-btn kob-icon-btn" data-variant="ghost" data-size="md" title={t("support.session.chat.attach")}>
                  <Paperclip size={15} />
                  <input type="file" hidden onChange={(event) => void upload(event.target.files?.[0])} />
                </label>
                <IconButton label={t("support.conversation.send")} variant="primary" onClick={() => void submitMessage()}>
                  <Send size={15} />
                </IconButton>
              </div>
              {files.length > 0 && (
                <ul className="kob-flex kob-flex-col kob-gap-1">
                  {files.slice(0, 5).map((file) => (
                    <li key={file.id}>
                      <Button variant="ghost" size="sm" onClick={() => void openFile(file)}>
                        {file.fileName}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title={t("support.session.log.title")} />
            <CardBody>
              <ol className="kob-flex kob-flex-col kob-gap-2">
                {activity.slice(0, 14).map((row) => (
                  <li key={row.id} className="kob-flex kob-items-center kob-justify-between kob-gap-2">
                    <Text variant="bodySm">{describeAction(row.action)}</Text>
                    <Text variant="caption" tone="muted">
                      {new Date(row.createdAt).toLocaleTimeString(locale)}
                    </Text>
                  </li>
                ))}
                {!activity.length && (
                  <li>
                    <Text variant="bodySm" tone="muted">
                      {t("support.session.log.empty")}
                    </Text>
                  </li>
                )}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      {side === "company" && cursor && sharing && (
        <div
          className="kob-fixed kob-pointer-events-none kob-z-50 kob-flex kob-items-center kob-gap-1"
          style={{ left: `${cursor.x * 100}vw`, top: `${cursor.y * 100}vh` }}
          aria-hidden
        >
          <MousePointer2 size={18} />
          <Badge tone="gold">KOB</Badge>
        </div>
      )}
    </section>
  );
}
