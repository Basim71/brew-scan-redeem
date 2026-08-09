import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Circle,
  Compass,
  Crosshair,
  Loader2,
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

import { listMessages, sendMessage } from "./api";
import {
  endSession,
  getFileUrl,
  listActivity,
  listPermissions,
  listTicketFiles,
  logActivity,
  permissionLabels,
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

const QUICK_PATHS: Array<{ label: string; path: string }> = [
  { label: "لوحة الشركة", path: "/admin" },
  { label: "الخطط", path: "/admin/plans" },
  { label: "الكوبونات", path: "/admin/coupons" },
  { label: "المشروبات", path: "/admin/drinks" },
  { label: "الإعدادات", path: "/admin/settings" },
];

export function LiveSessionRoom({ session, ticketId, side, onSessionChange }: Props) {
  const navigate = useNavigate();
  const channelRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);

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
      setError(metaError instanceof Error ? metaError.message : "تعذر تحميل بيانات الجلسة");
    }
  }, [session.id, ticketId, side]);

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
      setError(signalError instanceof Error ? signalError.message : "تعذر إنشاء اتصال الجلسة");
    }
  }

  /** Company-only: publish the KOB screen to the agent. */
  async function startScreenShare() {
    if (!screenAllowed) {
      setError("يجب تفعيل صلاحية مشاركة الشاشة أولاً.");
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
      setError(shareError instanceof Error ? shareError.message : "تعذر بدء مشاركة الشاشة");
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
      setError("لا يوجد بث لتسجيله.");
      return;
    }
    if (!recordingAllowed) {
      setError("تسجيل الجلسة غير مسموح من الشركة.");
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
        setError(recordError instanceof Error ? recordError.message : "تعذر حفظ التسجيل");
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
      setError("التحكّم المشترك غير مسموح من الشركة.");
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
      setError(permError instanceof Error ? permError.message : "تعذر تحديث الصلاحية");
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
      setError(sendError instanceof Error ? sendError.message : "تعذر إرسال الرسالة");
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
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الملف");
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
      setError(endError instanceof Error ? endError.message : "تعذر إنهاء الجلسة");
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

  return (
    <section className="sc-room" dir="rtl">
      <header className="sc-room-head">
        <div className="sc-room-title">
          <span className="sc-live-dot" />
          <h3>جلسة دعم مباشرة</h3>
          <span className="sc-room-mode">{session.mode === "control" ? "تحكّم مشترك" : session.mode === "assist" ? "مساعدة" : "مشاهدة"}</span>
        </div>
        <div className="sc-room-presence">
          <span className={peers.includes("company") ? "on" : "off"}>الشركة</span>
          <span className={peers.includes("agent") ? "on" : "off"}>فريق KOB</span>
          {!bothPresent && <em>بانتظار الطرف الآخر…</em>}
        </div>
        <button className="sc-danger" onClick={() => void finish()} disabled={busy}>
          <PhoneOff size={15} /> إنهاء الجلسة
        </button>
      </header>

      {error && <div className="sc-error">{error}</div>}

      <div className="sc-room-grid">
        <div className="sc-room-stage">
          {side === "agent" ? (
            <div
              className="sc-stage-video"
              onPointerMove={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                broadcast("cursor", {
                  x: (event.clientX - rect.left) / rect.width,
                  y: (event.clientY - rect.top) / rect.height,
                });
              }}
            >
              <video ref={remoteVideoRef} playsInline autoPlay muted />
              {!receiving && (
                <div className="sc-stage-empty">
                  <MonitorPlay size={28} />
                  <p>بانتظار مشاركة الشاشة من الشركة.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="sc-stage-host">
              <MonitorUp size={26} />
              <h4>{sharing ? "تتم مشاركة شاشتك الآن" : "شاشتك غير مشاركة"}</h4>
              <p>
                لن يرى فريق KOB أي شيء قبل موافقتك، ويمكنك الإيقاف في أي لحظة. التحكّم المشترك يعمل داخل تطبيق KOB
                فقط ولا يمس جهازك.
              </p>
              {sharing ? (
                <button className="sc-danger" onClick={() => void stopScreenShare()}>
                  <ShieldOff size={15} /> إيقاف المشاركة
                </button>
              ) : (
                <button className="sc-primary" onClick={() => void startScreenShare()} disabled={!screenAllowed}>
                  <MonitorUp size={15} /> بدء مشاركة الشاشة
                </button>
              )}
            </div>
          )}

          {side === "agent" && (
            <div className="sc-stage-tools">
              <button onClick={toggleRecording} className={recording ? "active" : ""} disabled={!recordingAllowed}>
                {recording ? <Circle size={14} /> : <Video size={14} />} {recording ? "إيقاف التسجيل" : "تسجيل"}
              </button>
              <div className="sc-cocontrol">
                <span>
                  <Crosshair size={14} /> تحكّم مشترك داخل KOB {coControlAllowed ? "" : "(غير مسموح)"}
                </span>
                <div className="sc-cocontrol-quick">
                  {QUICK_PATHS.map((item) => (
                    <button key={item.path} onClick={() => sendCoControl({ type: "navigate", path: item.path })}>
                      <Compass size={13} /> {item.label}
                    </button>
                  ))}
                </div>
                <div className="sc-cocontrol-row">
                  <input
                    value={pathInput}
                    placeholder="/admin/plans"
                    onChange={(event) => setPathInput(event.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (pathInput.trim().startsWith("/")) sendCoControl({ type: "navigate", path: pathInput.trim() });
                    }}
                  >
                    انتقال
                  </button>
                  <button onClick={() => sendCoControl({ type: "scroll", direction: "bottom" })}>أسفل الصفحة</button>
                  <button onClick={() => sendCoControl({ type: "scroll", direction: "top" })}>أعلى الصفحة</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="sc-room-side">
          {side === "company" && (
            <section className="sc-card">
              <h3>صلاحيات الجلسة</h3>
              <p className="sc-hint">أنت من يمنح الصلاحيات، ويمكن سحبها فورًا.</p>
              {PERMISSION_KEYS.map((key) => (
                <label key={key} className="sc-switch-row">
                  <span>{permissionLabels[key]}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(permissions[key])}
                    disabled={busy}
                    onChange={(event) => void togglePermission(key, event.target.checked)}
                  />
                </label>
              ))}
              <button className="sc-ghost" onClick={() => void revokeAll()} disabled={busy}>
                <ShieldOff size={14} /> سحب كل الصلاحيات
              </button>
            </section>
          )}

          <section className="sc-card sc-room-chat">
            <h3>محادثة الجلسة</h3>
            <div className="sc-room-chat-body">
              {chat.map((message) => (
                <div key={message.id} className={`sc-room-bubble ${message.senderKind === side ? "own" : ""}`}>
                  <b>{message.senderKind === "company" ? "الشركة" : message.senderKind === "agent" ? "KOB" : "النظام"}</b>
                  <p>{message.body}</p>
                </div>
              ))}
              {!chat.length && <div className="sc-empty">لا توجد رسائل.</div>}
            </div>
            <div className="sc-room-composer">
              <input
                value={body}
                placeholder="اكتب رسالة…"
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submitMessage();
                }}
              />
              <label className="sc-attach">
                <Paperclip size={15} />
                <input type="file" hidden onChange={(event) => void upload(event.target.files?.[0])} />
              </label>
              <button className="sc-primary" onClick={() => void submitMessage()}>
                {busy ? <Loader2 className="sc-spin" size={15} /> : <Send size={15} />}
              </button>
            </div>
            {files.length > 0 && (
              <ul className="sc-file-list">
                {files.slice(0, 5).map((file) => (
                  <li key={file.id}>
                    <button onClick={() => void openFile(file)}>{file.fileName}</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="sc-card">
            <h3>سجل الجلسة</h3>
            <ol className="sc-audit">
              {activity.slice(0, 14).map((row) => (
                <li key={row.id}>
                  <b>{describeAction(row.action)}</b>
                  <time>{new Date(row.createdAt).toLocaleTimeString("ar-SA")}</time>
                </li>
              ))}
              {!activity.length && <li className="sc-empty">لا توجد أحداث.</li>}
            </ol>
          </section>
        </aside>
      </div>

      {side === "company" && cursor && sharing && (
        <div
          className="sc-remote-cursor"
          style={{ left: `${cursor.x * 100}vw`, top: `${cursor.y * 100}vh` }}
          aria-hidden
        >
          <MousePointer2 size={18} />
          <span>KOB</span>
        </div>
      )}
    </section>
  );
}

const ACTION_LABELS: Record<string, string> = {
  session_requested: "طلب جلسة",
  session_approved: "موافقة الشركة",
  session_rejected: "رفض الشركة",
  session_started: "بدء الجلسة",
  session_ended: "إنهاء الجلسة",
  permission_granted: "منح صلاحية",
  permission_revoked: "سحب صلاحية",
  screen_share_started: "بدء مشاركة الشاشة",
  screen_share_stopped: "إيقاف مشاركة الشاشة",
  recording_started: "بدء التسجيل",
  recording_saved: "حفظ التسجيل",
  co_control_navigate: "تنقّل بالتحكّم المشترك",
  co_control_highlight: "تحديد عنصر",
  co_control_scroll: "تمرير الصفحة",
  file_shared: "مشاركة ملف",
};

function describeAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}
