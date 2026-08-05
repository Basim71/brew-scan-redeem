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

export const statusLabels: Record<TicketStatus, string> = {
  new: "جديدة",
  waiting: "بانتظار الاستلام",
  accepted: "تم الاستلام",
  assigned: "تم التعيين",
  waiting_company: "بانتظار الشركة",
  scheduled: "مجدولة",
  live: "جلسة مباشرة",
  resolved: "تم الحل",
  closed: "مغلقة",
  cancelled: "ملغاة",
  rejected: "مرفوضة",
};

export const priorityLabels: Record<TicketPriority, string> = {
  critical: "حرجة",
  high: "مرتفعة",
  medium: "متوسطة",
  low: "منخفضة",
};

export const categoryLabels: Record<TicketCategory, string> = {
  technical: "مشكلة تقنية",
  subscription: "الاشتراكات",
  payment: "المدفوعات",
  qr: "رمز QR",
  pos: "نقاط البيع",
  employee: "الموظفون",
  feature_request: "طلب ميزة",
  training: "تدريب",
  billing: "الفوترة",
  branch_setup: "إعداد فرع",
  other: "أخرى",
};

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
