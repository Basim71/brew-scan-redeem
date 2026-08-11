import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  Globe2,
  Loader2,
  Plug,
  Search as SearchIcon,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCog,
  WalletCards,
} from "lucide-react";

import { PageHeader, Select, SearchInput, WarningCard } from "@/components/kob";
import { useI18n } from "@/lib/i18n";
import { useOrganization, type OrganizationRole } from "@/providers/OrganizationProvider";
import {
  getOrganizationProfile,
  listSettingsAudit,
  updateOrganizationProfile,
  type OrganizationProfileRow,
  type OrganizationSettingsRow,
  type PaymentMethod,
  type SettingsPatch,
} from "@/services/company/company-settings.service";
import {
  listCompanyMembers,
  setMemberStatus,
  updateMemberRole,
  type CompanyMemberRole,
} from "@/services/company/company-members.service";
import { listBranches } from "@/services/company/branches.service";
import { useCompanySettings } from "./useCompanySettings";
import { LogoUploader } from "./LogoUploader";
import { Card, CheckChip, Row, SaveIndicator, Segmented, Toggle, type SaveState } from "./parts";
import { NumberInput, TextInput, translateError } from "./inputs";
import { CustomerExperienceSection } from "./CustomerExperience";
import { NotificationsSection } from "./NotificationsSection";
import { EmployeeManagementSection } from "./EmployeeManagement";
import { BranchManagementSection } from "./BranchManagement";
import { IntegrationsSection } from "./IntegrationsSection";
import { AuditLogSection } from "./AuditLog";

type SectionKey =
  | "general"
  | "business"
  | "membership"
  | "ordering"
  | "experience"
  | "notifications"
  | "security"
  | "employees"
  | "branches"
  | "integrations"
  | "audit";

const SECTIONS: Array<{
  key: SectionKey;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  group: GroupKey;
  icon: any;
  roles: OrganizationRole[];
}> = [
  {
    key: "general",
    ar: "عام",
    en: "General",
    descAr: "هوية الشركة وبيانات التواصل واللغة والمنطقة الزمنية.",
    descEn: "Company identity, contact details, language and timezone.",
    group: "company",
    icon: Settings2,
    roles: ["owner", "admin", "manager"],
  },
  {
    key: "business",
    ar: "الأعمال",
    en: "Business",
    descAr: "قنوات البيع ووسائل الدفع والضريبة والفواتير وساعات العمل.",
    descEn: "Sales channels, payments, tax, invoicing and business hours.",
    group: "company",
    icon: WalletCards,
    roles: ["owner", "admin"],
  },
  {
    key: "membership",
    ar: "العضوية",
    en: "Membership",
    descAr: "قواعد الاشتراكات والتفعيل والتجديد والتذكيرات.",
    descEn: "Subscription rules, activation, renewals and reminders.",
    group: "operations",
    icon: CreditCard,
    roles: ["owner", "admin"],
  },
  {
    key: "ordering",
    ar: "الطلبات",
    en: "Ordering",
    descAr: "مسار الطلب ومدة التحضير وسلوك الطابور وأرقام الطلبات.",
    descEn: "Order workflow, prep time, queue behaviour and numbering.",
    group: "operations",
    icon: ShoppingBag,
    roles: ["owner", "admin", "manager"],
  },
  {
    key: "experience",
    ar: "تجربة العميل",
    en: "Customer Experience",
    descAr: "معاينة مباشرة لرحلة العميل على الجوال وتحرير كل شاشة.",
    descEn: "Live mobile preview of the customer journey with inline editing.",
    group: "operations",
    icon: Sparkles,
    roles: ["owner", "admin", "manager"],
  },
  {
    key: "notifications",
    ar: "مركز التنبيهات",
    en: "Notification Center",
    descAr: "البريد والرسائل والإشعارات وواتساب والأحداث والقوالب.",
    descEn: "Email, SMS, push, WhatsApp, system events and templates.",
    group: "operations",
    icon: Bell,
    roles: ["owner", "admin"],
  },
  {
    key: "security",
    ar: "مركز الأمان",
    en: "Security Center",
    descAr: "الجلسات والأجهزة والتحقق بخطوتين وسياسات كلمات المرور وقيود الدخول.",
    descEn: "Sessions, devices, MFA, password policies and access restrictions.",
    group: "governance",
    icon: ShieldCheck,
    roles: ["owner", "admin"],
  },
  {
    key: "employees",
    ar: "الموظفون",
    en: "Employees",
    descAr: "إضافة وتعديل الموظفين والأدوار والصلاحيات والفروع والنشاط.",
    descEn: "Add and edit employees, roles, permissions, branches and activity.",
    group: "people",
    icon: UserCog,
    roles: ["owner", "admin"],
  },
  {
    key: "branches",
    ar: "الفروع",
    en: "Branches",
    descAr: "إنشاء الفروع ورموز QR وساعات العمل والعناوين.",
    descEn: "Create branches, QR codes, business hours and addresses.",
    group: "people",
    icon: Building2,
    roles: ["owner", "admin"],
  },
  {
    key: "integrations",
    ar: "مركز التكاملات",
    en: "Integration Hub",
    descAr: "بوابات الدفع وأنظمة نقاط البيع ومزودو الرسائل والفاتورة الإلكترونية.",
    descEn: "Payment gateways, POS systems, messaging providers and e-invoicing.",
    group: "governance",
    icon: Plug,
    roles: ["owner", "admin"],
  },
  {
    key: "audit",
    ar: "مركز النشاط",
    en: "Activity Center",
    descAr: "بحث وتصفية وتسلسل زمني لكل تغيير وتصدير السجل.",
    descEn: "Search, filter and export a full timeline of every change.",
    group: "governance",
    icon: ClipboardList,
    roles: ["owner", "admin"],
  },
];

type GroupKey = "company" | "operations" | "people" | "governance";

const GROUPS: Array<{ key: GroupKey; ar: string; en: string }> = [
  { key: "company", ar: "الشركة", en: "Company" },
  { key: "operations", ar: "التشغيل", en: "Operations" },
  { key: "people", ar: "الفريق والفروع", en: "People & Branches" },
  { key: "governance", ar: "الحماية والتكاملات", en: "Governance" },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; ar: string; en: string }> = [
  { value: "cash", ar: "نقدي", en: "Cash" },
  { value: "card", ar: "بطاقة", en: "Card" },
  { value: "apple_pay", ar: "Apple Pay", en: "Apple Pay" },
  { value: "stc_pay", ar: "STC Pay", en: "STC Pay" },
  { value: "mada", ar: "مدى", en: "Mada" },
  { value: "bank_transfer", ar: "تحويل بنكي", en: "Bank Transfer" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(05\d{8}|\+9665\d{8})$/;

export function CompanySettingsShell() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { organization, role } = useOrganization();
  const organizationId = organization?.id ?? null;
  const queryClient = useQueryClient();

  const canEdit = role === "owner" || role === "admin";
  const visible = useMemo(() => SECTIONS.filter((s) => (role ? s.roles.includes(role) : false)), [role]);
  const [section, setSection] = useState<SectionKey>("general");
  const [navQuery, setNavQuery] = useState("");

  const navItems = useMemo(() => {
    const term = navQuery.trim().toLowerCase();
    if (!term) return visible;
    return visible.filter((item) =>
      [item.ar, item.en, item.descAr, item.descEn].some((value) => value.toLowerCase().includes(term)),
    );
  }, [navQuery, visible]);

  const activeSection = useMemo(() => SECTIONS.find((item) => item.key === section) ?? null, [section]);

  useEffect(() => {
    if (visible.length && !visible.some((s) => s.key === section)) setSection(visible[0]!.key);
  }, [visible, section]);

  // Deep links from the Manage dropdown (/admin/settings#audit, #notifications, …)
  const routeHash = useRouterState({ select: (state) => state.location.hash });
  useEffect(() => {
    const key = (routeHash || "").replace("#", "");
    if (key && SECTIONS.some((s) => s.key === key)) setSection(key as SectionKey);
  }, [routeHash]);

  const { settings, isLoading, error, save } = useCompanySettings();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const resetTimer = useRef<number | null>(null);

  const flashSaved = useCallback(() => {
    setSaveState("saved");
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setSaveState("idle"), 1800);
  }, []);

  const commit = useCallback(
    async (patch: SettingsPatch, sectionName: string) => {
      if (!canEdit) return;
      setSaveState("saving");
      setSaveMessage(null);
      try {
        await save(patch, sectionName);
        flashSaved();
      } catch (err: any) {
        setSaveState("error");
        setSaveMessage(translateError(err?.message, isAr));
      }
    },
    [canEdit, flashSaved, isAr, save],
  );

  /* ---- profile ---- */
  const profileQuery = useQuery({
    queryKey: ["company-profile", organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => getOrganizationProfile(organizationId as string),
  });
  const profile = profileQuery.data ?? null;

  const commitProfile = useCallback(
    async (patch: Partial<OrganizationProfileRow>) => {
      if (!canEdit || !organizationId) return;
      const previous = profile;
      setSaveState("saving");
      setSaveMessage(null);
      queryClient.setQueryData(["company-profile", organizationId], { ...previous, ...patch });
      try {
        const row = await updateOrganizationProfile(organizationId, patch as any);
        queryClient.setQueryData(["company-profile", organizationId], row);
        void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "company-profile" });
        flashSaved();
      } catch (err: any) {
        queryClient.setQueryData(["company-profile", organizationId], previous);
        setSaveState("error");
        setSaveMessage(translateError(err?.message, isAr));
      }
    },
    [canEdit, flashSaved, isAr, organizationId, profile, queryClient],
  );

  if (!organizationId) return null;

  return (
    <div className="cs-shell" dir={isAr ? "rtl" : "ltr"}>
      <header className="cs-header">
        <div>
          <span className="cs-eyebrow">{isAr ? "لوحة الشركة" : "Company"}</span>
          <h1>{isAr ? "مركز إدارة الشركة" : "Company Administration"}</h1>
          <p>
            {isAr
              ? "مصدر واحد لكل إعدادات الشركة — كل تغيير يُحفظ فورًا ويُطبَّق على النظام بالكامل."
              : "One source of truth for company configuration — every change saves instantly and applies everywhere."}
          </p>
        </div>
        <SaveIndicator state={saveState} lang={isAr ? "ar" : "en"} message={saveMessage} />
      </header>

      {!canEdit ? (
        <div className="cs-readonly">
          {isAr
            ? "لديك صلاحية عرض فقط. تعديل إعدادات الشركة متاح لمالك الشركة والمشرفين."
            : "You have read-only access. Only company owners and admins can edit settings."}
        </div>
      ) : null}

      <div className="cs-layout">
        <nav className="cs-nav" aria-label={isAr ? "أقسام الإعدادات" : "Settings sections"}>
          <label className="cs-nav-search">
            <SearchIcon className="h-3.5 w-3.5" />
            <input
              value={navQuery}
              placeholder={isAr ? "ابحث في الإعدادات" : "Search settings"}
              onChange={(event) => setNavQuery(event.target.value)}
            />
          </label>
          {GROUPS.map((group) => {
            const items = navItems.filter((item) => item.group === group.key);
            if (!items.length) return null;
            return (
              <div key={group.key} className="cs-nav-group">
                <span className="cs-nav-group-title">{isAr ? group.ar : group.en}</span>
                {items.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    data-active={s.key === section ? "true" : "false"}
                    onClick={() => setSection(s.key)}
                  >
                    <s.icon className="h-4 w-4" />
                    <span>{isAr ? s.ar : s.en}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {navItems.length === 0 ? (
            <p className="cs-nav-empty">{isAr ? "لا نتائج مطابقة." : "No matching sections."}</p>
          ) : null}
        </nav>

        <div className="cs-content">
          {activeSection ? (
            <div className="cs-module-hero">
              <span className="cs-module-icon">
                <activeSection.icon className="h-5 w-5" />
              </span>
              <div>
                <h2>{isAr ? activeSection.ar : activeSection.en}</h2>
                <p>{isAr ? activeSection.descAr : activeSection.descEn}</p>
              </div>
            </div>
          ) : null}
          {isLoading ? (
            <div className="cs-loading">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="cs-error-panel">{error.message}</div>
          ) : settings ? (
            <SectionBody
              section={section}
              settings={settings}
              profile={profile}
              organizationId={organizationId}
              isAr={isAr}
              canEdit={canEdit}
              isOwner={role === "owner"}
              commit={commit}
              commitProfile={commitProfile}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- sections */

type BodyProps = {
  section: SectionKey;
  settings: OrganizationSettingsRow;
  profile: OrganizationProfileRow | null;
  organizationId: string;
  isAr: boolean;
  canEdit: boolean;
  isOwner: boolean;
  commit: (patch: SettingsPatch, section: string) => Promise<void>;
  commitProfile: (patch: Partial<OrganizationProfileRow>) => Promise<void>;
};

function SectionBody(props: BodyProps) {
  switch (props.section) {
    case "general":
      return <GeneralSection {...props} />;
    case "business":
      return <BusinessSection {...props} />;
    case "membership":
      return <MembershipSection {...props} />;
    case "ordering":
      return <OrderingSection {...props} />;
    case "experience":
      return <CustomerExperienceSection {...props} />;
    case "notifications":
      return <NotificationsSection {...props} />;
    case "security":
      return <SecuritySection {...props} />;
    case "employees":
      return <EmployeeManagementSection {...props} />;
    case "branches":
      return <BranchManagementSection {...props} />;
    case "integrations":
      return <IntegrationsSection {...props} />;
    case "audit":
      return <AuditLogSection {...props} />;
    default:
      return null;
  }
}

function GeneralSection({ settings, profile, isAr, canEdit, commit, commitProfile }: BodyProps) {
  const d = canEdit ? undefined : true;
  return (
    <div className="cs-stack">
      <Card
        title={isAr ? "هوية الشركة" : "Company identity"}
        description={isAr ? "تظهر هذه البيانات في كل الواجهات والفواتير." : "Used across every screen and invoice."}
      >
        <Row label={isAr ? "شعار الشركة" : "Company logo"} hint={isAr ? "رابط صورة مباشر" : "Direct image URL"}>
          <LogoUploader
            isAr={isAr}
            disabled={d}
            folder={`logos/${profile?.id ?? "company"}`}
            value={profile?.logo_url ?? null}
            onChange={(url) => commitProfile({ logo_url: url })}
          />
        </Row>
        <Row label={isAr ? "الاسم بالعربية" : "Company name (Arabic)"}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.name_ar ?? ""}
            validate={(v) => (v.trim().length < 2 ? (isAr ? "الاسم مطلوب" : "Name is required") : null)}
            onCommit={(v) => commitProfile({ name_ar: v.trim() })}
          />
        </Row>
        <Row label={isAr ? "الاسم بالإنجليزية" : "Company name (English)"}>
          <TextInput isAr={isAr} disabled={d} value={profile?.name_en ?? ""} onCommit={(v) => commitProfile({ name_en: v.trim() || null })} />
        </Row>
        <Row label={isAr ? "رمز الشركة" : "Company code"} hint={isAr ? "للقراءة فقط" : "Read only"}>
          <input className="cs-input" value={profile?.organization_code ?? ""} readOnly disabled />
        </Row>
        <Row label={isAr ? "البريد الإلكتروني" : "Email"}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.email ?? ""}
            validate={(v) => (v && !EMAIL_RE.test(v) ? (isAr ? "بريد غير صحيح" : "Invalid email") : null)}
            onCommit={(v) => commitProfile({ email: v.trim() || null })}
          />
        </Row>
        <Row label={isAr ? "رقم الجوال" : "Phone"} hint="05XXXXXXXX">
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.phone ?? ""}
            validate={(v) => (v && !PHONE_RE.test(v.trim()) ? (isAr ? "رقم غير صحيح" : "Invalid phone number") : null)}
            onCommit={(v) => commitProfile({ phone: v.trim() || null })}
          />
        </Row>
        <Row label={isAr ? "العنوان" : "Address"}>
          <TextInput isAr={isAr} disabled={d} value={settings.address ?? ""} onCommit={(v) => commit({ address: v.trim() || null }, "general")} />
        </Row>
        <Row label={isAr ? "الموقع الإلكتروني" : "Website"}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.website ?? ""}
            placeholder="https://…"
            validate={(v) => (v && !/^https?:\/\//.test(v) ? (isAr ? "رابط غير صحيح" : "Invalid URL") : null)}
            onCommit={(v) => commitProfile({ website: v.trim() || null })}
          />
        </Row>
        <Row label={isAr ? "السجل التجاري" : "Commercial registration"}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={settings.commercial_registration ?? ""}
            onCommit={(v) => commit({ commercial_registration: v.trim() || null }, "general")}
          />
        </Row>
        <Row label={isAr ? "الرقم الضريبي" : "VAT number"}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={settings.tax_number ?? ""}
            onCommit={(v) => commit({ tax_number: v.trim() || null }, "general")}
          />
        </Row>
      </Card>

      <Card title={isAr ? "المنطقة واللغة" : "Locale"} description={isAr ? "تتحكم في التواريخ والعملة والواجهات." : "Controls dates, currency and default UI language."}>
        <Row label={isAr ? "المنطقة الزمنية" : "Time zone"}>
          <select
            className="cs-input"
            disabled={d}
            value={settings.timezone}
            onChange={(e) => commit({ timezone: e.target.value }, "general")}
          >
            {["Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Africa/Cairo", "UTC"].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Row>
        <Row label={isAr ? "اللغة الافتراضية" : "Language"}>
          <Segmented
            disabled={d}
            value={settings.default_language}
            onChange={(v) => commit({ default_language: v }, "general")}
            options={[
              { value: "ar" as const, label: "العربية" },
              { value: "en" as const, label: "English" },
            ]}
          />
        </Row>
        <Row label={isAr ? "العملة" : "Currency"} hint={isAr ? "رمز من ٣ أحرف" : "3-letter code"}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={settings.currency}
            validate={(v) => (!/^[A-Za-z]{3}$/.test(v.trim()) ? (isAr ? "رمز عملة غير صحيح" : "Invalid currency code") : null)}
            onCommit={(v) => commit({ currency: v.trim().toUpperCase() }, "general")}
          />
        </Row>
        <Row label={isAr ? "صيغة التاريخ" : "Date format"}>
          <Segmented
            disabled={d}
            value={settings.date_format}
            onChange={(v) => commit({ date_format: v }, "general")}
            options={[
              { value: "dd/MM/yyyy", label: "31/12/2026" },
              { value: "yyyy-MM-dd", label: "2026-12-31" },
              { value: "MM/dd/yyyy", label: "12/31/2026" },
            ]}
          />
        </Row>
        <Row label={isAr ? "صيغة الأرقام" : "Number format"}>
          <Segmented
            disabled={d}
            value={settings.number_format}
            onChange={(v) => commit({ number_format: v }, "general")}
            options={[
              { value: "western" as const, label: "1234" },
              { value: "arabic" as const, label: "١٢٣٤" },
            ]}
          />
        </Row>
      </Card>
    </div>
  );
}

function BusinessSection({ settings, isAr, canEdit, commit }: BodyProps) {
  const d = canEdit ? undefined : true;
  const toggleMethod = (method: PaymentMethod, on: boolean) => {
    const next = on
      ? Array.from(new Set([...settings.payment_methods, method]))
      : settings.payment_methods.filter((m) => m !== method);
    if (next.length === 0) return;
    const patch: SettingsPatch = { payment_methods: next };
    if (!next.includes(settings.default_payment_method)) patch.default_payment_method = next[0];
    void commit(patch, "business");
  };

  return (
    <div className="cs-stack">
      <Card
        title={isAr ? "قنوات البيع" : "Sales channels"}
        description={isAr ? "تحدد أين يمكن بيع الاشتراكات فعليًا." : "Controls where subscriptions can actually be sold."}
      >
        {(
          [
            ["sales_channel_customer_app", isAr ? "تطبيق العميل" : "Customer App"],
            ["sales_channel_cashier", isAr ? "الكاشير" : "Cashier"],
            ["sales_channel_website", isAr ? "الموقع الإلكتروني" : "Website"],
            ["sales_channel_external_api", isAr ? "واجهة خارجية (API)" : "External API"],
          ] as const
        ).map(([key, label]) => (
          <Row key={key} label={label}>
            <Toggle
              label={label}
              disabled={d}
              checked={settings[key] as boolean}
              onChange={(v) => commit({ [key]: v } as SettingsPatch, "business")}
            />
          </Row>
        ))}
      </Card>

      <Card
        title={isAr ? "وسائل الدفع" : "Payment methods"}
        description={isAr ? "الكاشير وصفحة الدفع يعرضان الوسائل المفعّلة فقط." : "Cashier and checkout only show enabled methods."}
      >
        <div className="cs-chips">
          {PAYMENT_METHODS.map((m) => (
            <CheckChip
              key={m.value}
              disabled={d}
              label={isAr ? m.ar : m.en}
              checked={settings.payment_methods.includes(m.value)}
              onChange={(v) => toggleMethod(m.value, v)}
            />
          ))}
        </div>
        <Row label={isAr ? "وسيلة الدفع الافتراضية" : "Default payment method"}>
          <select
            className="cs-input"
            disabled={d}
            value={settings.default_payment_method}
            onChange={(e) => commit({ default_payment_method: e.target.value as PaymentMethod }, "business")}
          >
            {PAYMENT_METHODS.filter((m) => settings.payment_methods.includes(m.value)).map((m) => (
              <option key={m.value} value={m.value}>
                {isAr ? m.ar : m.en}
              </option>
            ))}
          </select>
        </Row>
      </Card>

      <Card title={isAr ? "الضريبة" : "Tax"} description={isAr ? "تُطبَّق على كل الفواتير والتقارير." : "Applied to every invoice and report."}>
        <Row label={isAr ? "تفعيل الضريبة" : "Tax enabled"}>
          <Toggle label="tax" disabled={d} checked={settings.tax_enabled} onChange={(v) => commit({ tax_enabled: v }, "business")} />
        </Row>
        <Row label={isAr ? "نسبة الضريبة %" : "Tax percentage %"}>
          <NumberInput
            isAr={isAr}
            disabled={d || !settings.tax_enabled}
            value={Number(settings.tax_percentage)}
            min={0}
            max={100}
            onCommit={(v) => commit({ tax_percentage: v }, "business")}
          />
        </Row>
        <Row label={isAr ? "السعر شامل الضريبة" : "Prices include tax"}>
          <Toggle
            label="tax included"
            disabled={d || !settings.tax_enabled}
            checked={settings.tax_included}
            onChange={(v) => commit({ tax_included: v }, "business")}
          />
        </Row>
      </Card>
    </div>
  );
}

function MembershipSection({ settings, isAr, canEdit, commit }: BodyProps) {
  const d = canEdit ? undefined : true;
  return (
    <div className="cs-stack">
      <Card title={isAr ? "تفعيل الاشتراك" : "Subscription activation"}>
        <Row label={isAr ? "التفعيل الافتراضي" : "Default activation"}>
          <Segmented
            disabled={d}
            value={settings.default_activation}
            onChange={(v) => commit({ default_activation: v }, "membership")}
            options={[
              { value: "immediate" as const, label: isAr ? "فوري" : "Immediately" },
              { value: "manual" as const, label: isAr ? "يدوي" : "Manual" },
              { value: "scheduled" as const, label: isAr ? "مجدول" : "Scheduled" },
            ]}
          />
        </Row>
        <Row label={isAr ? "التجديد التلقائي" : "Auto renewal"}>
          <Toggle label="auto renewal" disabled={d} checked={settings.auto_renewal} onChange={(v) => commit({ auto_renewal: v }, "membership")} />
        </Row>
        <Row
          label={isAr ? "أيام المكافأة الافتراضية" : "Default bonus days"}
          hint={isAr ? "يمكن لكل خطة تجاوزها" : "Each plan can override this"}
        >
          <NumberInput isAr={isAr} disabled={d} value={settings.default_bonus_days} min={0} max={365} onCommit={(v) => commit({ default_bonus_days: v }, "membership")} />
        </Row>
        <Row label={isAr ? "مشروب واحد يوميًا" : "One drink per day"}>
          <Toggle label="one per day" disabled={d} checked={settings.one_drink_per_day} onChange={(v) => commit({ one_drink_per_day: v }, "membership")} />
        </Row>
      </Card>
    </div>
  );
}

function OrderingSection({ settings, isAr, canEdit, commit }: BodyProps) {
  const d = canEdit ? undefined : true;
  return (
    <div className="cs-stack">
      <Card title={isAr ? "قواعد الطلبات" : "Ordering rules"}>
        <Row label={isAr ? "مدة تحضير الطلب (دقيقة)" : "Order preparation time (minutes)"}>
          <NumberInput isAr={isAr} disabled={d} value={settings.order_prep_minutes} min={0} max={240} onCommit={(v) => commit({ order_prep_minutes: v }, "ordering")} />
        </Row>
        <Row label={isAr ? "صيغة رقم الطلب" : "Order number format"}>
          <Segmented
            disabled={d}
            value={settings.order_number_format}
            onChange={(v) => commit({ order_number_format: v }, "ordering")}
            options={[
              { value: "sequential" as const, label: isAr ? "تسلسلي" : "Sequential" },
              { value: "daily" as const, label: isAr ? "يومي" : "Daily" },
              { value: "branch_prefixed" as const, label: isAr ? "برمز الفرع" : "Branch prefixed" },
            ]}
          />
        </Row>
        <Row label={isAr ? "سلوك الطابور" : "Queue behaviour"}>
          <Segmented
            disabled={d}
            value={settings.queue_behavior}
            onChange={(v) => commit({ queue_behavior: v }, "ordering")}
            options={[
              { value: "fifo" as const, label: isAr ? "الأقدم أولًا" : "FIFO" },
              { value: "priority" as const, label: isAr ? "حسب الأولوية" : "Priority" },
              { value: "manual" as const, label: isAr ? "يدوي" : "Manual" },
            ]}
          />
        </Row>
        <Row label={isAr ? "تسجيل العملاء الذاتي" : "Customer self-registration"}>
          <Toggle
            label="registration"
            disabled={d}
            checked={settings.customer_registration_enabled}
            onChange={(v) => commit({ customer_registration_enabled: v }, "ordering")}
          />
        </Row>
        <Row label={isAr ? "تعليقات العملاء" : "Customer comments"}>
          <Toggle
            label="comments"
            disabled={d}
            checked={settings.customer_comments_enabled}
            onChange={(v) => commit({ customer_comments_enabled: v }, "ordering")}
          />
        </Row>
        <Row label={isAr ? "السماح بأكثر من طلب نشط" : "Allow multiple active orders"}>
          <Toggle
            label="multiple orders"
            disabled={d}
            checked={settings.allow_multiple_active_orders}
            onChange={(v) => commit({ allow_multiple_active_orders: v }, "ordering")}
          />
        </Row>
      </Card>
    </div>
  );
}


function SecuritySection({ settings, isAr, canEdit, commit }: BodyProps) {
  const d = canEdit ? undefined : true;
  return (
    <div className="cs-stack">
      <Card title={isAr ? "الجلسات وكلمات المرور" : "Sessions & passwords"}>
        <Row label={isAr ? "انتهاء الجلسة (دقيقة)" : "Session timeout (minutes)"}>
          <NumberInput isAr={isAr} disabled={d} value={settings.session_timeout_minutes} min={15} max={10080} onCommit={(v) => commit({ session_timeout_minutes: v }, "security")} />
        </Row>
        <Row label={isAr ? "سياسة كلمة المرور" : "Password policy"}>
          <Segmented
            disabled={d}
            value={settings.password_policy}
            onChange={(v) => commit({ password_policy: v }, "security")}
            options={[
              { value: "standard" as const, label: isAr ? "قياسية" : "Standard" },
              { value: "strong" as const, label: isAr ? "قوية" : "Strong" },
              { value: "strict" as const, label: isAr ? "صارمة" : "Strict" },
            ]}
          />
        </Row>
        <Row label={isAr ? "التحقق بخطوتين" : "Two factor authentication"}>
          <Toggle label="2fa" disabled={d} checked={settings.two_factor_required} onChange={(v) => commit({ two_factor_required: v }, "security")} />
        </Row>
      </Card>
      <Card title={isAr ? "قيود الدخول" : "Login restrictions"}>
        <Row label={isAr ? "نوع القيد" : "Restriction"}>
          <Segmented
            disabled={d}
            value={settings.login_restriction}
            onChange={(v) => commit({ login_restriction: v }, "security")}
            options={[
              { value: "none" as const, label: isAr ? "بدون" : "None" },
              { value: "ip_allowlist" as const, label: isAr ? "قائمة IP" : "IP allowlist" },
              { value: "business_hours" as const, label: isAr ? "ساعات العمل" : "Business hours" },
            ]}
          />
        </Row>
        <Row label={isAr ? "عناوين IP المسموحة" : "Allowed IP addresses"} hint={isAr ? "افصل بفاصلة" : "Comma separated"}>
          <TextInput
            isAr={isAr}
            disabled={d || settings.login_restriction !== "ip_allowlist"}
            value={settings.allowed_ip_addresses.join(", ")}
            validate={(v) => {
              const items = v.split(",").map((x) => x.trim()).filter(Boolean);
              const ok = items.every((ip) => /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(ip));
              return ok ? null : isAr ? "عنوان IP غير صحيح" : "Invalid IP address";
            }}
            onCommit={(v) =>
              commit({ allowed_ip_addresses: v.split(",").map((x) => x.trim()).filter(Boolean) }, "security")
            }
          />
        </Row>
        <Row label={isAr ? "تفعيل سجل التغييرات" : "Audit log enabled"}>
          <Toggle label="audit" disabled={d} checked={settings.audit_log_enabled} onChange={(v) => commit({ audit_log_enabled: v }, "security")} />
        </Row>
      </Card>
    </div>
  );
}

