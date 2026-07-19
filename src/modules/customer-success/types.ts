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
