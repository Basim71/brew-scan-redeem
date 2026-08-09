import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Building2,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { listBranches } from "@/services/company/branches.service";
import {
  listCompanyMembers,
  setMemberStatus,
  updateMemberDetails,
  updateMemberProfileName,
  updateMemberRole,
  type CompanyMemberRole,
  type CompanyMemberRow,
} from "@/services/company/company-members.service";
import { listActivity } from "@/services/company/activity.service";
import { inviteEmployee, removeEmployee, resetEmployeePassword } from "@/lib/company-employees.functions";
import { Card, Row, Segmented, Toggle } from "./parts";
import { translateError } from "./inputs";
import type { SectionProps } from "./types";

const ROLES: CompanyMemberRole[] = ["owner", "admin", "manager", "cashier"];

const ROLE_LABEL: Record<CompanyMemberRole, [string, string]> = {
  owner: ["مالك", "Owner"],
  admin: ["مشرف", "Admin"],
  manager: ["مدير فرع", "Manager"],
  cashier: ["كاشير", "Cashier"],
};

/** Effective capability matrix — mirrors the route guards and RLS policies in place today. */
const CAPABILITIES: Array<{ key: string; ar: string; en: string; roles: CompanyMemberRole[] }> = [
  { key: "dashboard", ar: "لوحة الأعمال", en: "Dashboard", roles: ["owner", "admin", "manager"] },
  { key: "analytics", ar: "تحليلات الأعمال", en: "Business analytics", roles: ["owner", "admin", "manager"] },
  { key: "customers", ar: "العملاء والاشتراكات", en: "Customers & subscriptions", roles: ["owner", "admin", "manager"] },
  { key: "drinks", ar: "استوديو المشروبات", en: "Drink studio", roles: ["owner", "admin"] },
  { key: "plans", ar: "خطط الاشتراك", en: "Subscription plans", roles: ["owner", "admin"] },
  { key: "coupons", ar: "بيع الكوبونات", en: "Sell coupons", roles: ["owner", "admin", "manager", "cashier"] },
  { key: "orders", ar: "اعتماد الطلبات", en: "Approve orders", roles: ["owner", "admin", "manager", "cashier"] },
  { key: "branches", ar: "إدارة الفروع", en: "Manage branches", roles: ["owner", "admin"] },
  { key: "employees", ar: "إدارة الموظفين", en: "Manage employees", roles: ["owner", "admin"] },
  { key: "settings", ar: "إعدادات الشركة", en: "Company settings", roles: ["owner", "admin"] },
  { key: "audit", ar: "سجل النشاط", en: "Activity log", roles: ["owner"] },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(05\d{8}|\+9665\d{8})$/;

type Draft = {
  memberId: string | null;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  jobTitle: string;
  role: CompanyMemberRole;
  branchId: string;
  password: string;
};

const emptyDraft = (role: CompanyMemberRole): Draft => ({
  memberId: null,
  userId: null,
  fullName: "",
  email: "",
  phone: "",
  jobTitle: "",
  role,
  branchId: "",
  password: "",
});

function formatDate(value: string | null, isAr: boolean): string {
  if (!value) return isAr ? "لم يسجّل الدخول" : "Never";
  return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EmployeeManagementSection({
  settings,
  organizationId,
  isAr,
  canEdit,
  isOwner,
  commit,
}: SectionProps) {
  const d = canEdit ? undefined : true;
  const queryClient = useQueryClient();
  const members = useQuery({
    queryKey: ["company-members", organizationId],
    queryFn: () => listCompanyMembers(organizationId),
  });
  const branches = useQuery({ queryKey: ["company-branches"], queryFn: () => listBranches() });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | CompanyMemberRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<CompanyMemberRow | null>(null);
  const [activityFor, setActivityFor] = useState<CompanyMemberRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompanyMemberRow | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (members.data ?? []).filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!term) return true;
      return [m.profile?.full_name, m.profile?.email, m.job_title, m.phone, m.branch?.name_en, m.branch?.name_ar]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [members.data, roleFilter, search, statusFilter]);

  const stats = useMemo(() => {
    const all = members.data ?? [];
    const weekAgo = Date.now() - 7 * 864e5;
    return {
      total: all.length,
      active: all.filter((m) => m.status === "active").length,
      admins: all.filter((m) => m.role === "owner" || m.role === "admin").length,
      recent: all.filter((m) => m.last_login_at && new Date(m.last_login_at).getTime() > weekAgo).length,
    };
  }, [members.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["company-members", organizationId] });

  const run = async (memberId: string, action: () => Promise<void>) => {
    setBusy(memberId);
    setRowError(null);
    try {
      await action();
      await refresh();
    } catch (err: any) {
      setRowError(translateError(err?.message, isAr));
    } finally {
      setBusy(null);
    }
  };

  const submitDraft = async () => {
    if (!draft) return;
    setDraftError(null);
    if (draft.fullName.trim().length < 2) return setDraftError(isAr ? "الاسم مطلوب" : "Name is required");
    if (!draft.memberId && !EMAIL_RE.test(draft.email.trim()))
      return setDraftError(isAr ? "بريد إلكتروني غير صحيح" : "Invalid email address");
    if (draft.phone.trim() && !PHONE_RE.test(draft.phone.trim()))
      return setDraftError(isAr ? "رقم جوال غير صحيح" : "Invalid phone number");
    if (draft.password.trim() && draft.password.trim().length < 8)
      return setDraftError(isAr ? "كلمة المرور ٨ أحرف على الأقل" : "Password must be at least 8 characters");

    setSaving(true);
    try {
      if (draft.memberId) {
        await updateMemberDetails(organizationId, draft.memberId, {
          job_title: draft.jobTitle.trim() || null,
          phone: draft.phone.trim() || null,
          branch_id: draft.branchId || null,
        });
        if (draft.userId) await updateMemberProfileName(draft.userId, draft.fullName.trim());
        const current = (members.data ?? []).find((m) => m.id === draft.memberId);
        if (current && current.role !== draft.role) {
          await updateMemberRole(organizationId, draft.memberId, draft.role);
        }
      } else {
        const result = await inviteEmployee({
          data: {
            organizationId,
            email: draft.email.trim(),
            fullName: draft.fullName.trim(),
            role: draft.role,
            branchId: draft.branchId || null,
            jobTitle: draft.jobTitle.trim() || null,
            phone: draft.phone.trim() || null,
            password: draft.password.trim() || null,
          },
        });
        if (result.temporaryPassword) {
          setCredential({ email: draft.email.trim(), password: result.temporaryPassword });
        }
      }
      await refresh();
      setDraft(null);
    } catch (err: any) {
      setDraftError(translateError(err?.message, isAr));
    } finally {
      setSaving(false);
    }
  };

  const doResetPassword = async (member: CompanyMemberRow) => {
    await run(member.id, async () => {
      const result = await resetEmployeePassword({
        data: { organizationId, userId: member.user_id, password: null },
      });
      setCredential({ email: member.profile?.email ?? "", password: result.temporaryPassword });
    });
  };

  const doDelete = async (member: CompanyMemberRow) => {
    await run(member.id, async () => {
      await removeEmployee({ data: { organizationId, memberId: member.id } });
      setConfirmDelete(null);
    });
  };

  return (
    <div className="cs-stack">
      <div className="cs-stat-grid">
        {[
          { icon: Users, label: isAr ? "إجمالي الفريق" : "Team size", value: stats.total },
          { icon: BadgeCheck, label: isAr ? "نشِط" : "Active", value: stats.active },
          { icon: ShieldCheck, label: isAr ? "صلاحيات إدارية" : "Administrators", value: stats.admins },
          { icon: Activity, label: isAr ? "دخول آخر ٧ أيام" : "Signed in (7d)", value: stats.recent },
        ].map((stat) => (
          <article key={stat.label} className="cs-stat">
            <stat.icon className="h-4 w-4" />
            <b>{stat.value}</b>
            <span>{stat.label}</span>
          </article>
        ))}
      </div>

      {credential ? (
        <div className="cs-credential">
          <div>
            <strong>{isAr ? "بيانات الدخول المؤقتة" : "Temporary sign-in details"}</strong>
            <p>
              {isAr
                ? "انسخ كلمة المرور الآن وسلّمها للموظف — لن تظهر مرة أخرى."
                : "Copy this password now and hand it to the employee — it will not be shown again."}
            </p>
            <code>{credential.email}</code>
            <code>{credential.password}</code>
          </div>
          <button type="button" className="cs-icon-btn" onClick={() => setCredential(null)} aria-label="close">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <Card
        title={isAr ? "الفريق" : "Team"}
        description={
          isAr
            ? "أضف الموظفين وعدّل أدوارهم وفروعهم وصلاحياتهم وتابع آخر دخول ونشاط."
            : "Add employees, manage roles, branches and permissions, and track last login and activity."
        }
        aside={
          canEdit ? (
            <button
              type="button"
              className="cs-primary-btn"
              onClick={() => {
                setDraftError(null);
                setDraft(emptyDraft((settings.default_employee_role as CompanyMemberRole) || "cashier"));
              }}
            >
              <UserPlus className="h-4 w-4" />
              {isAr ? "إضافة موظف" : "Add employee"}
            </button>
          ) : null
        }
      >
        <div className="cs-toolbar">
          <label className="cs-search-field">
            <Search className="h-3.5 w-3.5" />
            <input
              value={search}
              placeholder={isAr ? "ابحث بالاسم أو البريد أو الفرع" : "Search name, email or branch"}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select className="cs-input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
            <option value="all">{isAr ? "كل الأدوار" : "All roles"}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {isAr ? ROLE_LABEL[r][0] : ROLE_LABEL[r][1]}
              </option>
            ))}
          </select>
          <select className="cs-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">{isAr ? "كل الحالات" : "All statuses"}</option>
            <option value="active">{isAr ? "نشط" : "Active"}</option>
            <option value="inactive">{isAr ? "موقوف" : "Suspended"}</option>
          </select>
        </div>

        {rowError ? <div className="cs-error-panel">{rowError}</div> : null}
        {members.isLoading ? (
          <div className="cs-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="cs-empty">{isAr ? "لا يوجد موظفون مطابقون." : "No matching employees."}</div>
        ) : (
          <div className="cs-table-scroll">
            <table className="cs-table">
              <thead>
                <tr>
                  <th>{isAr ? "الموظف" : "Employee"}</th>
                  <th>{isAr ? "الدور" : "Role"}</th>
                  <th>{isAr ? "الفرع" : "Branch"}</th>
                  <th>{isAr ? "آخر دخول" : "Last login"}</th>
                  <th>{isAr ? "نشط" : "Active"}</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}</strong>
                      <small>{m.profile?.email}</small>
                      {m.job_title ? <small className="cs-muted">{m.job_title}</small> : null}
                    </td>
                    <td>
                      <select
                        className="cs-input"
                        disabled={d || busy === m.id}
                        value={m.role}
                        onChange={(e) =>
                          run(m.id, () => updateMemberRole(organizationId, m.id, e.target.value as CompanyMemberRole))
                        }
                      >
                        {ROLES.filter((r) => r !== "owner" || isOwner || m.role === "owner").map((r) => (
                          <option key={r} value={r}>
                            {isAr ? ROLE_LABEL[r][0] : ROLE_LABEL[r][1]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="cs-input"
                        disabled={d || busy === m.id}
                        value={m.branch_id ?? ""}
                        onChange={(e) =>
                          run(m.id, () =>
                            updateMemberDetails(organizationId, m.id, { branch_id: e.target.value || null }),
                          )
                        }
                      >
                        <option value="">{isAr ? "كل الفروع" : "All branches"}</option>
                        {(branches.data ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {isAr ? b.name_ar : b.name_en}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="cs-muted">{formatDate(m.last_login_at, isAr)}</span>
                    </td>
                    <td>
                      <Toggle
                        label={isAr ? "نشط" : "Active"}
                        disabled={d || busy === m.id}
                        checked={m.status === "active"}
                        onChange={(v) =>
                          run(m.id, () => setMemberStatus(organizationId, m.id, v ? "active" : "inactive"))
                        }
                      />
                    </td>
                    <td>
                      <div className="cs-row-actions">
                        <button
                          type="button"
                          className="cs-icon-btn"
                          title={isAr ? "تعديل" : "Edit"}
                          disabled={d}
                          onClick={() => {
                            setDraftError(null);
                            setDraft({
                              memberId: m.id,
                              userId: m.user_id,
                              fullName: m.profile?.full_name ?? "",
                              email: m.profile?.email ?? "",
                              phone: m.phone ?? "",
                              jobTitle: m.job_title ?? "",
                              role: m.role,
                              branchId: m.branch_id ?? "",
                              password: "",
                            });
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="cs-icon-btn"
                          title={isAr ? "الصلاحيات" : "Permissions"}
                          disabled={d}
                          onClick={() => setPermissionsFor(m)}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="cs-icon-btn"
                          title={isAr ? "النشاط" : "Activity"}
                          onClick={() => setActivityFor(m)}
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="cs-icon-btn"
                          title={isAr ? "إعادة تعيين كلمة المرور" : "Reset password"}
                          disabled={d || busy === m.id}
                          onClick={() => doResetPassword(m)}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="cs-icon-btn cs-icon-danger"
                          title={isAr ? "حذف" : "Delete"}
                          disabled={d || busy === m.id}
                          onClick={() => setConfirmDelete(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={isAr ? "الإعدادات الافتراضية للموظفين" : "Employee defaults"}>
        <Row label={isAr ? "الدور الافتراضي" : "Default role"}>
          <Segmented
            disabled={d}
            value={settings.default_employee_role}
            onChange={(v) => commit({ default_employee_role: v }, "employees")}
            options={[
              { value: "cashier", label: isAr ? "كاشير" : "Cashier" },
              { value: "manager", label: isAr ? "مدير فرع" : "Manager" },
              { value: "admin", label: isAr ? "مشرف" : "Admin" },
            ]}
          />
        </Row>
        <Row label={isAr ? "دعوة الموظفين" : "Employee invitations"}>
          <Segmented
            disabled={d}
            value={settings.employee_invite_mode}
            onChange={(v) => commit({ employee_invite_mode: v }, "employees")}
            options={[
              { value: "admin_only" as const, label: isAr ? "المشرفون فقط" : "Admins only" },
              { value: "managers_allowed" as const, label: isAr ? "المديرون أيضًا" : "Managers too" },
              { value: "disabled" as const, label: isAr ? "معطّلة" : "Disabled" },
            ]}
          />
        </Row>
        <Row label={isAr ? "إعادة تعيين كلمة المرور" : "Password reset policy"}>
          <Segmented
            disabled={d}
            value={settings.password_reset_policy}
            onChange={(v) => commit({ password_reset_policy: v }, "employees")}
            options={[
              { value: "self_service" as const, label: isAr ? "ذاتية" : "Self service" },
              { value: "admin_only" as const, label: isAr ? "عبر المشرف" : "Admin only" },
            ]}
          />
        </Row>
      </Card>

      <Card
        title={isAr ? "مصفوفة الأدوار" : "Role matrix"}
        description={isAr ? "الصلاحيات الفعلية لكل دور في النظام." : "Effective capabilities for each role."}
      >
        <div className="cs-table-scroll">
          <table className="cs-table cs-matrix">
            <thead>
              <tr>
                <th>{isAr ? "الصلاحية" : "Capability"}</th>
                {ROLES.map((r) => (
                  <th key={r}>{isAr ? ROLE_LABEL[r][0] : ROLE_LABEL[r][1]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap) => (
                <tr key={cap.key}>
                  <td>{isAr ? cap.ar : cap.en}</td>
                  {ROLES.map((r) => (
                    <td key={r} data-on={cap.roles.includes(r) ? "true" : "false"}>
                      {cap.roles.includes(r) ? "●" : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {draft ? (
        <div className="cs-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cs-modal">
            <header>
              <h3>
                {draft.memberId ? (isAr ? "تعديل موظف" : "Edit employee") : isAr ? "إضافة موظف" : "Add employee"}
              </h3>
              <button type="button" className="cs-icon-btn" onClick={() => setDraft(null)} aria-label="close">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="cs-modal-body">
              <label className="cs-field">
                <span>{isAr ? "الاسم الكامل" : "Full name"}</span>
                <input
                  className="cs-input"
                  value={draft.fullName}
                  onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                />
              </label>
              <label className="cs-field">
                <span>{isAr ? "البريد الإلكتروني" : "Email"}</span>
                <input
                  className="cs-input"
                  type="email"
                  disabled={Boolean(draft.memberId)}
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </label>
              <label className="cs-field">
                <span>{isAr ? "رقم الجوال" : "Phone"}</span>
                <input
                  className="cs-input"
                  placeholder="05XXXXXXXX"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </label>
              <label className="cs-field">
                <span>{isAr ? "المسمى الوظيفي" : "Job title"}</span>
                <input
                  className="cs-input"
                  value={draft.jobTitle}
                  onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
                />
              </label>
              <label className="cs-field">
                <span>{isAr ? "الدور" : "Role"}</span>
                <select
                  className="cs-input"
                  value={draft.role}
                  onChange={(e) => setDraft({ ...draft, role: e.target.value as CompanyMemberRole })}
                >
                  {ROLES.filter((r) => r !== "owner" || isOwner).map((r) => (
                    <option key={r} value={r}>
                      {isAr ? ROLE_LABEL[r][0] : ROLE_LABEL[r][1]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cs-field">
                <span>{isAr ? "الفرع" : "Branch"}</span>
                <select
                  className="cs-input"
                  value={draft.branchId}
                  onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                >
                  <option value="">{isAr ? "كل الفروع" : "All branches"}</option>
                  {(branches.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {isAr ? b.name_ar : b.name_en}
                    </option>
                  ))}
                </select>
              </label>
              {!draft.memberId ? (
                <label className="cs-field cs-field-wide">
                  <span>{isAr ? "كلمة مرور مبدئية (اختياري)" : "Initial password (optional)"}</span>
                  <input
                    className="cs-input"
                    value={draft.password}
                    placeholder={isAr ? "تُولَّد تلقائيًا إن تُركت فارغة" : "Generated automatically when left blank"}
                    onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  />
                </label>
              ) : null}
              {draftError ? <div className="cs-error-panel cs-field-wide">{draftError}</div> : null}
            </div>
            <footer>
              <button type="button" className="cs-ghost-btn" onClick={() => setDraft(null)}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button type="button" className="cs-primary-btn" disabled={saving} onClick={submitDraft}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {draft.memberId ? (isAr ? "حفظ" : "Save") : isAr ? "إنشاء الحساب" : "Create account"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}

      {permissionsFor ? (
        <PermissionsModal
          member={permissionsFor}
          isAr={isAr}
          canEdit={canEdit}
          organizationId={organizationId}
          onClose={() => setPermissionsFor(null)}
          onSaved={refresh}
        />
      ) : null}

      {activityFor ? (
        <ActivityModal
          member={activityFor}
          isAr={isAr}
          organizationId={organizationId}
          onClose={() => setActivityFor(null)}
        />
      ) : null}

      {confirmDelete ? (
        <div className="cs-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cs-modal cs-modal-sm">
            <header>
              <h3>{isAr ? "حذف الموظف" : "Delete employee"}</h3>
            </header>
            <div className="cs-modal-body cs-modal-text">
              {isAr
                ? `سيتم إزالة ${confirmDelete.profile?.full_name || confirmDelete.profile?.email} من الشركة ولن يستطيع الدخول بعد ذلك.`
                : `${confirmDelete.profile?.full_name || confirmDelete.profile?.email} will be removed from this company and lose access.`}
            </div>
            <footer>
              <button type="button" className="cs-ghost-btn" onClick={() => setConfirmDelete(null)}>
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button type="button" className="cs-danger-btn" onClick={() => doDelete(confirmDelete)}>
                <Trash2 className="h-4 w-4" />
                {isAr ? "حذف" : "Delete"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- permissions */

function PermissionsModal({
  member,
  isAr,
  canEdit,
  organizationId,
  onClose,
  onSaved,
}: {
  member: CompanyMemberRow;
  isAr: boolean;
  canEdit: boolean;
  organizationId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const base = useMemo(
    () =>
      Object.fromEntries(CAPABILITIES.map((cap) => [cap.key, cap.roles.includes(member.role)])) as Record<
        string,
        boolean
      >,
    [member.role],
  );
  const [values, setValues] = useState<Record<string, boolean>>({ ...base, ...(member.permissions ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const overrides: Record<string, boolean> = {};
      for (const cap of CAPABILITIES) {
        if (values[cap.key] !== base[cap.key]) overrides[cap.key] = Boolean(values[cap.key]);
      }
      await updateMemberDetails(organizationId, member.id, { permissions: overrides });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(translateError(err?.message, isAr));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="cs-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cs-modal">
        <header>
          <h3>
            {isAr ? "صلاحيات" : "Permissions"} — {member.profile?.full_name || member.profile?.email}
          </h3>
          <button type="button" className="cs-icon-btn" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="cs-modal-body cs-permission-grid">
          {CAPABILITIES.map((cap) => (
            <label key={cap.key} className="cs-permission">
              <span>{isAr ? cap.ar : cap.en}</span>
              <Toggle
                label={cap.key}
                disabled={!canEdit}
                checked={Boolean(values[cap.key])}
                onChange={(v) => setValues((prev) => ({ ...prev, [cap.key]: v }))}
              />
            </label>
          ))}
          {error ? <div className="cs-error-panel cs-field-wide">{error}</div> : null}
        </div>
        <footer>
          <button type="button" className="cs-ghost-btn" onClick={onClose}>
            {isAr ? "إغلاق" : "Close"}
          </button>
          <button type="button" className="cs-primary-btn" disabled={saving || !canEdit} onClick={save}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {isAr ? "حفظ الصلاحيات" : "Save permissions"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ activity */

function ActivityModal({
  member,
  isAr,
  organizationId,
  onClose,
}: {
  member: CompanyMemberRow;
  isAr: boolean;
  organizationId: string;
  onClose: () => void;
}) {
  const activity = useQuery({
    queryKey: ["member-activity", organizationId, member.user_id],
    queryFn: () => listActivity(organizationId, { actorUserId: member.user_id, limit: 60 }),
  });

  return (
    <div className="cs-modal-backdrop" role="dialog" aria-modal="true">
      <div className="cs-modal">
        <header>
          <h3>
            {isAr ? "نشاط" : "Activity"} — {member.profile?.full_name || member.profile?.email}
          </h3>
          <button type="button" className="cs-icon-btn" onClick={onClose} aria-label="close">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="cs-modal-body">
          <div className="cs-field-wide">
            <div className="cs-meta-line">
              <Building2 className="h-3.5 w-3.5" />
              {member.branch
                ? isAr
                  ? member.branch.name_ar
                  : member.branch.name_en
                : isAr
                  ? "كل الفروع"
                  : "All branches"}
              <span>·</span>
              {isAr ? "آخر دخول:" : "Last login:"} {formatDate(member.last_login_at, isAr)}
            </div>
            {activity.isLoading ? (
              <div className="cs-loading">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (activity.data ?? []).length === 0 ? (
              <div className="cs-empty">{isAr ? "لا يوجد نشاط مسجّل بعد." : "No recorded activity yet."}</div>
            ) : (
              <ol className="cs-timeline">
                {(activity.data ?? []).map((row) => (
                  <li key={row.id} data-severity={row.severity}>
                    <div>
                      <strong>{row.action}</strong>
                      {row.entity_label ? <small>{row.entity_label}</small> : null}
                    </div>
                    <time>{formatDate(row.created_at, isAr)}</time>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
