import { useI18n } from "@/lib/i18n";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BadgeCheck,
  Building2,
  KeyRound,
  Pencil,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
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
import {
  Alert,
  Button,
  DataTable,
  IconButton,
  Input,
  InformationDialog,
  DangerDialog,
  FormDialog,
  SearchInput,
  Select,
  StatCard,
  StatGrid,
  Toggle as KobToggle,
  LoadingState,
  EmptyState,
  NoResultsState,
  type Column,
} from "@/components/kob";
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

function formatDate(value: string | null, isAr: boolean, neverLabel: string): string {
  if (!value) return neverLabel;
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
  const { t } = useI18n();
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

  const hasFilters = Boolean(search.trim()) || roleFilter !== "all" || statusFilter !== "all";

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
    if (draft.fullName.trim().length < 2) return setDraftError(t("settings.employees.nameIsRequired"));
    if (!draft.memberId && !EMAIL_RE.test(draft.email.trim()))
      return setDraftError(t("settings.employees.invalidEmailAddress"));
    if (draft.phone.trim() && !PHONE_RE.test(draft.phone.trim()))
      return setDraftError(t("settings.employees.invalidPhoneNumber"));
    if (draft.password.trim() && draft.password.trim().length < 8)
      return setDraftError(t("settings.employees.passwordMustBeAtLeast8"));

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

  const columns: Column<CompanyMemberRow>[] = [
    {
      key: "employee",
      header: t("settings.employees.employee"),
      render: (m) => (
        <div className="min-w-0">
          <strong className="block">{m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}</strong>
          <small className="block text-muted-foreground">{m.profile?.email}</small>
          {m.job_title ? <small className="text-muted-foreground">{m.job_title}</small> : null}
        </div>
      ),
    },
    {
      key: "role",
      header: t("settings.employees.role"),
      render: (m) => (
        <Select
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
        </Select>
      ),
    },
    {
      key: "branch",
      header: t("settings.employees.branch"),
      render: (m) => (
        <Select
          disabled={d || busy === m.id}
          value={m.branch_id ?? ""}
          onChange={(e) =>
            run(m.id, () => updateMemberDetails(organizationId, m.id, { branch_id: e.target.value || null }))
          }
        >
          <option value="">{t("settings.employees.allBranches")}</option>
          {(branches.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {isAr ? b.name_ar : b.name_en}
            </option>
          ))}
        </Select>
      ),
    },
    {
      key: "last_login",
      header: t("settings.employees.lastLogin"),
      render: (m) => <span className="text-muted-foreground">{formatDate(m.last_login_at, isAr, t("settings.employees.never"))}</span>,
    },
    {
      key: "active",
      header: t("common.status.active"),
      render: (m) => (
        <Toggle
          label={t("common.status.active")}
          disabled={d || busy === m.id}
          checked={m.status === "active"}
          onChange={(v) => run(m.id, () => setMemberStatus(organizationId, m.id, v ? "active" : "inactive"))}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "end",
      render: (m) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label={t("common.actions.edit")}
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
          </IconButton>
          <IconButton label={t("settings.employees.permissionsAction")} disabled={d} onClick={() => setPermissionsFor(m)}>
            <ShieldCheck className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={t("settings.employees.activity")} onClick={() => setActivityFor(m)}>
            <Activity className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={t("settings.employees.resetPassword")}
            disabled={d || busy === m.id}
            onClick={() => doResetPassword(m)}
          >
            <KeyRound className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={t("common.actions.delete")}
            variant="danger"
            disabled={d || busy === m.id}
            onClick={() => setConfirmDelete(m)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatCard icon={<Users className="h-4 w-4" />} label={t("settings.employees.teamSize")} value={stats.total} />
        <StatCard icon={<BadgeCheck className="h-4 w-4" />} label={t("settings.employees.active")} value={stats.active} />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label={t("settings.employees.administrators")}
          value={stats.admins}
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label={t("settings.employees.signedIn7d")}
          value={stats.recent}
        />
      </StatGrid>

      <InformationDialog
        open={Boolean(credential)}
        onClose={() => setCredential(null)}
        title={t("settings.employees.temporarySignInDetails")}
        description={
          t("settings.employees.copyThisPasswordNowAndHand")
        }
      >
        {credential ? (
          <div className="flex flex-col gap-2 rounded-lg bg-muted p-3 font-mono text-sm">
            <code>{credential.email}</code>
            <code>{credential.password}</code>
          </div>
        ) : null}
      </InformationDialog>

      <Card
        title={t("settings.employees.team")}
        description={
          t("settings.employees.addEmployeesManageRolesBranchesAnd")
        }
        aside={
          canEdit ? (
            <Button
              leadingIcon={<UserPlus className="h-4 w-4" />}
              onClick={() => {
                setDraftError(null);
                setDraft(emptyDraft((settings.default_employee_role as CompanyMemberRole) || "cashier"));
              }}
            >
              {t("settings.employees.addEmployee")}
            </Button>
          ) : null
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder={t("settings.employees.searchNameEmailOrBranch")}
          />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
            <option value="all">{t("settings.employees.allRoles")}</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {isAr ? ROLE_LABEL[r][0] : ROLE_LABEL[r][1]}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">{t("settings.employees.allStatuses")}</option>
            <option value="active">{t("common.status.active")}</option>
            <option value="inactive">{t("settings.employees.suspended")}</option>
          </Select>
        </div>

        {rowError ? (
          <Alert tone="danger" onDismiss={() => setRowError(null)} dismissLabel={t("settings.employees.dismiss")}>
            {rowError}
          </Alert>
        ) : null}

        {members.isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : rows.length === 0 ? (
          hasFilters ? (
            <NoResultsState
              title={t("settings.employees.noMatchingEmployees")}
              description={t("settings.employees.tryAdjustingYourSearchOrFilters")}
            />
          ) : (
            <EmptyState
              title={t("settings.employees.noEmployeesYet")}
              description={t("settings.employees.addYourFirstTeamMember")}
            />
          )
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(m) => m.id}
            caption={t("settings.employees.employeeList")}
          />
        )}
      </Card>

      <Card title={t("settings.employees.employeeDefaults")}>
        <Row label={t("settings.employees.defaultRole")}>
          <Segmented
            disabled={d}
            value={settings.default_employee_role}
            onChange={(v) => commit({ default_employee_role: v }, "employees")}
            options={[
              { value: "cashier", label: t("settings.employees.cashier") },
              { value: "manager", label: t("settings.employees.manager") },
              { value: "admin", label: t("settings.employees.admin") },
            ]}
          />
        </Row>
        <Row label={t("settings.employees.employeeInvitations")}>
          <Segmented
            disabled={d}
            value={settings.employee_invite_mode}
            onChange={(v) => commit({ employee_invite_mode: v }, "employees")}
            options={[
              { value: "admin_only" as const, label: t("settings.employees.adminsOnly") },
              { value: "managers_allowed" as const, label: t("settings.employees.managersToo") },
              { value: "disabled" as const, label: t("settings.employees.disabled") },
            ]}
          />
        </Row>
        <Row label={t("settings.employees.passwordResetPolicy")}>
          <Segmented
            disabled={d}
            value={settings.password_reset_policy}
            onChange={(v) => commit({ password_reset_policy: v }, "employees")}
            options={[
              { value: "self_service" as const, label: t("settings.employees.selfService") },
              { value: "admin_only" as const, label: t("settings.employees.adminOnly") },
            ]}
          />
        </Row>
      </Card>

      <Card
        title={t("settings.employees.roleMatrix")}
        description={t("settings.employees.effectiveCapabilitiesForEachRole")}
      >
        <div className="kob-table-scroll">
          <table className="kob-table ">
            <thead>
              <tr>
                <th>{t("settings.employees.capability")}</th>
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

      <FormDialog
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={draft?.memberId ? (t("settings.employees.editEmployee")) : t("settings.employees.addEmployee")}
        onSubmit={submitDraft}
        busy={saving}
        submitLabel={draft?.memberId ? (t("common.actions.save")) : t("settings.employees.createAccount")}
        cancelLabel={t("common.actions.cancel")}
      >
        {draft ? (
          <div className="flex flex-col gap-3">
            <Input
              label={t("settings.employees.fullName")}
              value={draft.fullName}
              onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
            />
            <Input
              label={t("common.labels.email")}
              type="email"
              disabled={Boolean(draft.memberId)}
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
            <Input
              label={t("common.labels.phone")}
              placeholder="05XXXXXXXX"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <Input
              label={t("settings.employees.jobTitle")}
              value={draft.jobTitle}
              onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })}
            />
            <Select
              label={t("settings.employees.role")}
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as CompanyMemberRole })}
            >
              {ROLES.filter((r) => r !== "owner" || isOwner).map((r) => (
                <option key={r} value={r}>
                  {isAr ? ROLE_LABEL[r][0] : ROLE_LABEL[r][1]}
                </option>
              ))}
            </Select>
            <Select
              label={t("settings.employees.branch")}
              value={draft.branchId}
              onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
            >
              <option value="">{t("settings.employees.allBranches")}</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {isAr ? b.name_ar : b.name_en}
                </option>
              ))}
            </Select>
            {!draft.memberId ? (
              <Input
                label={t("settings.employees.initialPasswordOptional")}
                value={draft.password}
                placeholder={t("settings.employees.generatedAutomaticallyWhenLeftBlank")}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            ) : null}
            {draftError ? <Alert tone="danger">{draftError}</Alert> : null}
          </div>
        ) : null}
      </FormDialog>

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

      <DangerDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={t("settings.employees.deleteEmployee")}
        description={
          confirmDelete
            ? isAr
              ? `سيتم إزالة ${confirmDelete.profile?.full_name || confirmDelete.profile?.email} من الشركة ولن يستطيع الدخول بعد ذلك.`
              : `${confirmDelete.profile?.full_name || confirmDelete.profile?.email} will be removed from this company and lose access.`
            : undefined
        }
        confirmLabel={t("common.actions.delete")}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
        busy={busy === confirmDelete?.id}
      />
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
  const { t } = useI18n();
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
    <FormDialog
      open
      onClose={onClose}
      title={`${t("settings.employees.permissionsDialogTitle")} — ${member.profile?.full_name || member.profile?.email}`}
      onSubmit={save}
      busy={saving}
      submitDisabled={!canEdit}
      submitLabel={t("settings.employees.savePermissions")}
      cancelLabel={t("common.actions.close")}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CAPABILITIES.map((cap) => (
          <KobToggle
            key={cap.key}
            label={isAr ? cap.ar : cap.en}
            disabled={!canEdit}
            checked={Boolean(values[cap.key])}
            onCheckedChange={(v) => setValues((prev) => ({ ...prev, [cap.key]: v }))}
          />
        ))}
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </FormDialog>
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
  const { t } = useI18n();
  const activity = useQuery({
    queryKey: ["member-activity", organizationId, member.user_id],
    queryFn: () => listActivity(organizationId, { actorUserId: member.user_id, limit: 60 }),
  });

  return (
    <InformationDialog
      open
      onClose={onClose}
      title={`${t("settings.employees.activityDialogTitle")} — ${member.profile?.full_name || member.profile?.email}`}
    >
      <div className="col-span-full">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-3.5 w-3.5" />
          {member.branch
            ? isAr
              ? member.branch.name_ar
              : member.branch.name_en
            : t("settings.employees.allBranches")}
          <span>·</span>
          {t("settings.employees.lastLoginLabel")} {formatDate(member.last_login_at, isAr, t("settings.employees.never"))}
        </div>
        {activity.isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : (activity.data ?? []).length === 0 ? (
          <EmptyState
            title={t("settings.employees.noActivity")}
            description={t("settings.employees.noRecordedActivityYet")}
          />
        ) : (
          <ol className="flex flex-col gap-2">
            {(activity.data ?? []).map((row) => (
              <li key={row.id} data-severity={row.severity}>
                <div>
                  <strong>{row.action}</strong>
                  {row.entity_label ? <small>{row.entity_label}</small> : null}
                </div>
                <time>{formatDate(row.created_at, isAr, t("settings.employees.never"))}</time>
              </li>
            ))}
          </ol>
        )}
      </div>
    </InformationDialog>
  );
}
