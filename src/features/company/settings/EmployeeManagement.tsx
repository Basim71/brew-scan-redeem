import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Minus, Search } from "lucide-react";

import { listBranches } from "@/services/company/branches.service";
import {
  listCompanyMembers,
  setMemberBranch,
  setMemberStatus,
  updateMemberRole,
  type CompanyMemberRole,
} from "@/services/company/company-members.service";
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
  { key: "audit", ar: "سجل التغييرات", en: "Audit log", roles: ["owner"] },
];

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
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (members.data ?? []).filter((m) => {
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!term) return true;
      return [m.profile?.full_name, m.profile?.email, m.branch?.name_en, m.branch?.name_ar]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [members.data, roleFilter, search]);

  const run = async (memberId: string, action: () => Promise<void>) => {
    setBusy(memberId);
    setRowError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["company-members", organizationId] });
    } catch (err: any) {
      setRowError(translateError(err?.message, isAr));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="cs-stack">
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
        title={isAr ? "الفريق" : "Team"}
        description={isAr ? "الأدوار وربط كل موظف بفرعه." : "Roles and per-employee branch assignment."}
        aside={
          <Link to="/admin/cashiers" className="cs-link">
            {isAr ? "إضافة موظف" : "Add employee"}
          </Link>
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
                  <th>{isAr ? "نشط" : "Active"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8)}</strong>
                      <small>{m.profile?.email}</small>
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
                        onChange={(e) => run(m.id, () => setMemberBranch(organizationId, m.id, e.target.value || null))}
                      >
                        <option value="">{isAr ? "كل الفروع" : "All branches"}</option>
                        {(branches.data ?? []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.branch_code ? `${b.branch_code} · ` : ""}
                            {isAr ? b.name_ar : b.name_en}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Toggle
                        label="status"
                        disabled={d || busy === m.id || m.role === "owner"}
                        checked={m.status === "active"}
                        onChange={(v) => run(m.id, () => setMemberStatus(organizationId, m.id, v ? "active" : "inactive"))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title={isAr ? "مصفوفة الصلاحيات" : "Permission matrix"}
        description={
          isAr
            ? "الصلاحيات الفعلية المطبَّقة على مستوى المسارات وقاعدة البيانات."
            : "Effective permissions enforced by route guards and database policies."
        }
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
                    <td key={r} className="cs-matrix-cell">
                      {cap.roles.includes(r) ? (
                        <Check className="h-3.5 w-3.5 cs-yes" />
                      ) : (
                        <Minus className="h-3.5 w-3.5 cs-no" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}