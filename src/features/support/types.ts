
import arLocale from "@/locales/ar.json";
import enLocale from "@/locales/en.json";

/* Labels follow the active UI language (set on <html lang>). */
function localized(group: "status" | "priority" | "category"): any {
  const pick = () => {
    const isAr = typeof document !== "undefined" && document.documentElement.lang === "ar";
    return ((isAr ? arLocale : enLocale) as any).support.labels[group] as Record<string, string>;
  };
  return new Proxy({}, {
    get: (_t, k) => pick()[k as string],
    ownKeys: () => Reflect.ownKeys(pick()),
    getOwnPropertyDescriptor: (_t, k) => ({ enumerable: true, configurable: true, value: pick()[k as string] }),
  });
}
export type TicketStatus =
  | "new"
  | "waiting"
  | "accepted"
  | "assigned"
  | "waiting_company"
  | "scheduled"
  | "live"
  | "resolved"
  | "closed"
  | "cancelled"
  | "rejected";

export type TicketPriority = "low" | "medium" | "high" | "critical";

export type TicketCategory =
  | "technical"
  | "subscription"
  | "payment"
  | "qr"
  | "pos"
  | "employee"
  | "feature_request"
  | "training"
  | "billing"
  | "branch_setup"
  | "other";

export type SessionPreference = "none" | "chat" | "voice" | "scheduled" | "immediate";

export type Ticket = {
  id: string;
  ticketNumber: string;
  organizationId: string;
  branchId: string | null;
  createdByUserId: string | null;
  createdByMemberId: string | null;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  context: Record<string, unknown>;
  aiSummary: string | null;
  assignedAgentUserId: string | null;
  assignedAt: string | null;
  sessionPreference: SessionPreference;
  scheduledAt: string | null;
  allowView: boolean;
  allowRemoteControl: boolean;
  allowVoice: boolean;
  allowRecording: boolean;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  organization?: { name_ar: string | null; name_en: string | null } | null;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderUserId: string | null;
  senderKind: "company" | "agent" | "system" | "ai";
  kind: "text" | "code" | "image" | "file" | "system";
  body: string;
  visibility: "shared" | "internal";
  createdAt: string;
};

export type TicketEvent = {
  id: number;
  ticketId: string;
  actorKind: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  message: string | null;
  createdAt: string;
};

export const statusLabels: Record<TicketStatus, string> = localized("status");

export const priorityLabels: Record<TicketPriority, string> = localized("priority");

export const categoryLabels: Record<TicketCategory, string> = localized("category");

export const OPEN_STATUSES: TicketStatus[] = [
  "new",
  "waiting",
  "accepted",
  "assigned",
  "waiting_company",
  "scheduled",
  "live",
];

export function collectBrowserContext(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  return {
    user_agent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    device_pixel_ratio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    path: window.location.pathname,
    online: navigator.onLine,
    captured_at: new Date().toISOString(),
  };
}
