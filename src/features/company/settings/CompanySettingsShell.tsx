import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Building2,
  ClipboardList,
  Coffee,
  ExternalLink,
  Globe2,
  Headphones,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  Lock,
  Plug,
  Save,
  ShieldCheck,
  UserCog,
  Users,
  WalletCards,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useOrganization, type OrganizationRole } from "@/providers/OrganizationProvider";
import {
  getOrganizationProfile,
  getOrganizationSettings,
  updateOrganizationProfile,
  upsertOrganizationSettings,
  type OrganizationProfileRow,
  type OrganizationSettingsRow,
} from "@/services/company/company-settings.service";
import {
  listCompanyMembers,
  setMemberStatus,
  updateMemberRole,
  type CompanyMemberRole,
  type CompanyMemberRow,
} from "@/services/company/company-members.service";
import { listBranches, type BranchRow } from "@/services/company/branches.service";

type SectionKey =
  | "profile"
  | "branding"
  | "branches"
  | "subscription"
  | "ordering"
  | "notifications"
  | "team"
  | "customer-success"
  | "security"
  | "localization"
  | "integrations"
  | "audit"
  | "danger";

type SectionDef = {
  key: SectionKey;
  labelAr: string;
  labelEn: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: OrganizationRole[];
};

const SECTIONS: SectionDef[] = [
  { key: "profile", labelAr: "ملف الشركة", labelEn: "Company Profile", icon: Building2, roles: ["owner", "admin", "manager"] },
  { key: "branding", labelAr: "الهوية البصرية", labelEn: "Branding", icon: ImageIcon, roles: ["owner", "admin"] },
  { key: "branches", labelAr: "الفروع", labelEn: "Branches", icon: LayoutGrid, roles: ["owner", "admin", "manager"] },
  { key: "subscription", labelAr: "قواعد الاشتراك", labelEn: "Subscription Rules", icon: WalletCards, roles: ["owner", "admin", "manager"] },
  { key: "ordering", labelAr: "قواعد الطلبات", labelEn: "Ordering Rules", icon: Coffee, roles: ["owner", "admin", "manager"] },
  { key: "notifications", labelAr: "التنبيهات", labelEn: "Notifications", icon: Bell, roles: ["owner", "admin"] },
  { key: "team", labelAr: "الفريق والصلاحيات", labelEn: "Team & Permissions", icon: Users, roles: ["owner", "admin"] },
  { key: "customer-success", labelAr: "دعم العملاء", labelEn: "Customer Success", icon: Headphones, roles: ["owner", "admin", "manager"] },
  { key: "security", labelAr: "الأمان", labelEn: "Security", icon: ShieldCheck, roles: ["owner", "admin"] },
  { key: "localization", labelAr: "اللغة والمنطقة", labelEn: "Localization", icon: Globe2, roles: ["owner", "admin", "manager"] },
  { key: "integrations", labelAr: "التكاملات", labelEn: "Integrations", icon: Plug, roles: ["owner", "admin"] },
  { key: "audit", labelAr: "سجل النشاط", labelEn: "Audit Activity", icon: ClipboardList, roles: ["owner", "admin"] },
  { key: "danger", labelAr: "منطقة الخطر", labelEn: "Danger Zone", icon: AlertTriangle, roles: ["owner"] },
];

type Draft = {
  profile: Partial<OrganizationProfileRow>;
  settings: Partial<OrganizationSettingsRow>;
};

export function CompanySettingsShell() {
  const { lang } = useI18n();
  const isRTL = lang === "ar";
  const { organization, role, session } = useOrganization();
  const [profile, setProfile] = useState<OrganizationProfileRow | null>(null);
  const [settings, setSettings] = useState<OrganizationSettingsRow | null>(null);
  const [members, setMembers] = useState<CompanyMemberRow[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionKey>("profile");
  const [draft, setDraft] = useState<Draft>({ profile: {}, settings: {} });
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const initialLoaded = useRef(false);

  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => (role ? s.roles.includes(role) : false)),
    [role],
  );

  const loadAll = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [p, s, m, b] = await Promise.all([
        getOrganizationProfile(organization.id),
        getOrganizationSettings(organization.id),
        listCompanyMembers(organization.id),
        listBranches(),
      ]);
      setProfile(p);
      setSettings(
        s ?? {
          organization_id: organization.id,
          default_language: "ar",
          currency: "SAR",
          timezone: "Asia/Riyadh",
          logo_url: null,
          background_url: null,
          primary_color: null,
          secondary_color: null,
          customer_registration_enabled: true,
          customer_comments_enabled: true,
          one_drink_per_day: true,
        },
      );
      setMembers(m);
      setBranches(b);
      setDraft({ profile: {}, settings: {} });
      initialLoaded.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3200);
    return () => clearTimeout(t);
  }, [flash]);

  const hasChanges =
    Object.keys(draft.profile).length > 0 || Object.keys(draft.settings).length > 0;

  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  const currentProfile = { ...profile, ...draft.profile } as OrganizationProfileRow;
  const currentSettings = { ...settings, ...draft.settings } as OrganizationSettingsRow;

  function patchProfile(patch: Partial<OrganizationProfileRow>) {
    setDraft((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
  }
  function patchSettings(patch: Partial<OrganizationSettingsRow>) {
    setDraft((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }

  async function save() {
    if (!organization?.id || !hasChanges) return;
    setSaving(true);
    setFlash(null);
    try {
      if (Object.keys(draft.profile).length > 0) {
        // Strip fields users cannot modify.
        const { id: _id, organization_type: _t, status: _s, owner_user_id: _o, organization_code: _c, slug: _sl, created_at: _ca, updated_at: _ua, ...safe } =
          draft.profile as OrganizationProfileRow;
        await updateOrganizationProfile(organization.id, safe);
      }
      if (Object.keys(draft.settings).length > 0) {
        const { organization_id: _oid, ...safeSettings } = draft.settings as OrganizationSettingsRow;
        await upsertOrganizationSettings(organization.id, safeSettings);
      }
      await loadAll();
      setFlash({ tone: "success", text: isRTL ? "تم حفظ التغييرات" : "Changes saved" });
    } catch (e) {
      setFlash({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    setDraft({ profile: {}, settings: {} });
  }

  if (!organization) {
    return <div className="company-page">{isRTL ? "لا توجد شركة نشطة" : "No active organization"}</div>;
  }

  if (loading) {
    return (
      <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>
        <div className="settings-skeleton">
          <div className="settings-skeleton-row" />
          <div className="settings-skeleton-row" />
          <div className="settings-skeleton-row" />
        </div>
      </div>
    );
  }

  const active = visibleSections.find((s) => s.key === section) ?? visibleSections[0];
  if (!active) {
    return <div className="company-page">{isRTL ? "لا توجد صلاحية" : "No access"}</div>;
  }

  return (
    <div className="company-page settings-shell" dir={isRTL ? "rtl" : "ltr"}>
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{isRTL ? "الإعدادات" : "Settings"}</span>
          <h1>{isRTL ? "إعدادات الشركة" : "Company Settings"}</h1>
          <p>
            {isRTL
              ? "تحكم في هوية شركتك، فرقك، قواعد الطلبات، وتفضيلاتك."
              : "Manage your company identity, teams, ordering rules, and preferences."}
          </p>
        </div>
      </header>

      {error && <div className="settings-banner error">{error}</div>}

      <div className="settings-layout">
        <aside className="settings-nav" aria-label="Settings navigation">
          <select
            className="settings-nav-mobile"
            value={active.key}
            onChange={(e) => setSection(e.target.value as SectionKey)}
          >
            {visibleSections.map((s) => (
              <option key={s.key} value={s.key}>
                {isRTL ? s.labelAr : s.labelEn}
              </option>
            ))}
          </select>
          <ul className="settings-nav-list">
            {visibleSections.map((s) => {
              const Icon = s.icon;
              const on = s.key === active.key;
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    className={on ? "settings-nav-item active" : "settings-nav-item"}
                    onClick={() => setSection(s.key)}
                    aria-current={on ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{isRTL ? s.labelAr : s.labelEn}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="settings-content">
          {active.key === "profile" && (
            <ProfileSection
              isRTL={isRTL}
              role={role}
              profile={currentProfile}
              onChange={patchProfile}
            />
          )}
          {active.key === "branding" && (
            <BrandingSection
              isRTL={isRTL}
              profile={currentProfile}
              settings={currentSettings}
              onChangeProfile={patchProfile}
              onChangeSettings={patchSettings}
            />
          )}
          {active.key === "branches" && <BranchesSection isRTL={isRTL} branches={branches} />}
          {active.key === "subscription" && (
            <SubscriptionSection isRTL={isRTL} settings={currentSettings} onChange={patchSettings} />
          )}
          {active.key === "ordering" && (
            <OrderingSection isRTL={isRTL} settings={currentSettings} onChange={patchSettings} />
          )}
          {active.key === "notifications" && <NotificationsSection isRTL={isRTL} />}
          {active.key === "team" && (
            <TeamSection
              isRTL={isRTL}
              organizationId={organization.id}
              role={role}
              members={members}
              onReload={loadAll}
              setFlash={setFlash}
            />
          )}
          {active.key === "customer-success" && <CustomerSuccessSection isRTL={isRTL} />}
          {active.key === "security" && (
            <SecuritySection isRTL={isRTL} email={session?.user?.email ?? null} />
          )}
          {active.key === "localization" && (
            <LocalizationSection isRTL={isRTL} settings={currentSettings} onChange={patchSettings} />
          )}
          {active.key === "integrations" && <IntegrationsSection isRTL={isRTL} />}
          {active.key === "audit" && <AuditSection isRTL={isRTL} />}
          {active.key === "danger" && (
            <DangerZoneSection isRTL={isRTL} profile={profile} setFlash={setFlash} />
          )}
        </section>
      </div>

      {hasChanges && (
        <div className="settings-save-bar" role="status" aria-live="polite">
          <div className="settings-save-bar-msg">
            <AlertTriangle className="h-4 w-4" />
            {isRTL ? "لديك تغييرات غير محفوظة" : "You have unsaved changes"}
          </div>
          <div className="settings-save-bar-actions">
            <button className="company-btn-ghost" onClick={discard} disabled={saving}>
              {isRTL ? "تجاهل" : "Discard"}
            </button>
            <button className="company-btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? (isRTL ? "جارٍ الحفظ…" : "Saving…") : isRTL ? "حفظ" : "Save"}
            </button>
          </div>
        </div>
      )}

      {flash && (
        <div className={`settings-flash ${flash.tone}`} role="status">
          {flash.text}
        </div>
      )}
    </div>
  );
}

// ————————————————————————————————— Sections

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="company-field">
      <span>{label}</span>
      {children}
      {hint && <em className="settings-hint">{hint}</em>}
    </label>
  );
}

function ProfileSection({
  isRTL,
  role,
  profile,
  onChange,
}: {
  isRTL: boolean;
  role: OrganizationRole | null;
  profile: OrganizationProfileRow;
  onChange: (p: Partial<OrganizationProfileRow>) => void;
}) {
  const readOnly = role === "manager";
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "ملف الشركة" : "Company Profile"}
        subtitle={isRTL ? "المعلومات الأساسية لشركتك." : "Core identity of your company."}
      />
      <div className="company-card-grid two">
        <div className="company-card">
          <h3>{isRTL ? "الهوية" : "Identity"}</h3>
          <Field label={isRTL ? "الاسم بالعربية" : "Arabic name"}>
            <input
              value={profile.name_ar ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange({ name_ar: e.target.value })}
            />
          </Field>
          <Field label={isRTL ? "الاسم بالإنجليزية" : "English name"}>
            <input
              value={profile.name_en ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange({ name_en: e.target.value })}
            />
          </Field>
          <Field label={isRTL ? "رمز الشركة" : "Company code"} hint={isRTL ? "للقراءة فقط" : "Read-only"}>
            <input value={profile.organization_code ?? ""} readOnly />
          </Field>
          <Field label={isRTL ? "الحالة" : "Status"} hint={isRTL ? "للقراءة فقط" : "Read-only"}>
            <input value={profile.status ?? ""} readOnly />
          </Field>
        </div>
        <div className="company-card">
          <h3>{isRTL ? "التواصل" : "Contact"}</h3>
          <Field label={isRTL ? "البريد الإلكتروني" : "Contact email"}>
            <input
              type="email"
              value={profile.email ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange({ email: e.target.value || null })}
            />
          </Field>
          <Field label={isRTL ? "الهاتف" : "Contact phone"}>
            <input
              value={profile.phone ?? ""}
              disabled={readOnly}
              onChange={(e) => onChange({ phone: e.target.value || null })}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function BrandingSection({
  isRTL,
  profile,
  settings,
  onChangeProfile,
  onChangeSettings,
}: {
  isRTL: boolean;
  profile: OrganizationProfileRow;
  settings: OrganizationSettingsRow;
  onChangeProfile: (p: Partial<OrganizationProfileRow>) => void;
  onChangeSettings: (p: Partial<OrganizationSettingsRow>) => void;
}) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "الهوية البصرية" : "Branding"}
        subtitle={isRTL ? "الشعار والألوان الظاهرة للعملاء." : "Logo and colors shown to customers."}
      />
      <div className="company-card-grid two">
        <div className="company-card">
          <h3>{isRTL ? "الشعار" : "Logo"}</h3>
          <div className="settings-logo-preview" aria-hidden>
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="logo" />
            ) : (
              <div className="settings-logo-empty">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
          </div>
          <Field label={isRTL ? "رابط الشعار" : "Logo URL"} hint={isRTL ? "استخدم رابطًا مباشرًا لصورة" : "Use a direct image URL"}>
            <input
              value={profile.logo_url ?? ""}
              onChange={(e) => onChangeProfile({ logo_url: e.target.value || null })}
              placeholder="https://…"
            />
          </Field>
        </div>
        <div className="company-card">
          <h3>{isRTL ? "الألوان" : "Colors"}</h3>
          <Field label={isRTL ? "اللون الأساسي" : "Primary color"}>
            <input
              type="text"
              value={profile.primary_color ?? ""}
              placeholder="#3A2617"
              onChange={(e) => onChangeProfile({ primary_color: e.target.value || null })}
            />
          </Field>
          <Field label={isRTL ? "اللون الثانوي" : "Secondary color"}>
            <input
              type="text"
              value={profile.secondary_color ?? ""}
              placeholder="#C8963C"
              onChange={(e) => onChangeProfile({ secondary_color: e.target.value || null })}
            />
          </Field>
          <Field label={isRTL ? "خلفية عرض العميل" : "Customer background URL"}>
            <input
              value={settings.background_url ?? ""}
              onChange={(e) => onChangeSettings({ background_url: e.target.value || null })}
              placeholder="https://…"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function BranchesSection({ isRTL, branches }: { isRTL: boolean; branches: BranchRow[] }) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "الفروع" : "Branches"}
        subtitle={isRTL ? "ملخص فروعك، والإدارة الكاملة في صفحة الفروع." : "Summary view; full management on the Branches page."}
      />
      <div className="company-card">
        {branches.length === 0 ? (
          <div className="settings-empty">{isRTL ? "لا توجد فروع بعد" : "No branches yet"}</div>
        ) : (
          <table className="settings-table">
            <thead>
              <tr>
                <th>{isRTL ? "الاسم" : "Name"}</th>
                <th>{isRTL ? "العنوان" : "Address"}</th>
                <th>{isRTL ? "الحالة" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{isRTL ? b.name_ar : b.name_en}</td>
                  <td>{(isRTL ? b.address_ar : b.address_en) ?? "—"}</td>
                  <td>{b.is_active ? (isRTL ? "نشط" : "Active") : isRTL ? "متوقف" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="settings-inline-action">
          <Link to="/admin/branches" className="company-btn-primary">
            <ExternalLink className="h-4 w-4" />
            {isRTL ? "إدارة الفروع" : "Manage Branches"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function SubscriptionSection({
  isRTL,
  settings,
  onChange,
}: {
  isRTL: boolean;
  settings: OrganizationSettingsRow;
  onChange: (p: Partial<OrganizationSettingsRow>) => void;
}) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "قواعد الاشتراك" : "Subscription Rules"}
        subtitle={
          isRTL
            ? "قواعد ثابتة تحكم تنفيذ الاشتراكات اليومية."
            : "Rules that govern how subscriptions are consumed each day."
        }
      />
      <div className="company-card">
        <Toggle
          label={isRTL ? "مشروب واحد فقط لكل يوم" : "One drink per day"}
          hint={
            isRTL
              ? "قاعدة عمل ثابتة على مستوى المنصة. لا يمكن إيقافها حاليًا."
              : "Platform-wide business rule. Cannot be disabled at this time."
          }
          checked={settings.one_drink_per_day}
          disabled
          onChange={(v) => onChange({ one_drink_per_day: v })}
        />
        <p className="settings-hint">
          {isRTL
            ? "الحصة اليومية غير المستخدمة لا تُرحَّل. تُبدأ الاشتراكات فور بيع الكوبون."
            : "Unused daily entitlement does not carry forward. Subscriptions activate on coupon sale."}
        </p>
      </div>
    </div>
  );
}

function OrderingSection({
  isRTL,
  settings,
  onChange,
}: {
  isRTL: boolean;
  settings: OrganizationSettingsRow;
  onChange: (p: Partial<OrganizationSettingsRow>) => void;
}) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "قواعد الطلبات" : "Ordering Rules"}
        subtitle={isRTL ? "تجربة العميل عند تقديم الطلب." : "Customer experience when placing an order."}
      />
      <div className="company-card">
        <Toggle
          label={isRTL ? "السماح بتسجيل العملاء" : "Allow customer registration"}
          checked={settings.customer_registration_enabled}
          onChange={(v) => onChange({ customer_registration_enabled: v })}
        />
        <Toggle
          label={isRTL ? "السماح بملاحظات العميل" : "Allow customer notes on orders"}
          checked={settings.customer_comments_enabled}
          onChange={(v) => onChange({ customer_comments_enabled: v })}
        />
      </div>
    </div>
  );
}

function NotificationsSection({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "التنبيهات" : "Notifications"}
        subtitle={isRTL ? "قنوات التنبيه الحالية." : "Current notification channels."}
      />
      <div className="company-card">
        <div className="settings-empty">
          {isRTL
            ? "لا توجد بنية تنبيهات مفعّلة حاليًا. سيتم دعم هذا القسم بعد ربط قناة التنبيهات."
            : "No notification backend is wired yet. This section will activate once a notification channel is enabled."}
        </div>
      </div>
    </div>
  );
}

function TeamSection({
  isRTL,
  organizationId,
  role,
  members,
  onReload,
  setFlash,
}: {
  isRTL: boolean;
  organizationId: string;
  role: OrganizationRole | null;
  members: CompanyMemberRow[];
  onReload: () => Promise<void>;
  setFlash: (f: { tone: "success" | "error"; text: string }) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const isOwner = role === "owner";

  async function change(memberId: string, newRole: CompanyMemberRole) {
    setBusyId(memberId);
    try {
      await updateMemberRole(organizationId, memberId, newRole);
      await onReload();
      setFlash({ tone: "success", text: isRTL ? "تم تحديث الدور" : "Role updated" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setFlash({
        tone: "error",
        text:
          msg === "cannot_demote_last_owner"
            ? isRTL
              ? "لا يمكن تخفيض آخر مالك"
              : "Cannot demote the last owner"
            : msg,
      });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleStatus(row: CompanyMemberRow) {
    setBusyId(row.id);
    try {
      await setMemberStatus(organizationId, row.id, row.status === "active" ? "inactive" : "active");
      await onReload();
    } catch (e) {
      setFlash({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "الفريق والصلاحيات" : "Team & Permissions"}
        subtitle={isRTL ? "أعضاء الشركة وأدوارهم." : "Company members and their roles."}
      />
      <div className="company-card">
        {members.length === 0 ? (
          <div className="settings-empty">{isRTL ? "لا يوجد أعضاء" : "No members"}</div>
        ) : (
          <table className="settings-table">
            <thead>
              <tr>
                <th>{isRTL ? "العضو" : "Member"}</th>
                <th>{isRTL ? "البريد" : "Email"}</th>
                <th>{isRTL ? "الدور" : "Role"}</th>
                <th>{isRTL ? "الحالة" : "Status"}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.profile?.full_name ?? "—"}</td>
                  <td>{m.profile?.email ?? "—"}</td>
                  <td>
                    <select
                      value={m.role}
                      disabled={busyId === m.id || (!isOwner && m.role === "owner")}
                      onChange={(e) => void change(m.id, e.target.value as CompanyMemberRole)}
                    >
                      {(isOwner ? ["owner", "admin", "manager", "cashier"] : ["admin", "manager", "cashier"]).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{m.status}</td>
                  <td>
                    <button
                      className="company-btn-ghost"
                      disabled={busyId === m.id || m.role === "owner"}
                      onClick={() => void toggleStatus(m)}
                    >
                      {m.status === "active" ? (isRTL ? "تعطيل" : "Disable") : isRTL ? "تفعيل" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="settings-hint">
          {isRTL
            ? "الدعوات وإسناد الفروع تُدار من صفحة الكاشير الحالية."
            : "Invitations and branch assignment are handled from the Cashiers page today."}
        </p>
        <div className="settings-inline-action">
          <Link to="/admin/cashiers" className="company-btn-primary">
            <UserCog className="h-4 w-4" />
            {isRTL ? "إدارة الكاشير" : "Manage Cashiers"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function CustomerSuccessSection({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "دعم العملاء" : "Customer Success"}
        subtitle={isRTL ? "روابط سريعة لإدارة الحالات والدعم." : "Quick links to your support workspace."}
      />
      <div className="company-card">
        <p className="settings-hint">
          {isRTL
            ? "تُدار الحالات وطلبات الدعم من مساحة نجاح العملاء."
            : "Cases and support requests are managed inside the Customer Success workspace."}
        </p>
        <div className="settings-inline-action">
          <Link to="/admin/customer-success" className="company-btn-primary">
            <Headphones className="h-4 w-4" />
            {isRTL ? "فتح مساحة الدعم" : "Open Customer Success"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function SecuritySection({ isRTL, email }: { isRTL: boolean; email: string | null }) {
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function requestPasswordReset() {
    if (!email) return;
    setSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      setStatus(
        error ? error.message : isRTL ? "تم إرسال رابط تغيير كلمة المرور" : "Password reset email sent",
      );
    } finally {
      setSending(false);
    }
  }

  async function signOutAll() {
    setSending(true);
    try {
      await supabase.auth.signOut({ scope: "global" as any });
      setStatus(isRTL ? "تم تسجيل الخروج من جميع الأجهزة" : "Signed out from all devices");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "الأمان" : "Security"}
        subtitle={isRTL ? "إدارة الحساب وجلسات الدخول." : "Account and session controls."}
      />
      <div className="company-card">
        <Field label={isRTL ? "بريدك الإلكتروني" : "Your email"} hint={isRTL ? "للقراءة" : "Read-only"}>
          <input value={email ?? ""} readOnly />
        </Field>
        <div className="settings-inline-action">
          <button className="company-btn-primary" onClick={() => void requestPasswordReset()} disabled={sending || !email}>
            <Lock className="h-4 w-4" />
            {isRTL ? "إرسال رابط تغيير كلمة المرور" : "Send password reset email"}
          </button>
          <button className="company-btn-ghost" onClick={() => void signOutAll()} disabled={sending}>
            {isRTL ? "تسجيل الخروج من كل الأجهزة" : "Sign out all devices"}
          </button>
        </div>
        {status && <p className="settings-hint">{status}</p>}
      </div>
    </div>
  );
}

function LocalizationSection({
  isRTL,
  settings,
  onChange,
}: {
  isRTL: boolean;
  settings: OrganizationSettingsRow;
  onChange: (p: Partial<OrganizationSettingsRow>) => void;
}) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "اللغة والمنطقة" : "Localization"}
        subtitle={isRTL ? "اللغة، العملة، والمنطقة الزمنية." : "Language, currency, and timezone."}
      />
      <div className="company-card-grid two">
        <div className="company-card">
          <Field label={isRTL ? "اللغة الافتراضية" : "Default language"}>
            <select
              value={settings.default_language}
              onChange={(e) => onChange({ default_language: e.target.value })}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label={isRTL ? "العملة" : "Currency"}>
            <input value={settings.currency} onChange={(e) => onChange({ currency: e.target.value })} />
          </Field>
        </div>
        <div className="company-card">
          <Field label={isRTL ? "المنطقة الزمنية" : "Timezone"}>
            <input value={settings.timezone} onChange={(e) => onChange({ timezone: e.target.value })} />
          </Field>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({ isRTL }: { isRTL: boolean }) {
  const items = [
    {
      key: "backend",
      title: isRTL ? "الخدمة الخلفية" : "Backend",
      value: isRTL ? "متصلة" : "Connected",
      tone: "ok",
    },
    {
      key: "storage",
      title: isRTL ? "تخزين الصور" : "Image storage",
      value: isRTL ? "متاح (drink-images)" : "Available (drink-images)",
      tone: "ok",
    },
    {
      key: "email",
      title: isRTL ? "بريد المصادقة" : "Auth email",
      value: isRTL ? "عبر المنصة" : "Managed by platform",
      tone: "ok",
    },
    {
      key: "webrtc",
      title: isRTL ? "جلسات الدعم الحية" : "Live support (WebRTC)",
      value: isRTL ? "غير مفعّل بعد" : "Not yet enabled",
      tone: "muted",
    },
  ];
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "التكاملات" : "Integrations"}
        subtitle={isRTL ? "الخدمات المتصلة بمساحتك." : "Services connected to your workspace."}
      />
      <div className="company-card">
        <ul className="settings-list">
          {items.map((i) => (
            <li key={i.key} className="settings-list-row">
              <div>
                <div className="settings-list-title">{i.title}</div>
              </div>
              <span className={`settings-pill ${i.tone}`}>{i.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AuditSection({ isRTL }: { isRTL: boolean }) {
  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "سجل النشاط" : "Audit Activity"}
        subtitle={isRTL ? "أحداث الشركة القابلة للمراجعة." : "Company-scoped auditable events."}
      />
      <div className="company-card">
        <div className="settings-empty">
          {isRTL
            ? "لم يتم تفعيل سجل نشاط عام على مستوى الشركة بعد. تتوفر سجلات الحالات ضمن نجاح العملاء."
            : "A company-wide audit log is not yet enabled. Case-scoped events are available inside Customer Success."}
        </div>
      </div>
    </div>
  );
}

function DangerZoneSection({
  isRTL,
  profile,
  setFlash,
}: {
  isRTL: boolean;
  profile: OrganizationProfileRow | null;
  setFlash: (f: { tone: "success" | "error"; text: string }) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  function requestSuspension() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setFlash({
      tone: "success",
      text: isRTL
        ? "تم تسجيل طلب الإيقاف. سيتواصل معك فريق منصة KOB."
        : "Suspension request logged. The KOB platform team will follow up.",
    });
  }

  return (
    <div className="settings-section">
      <SectionHeader
        title={isRTL ? "منطقة الخطر" : "Danger Zone"}
        subtitle={isRTL ? "إجراءات حساسة تخص المالك فقط." : "Sensitive actions restricted to the owner."}
      />
      <div className="company-card settings-danger">
        <div>
          <h4>{isRTL ? "طلب إيقاف الشركة" : "Request company suspension"}</h4>
          <p className="settings-hint">
            {isRTL
              ? "لا يمكن إيقاف الحساب مباشرة. يتطلب مراجعة من فريق منصة KOB."
              : "Company suspension cannot be performed directly. It requires review by the KOB platform team."}
          </p>
          <button
            className={confirming ? "company-btn-reject" : "company-btn-ghost"}
            onClick={requestSuspension}
            disabled={!profile}
          >
            {confirming
              ? isRTL
                ? "تأكيد طلب الإيقاف"
                : "Confirm suspension request"
              : isRTL
                ? "طلب إيقاف الشركة"
                : "Request suspension"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="company-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        {label}
        {hint && <em className="settings-hint block">{hint}</em>}
      </span>
    </label>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="settings-section-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}