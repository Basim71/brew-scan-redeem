export type CaseStatus =
  | "new"
  | "triaged"
  | "assigned"
  | "waiting_company"
  | "waiting_platform"
  | "scheduled"
  | "active"
  | "resolved"
  | "closed"
  | "cancelled";

export type CasePriority = "critical" | "high" | "medium" | "low";
export type CaseCategory =
  | "technical"
  | "training"
  | "feature_request"
  | "billing"
  | "branch_setup"
  | "pos_integration"
  | "other";
export type SessionPreference = "none" | "chat" | "voice" | "scheduled" | "immediate";

export type CustomerSuccessCase = {
  id: string;
  caseNumber: string;
  organizationId: string;
  createdByMemberId: string;
  assignedPlatformMemberId: string | null;
  category: CaseCategory;
  priority: CasePriority;
  status: CaseStatus;
  title: string;
  description: string;
  sessionPreference: SessionPreference;
  requestedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  scheduledAt: string | null;
  allowView: boolean;
  allowTemporaryEdit: boolean;
  allowVoice: boolean;
  allowRecording: boolean;
  organization?: { name_ar: string | null; name_en: string | null } | null;
};

export const caseStatusLabels: Record<CaseStatus, string> = {
  new: "جديدة",
  triaged: "قيد الفرز",
  assigned: "تم التعيين",
  waiting_company: "بانتظار الشركة",
  waiting_platform: "بانتظار KOB",
  scheduled: "مجدولة",
  active: "نشطة",
  resolved: "تم الحل",
  closed: "مغلقة",
  cancelled: "ملغاة",
};

export const priorityLabels: Record<CasePriority, string> = {
  critical: "حرجة",
  high: "مرتفعة",
  medium: "متوسطة",
  low: "منخفضة",
};

export type CaseEvent = {
  id: string;
  caseId: string;
  actorUserId: string | null;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CaseMessage = {
  id: string;
  caseId: string;
  senderUserId: string;
  body: string;
  visibility: "shared" | "internal";
  createdAt: string;
};

export type CaseFeedback = {
  id: string;
  caseId: string;
  rating: number;
  resolved: boolean;
  comment: string | null;
  createdAt: string;
};

export type SupportRequestType = "support" | "training";
export type SupportRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "reschedule_proposed"
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled"
  | "expired";
export type SupportSessionMode = "view" | "assist" | "edit";

export type SupportRequest = {
  id: string;
  organizationId: string;
  requestedBy: string;
  type: SupportRequestType;
  priority: string;
  status: SupportRequestStatus;
  subject: string;
  description: string | null;
  requestedStartAt: string | null;
  scheduledAt: string | null;
  durationMinutes: number;
  requestedMode: SupportSessionMode;
  allowVoice: boolean;
  allowRecording: boolean;
  decisionNote: string | null;
  decidedAt: string | null;
  rescheduleNote: string | null;
  assignedPlatformMemberId: string | null;
  createdAt: string;
};

export type SupportSession = {
  id: string;
  requestId: string | null;
  organizationId: string;
  platformMemberId: string;
  approvedByCompanyUserId: string;
  status: "waiting" | "active" | "completed" | "cancelled" | "expired";
  mode: SupportSessionMode;
  voiceEnabled: boolean;
  recordingEnabled: boolean;
  approvalExpiresAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endReason: string | null;
  currentPath: string | null;
  createdAt: string;
};

export const supportRequestStatusLabels: Record<SupportRequestStatus, string> = {
  pending: "بانتظار الشركة",
  accepted: "موافق عليها",
  declined: "مرفوضة",
  reschedule_proposed: "اقتراح موعد آخر",
  scheduled: "مجدولة",
  active: "نشطة",
  completed: "مكتملة",
  cancelled: "ملغاة",
  expired: "منتهية",
};

export const caseCategoryLabels: Record<CaseCategory, string> = {
  technical: "مشكلة تقنية",
  training: "تدريب",
  feature_request: "طلب ميزة",
  billing: "الفوترة",
  branch_setup: "إعداد فرع",
  pos_integration: "ربط POS",
  other: "أخرى",
};
