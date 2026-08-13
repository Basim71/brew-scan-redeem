import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Building2,
  ClipboardList,
  CreditCard,
  Globe2,
  Plug,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserCog,
  WalletCards,
} from "lucide-react";

import { Button, ConfirmDialog, ErrorState, Input, LoadingState, PageContainer, PageHeader, Select, SearchInput, WarningCard } from "@/components/kob";
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
  const { lang, t } = useI18n();
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
        setSaveMessage(translateError(err?.message, isAr, t));
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
        setSaveMessage(translateError(err?.message, isAr, t));
      }
    },
    [canEdit, flashSaved, isAr, organizationId, profile, queryClient],
  );

  if (!organizationId) return null;

  return (
    <PageContainer className="" size="xl">
      <div dir={isAr ? "rtl" : "ltr"} className="flex flex-col gap-5">
      <PageHeader
        eyebrow={t("settings.shell.eyebrow")}
        title={t("settings.shell.pageTitle")}
        description={
          t("settings.shell.pageDescription")
        }
        action={<SaveIndicator state={saveState} lang={isAr ? "ar" : "en"} message={saveMessage} />}
      />

      {!canEdit ? (
        <WarningCard>
          {t("settings.shell.readOnlyWarning")}
        </WarningCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr] lg:items-start">
        <nav className="flex flex-col gap-3" aria-label={t("settings.shell.navLabel")}>
          <SearchInput
            value={navQuery}
            onValueChange={setNavQuery}
            placeholder={t("settings.shell.searchPlaceholder")}
          />
          {GROUPS.map((group) => {
            const items = navItems.filter((item) => item.group === group.key);
            if (!items.length) return null;
            return (
              <div key={group.key} className="flex flex-col gap-1">
                <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{isAr ? group.ar : group.en}</span>
                {items.map((s) => (
                  <Button
                    key={s.key}
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    data-active={s.key === section ? "true" : undefined}
                    leadingIcon={<s.icon className="h-4 w-4" />}
                    onClick={() => setSection(s.key)}
                  >
                    {isAr ? s.ar : s.en}
                  </Button>
                ))}
              </div>
            );
          })}
          {navItems.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("settings.shell.noMatchingSections")}</p>
          ) : null}
        </nav>

        <div className="min-w-0">
          {activeSection ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
                <activeSection.icon className="h-5 w-5" />
              </span>
              <div>
                <h2>{isAr ? activeSection.ar : activeSection.en}</h2>
                <p>{isAr ? activeSection.descAr : activeSection.descEn}</p>
              </div>
            </div>
          ) : null}
          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState description={error.message} />
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
    </PageContainer>
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
  const { t } = useI18n();
  const d = canEdit ? undefined : true;
  return (
    <div className="flex flex-col gap-4">
      <Card
        title={t("settings.fields.companyIdentity")}
        description={t("settings.fields.companyIdentityDesc")}
      >
        <Row label={t("settings.fields.companyLogo")} hint={t("settings.fields.directImageUrl")}>
          <LogoUploader
            isAr={isAr}
            disabled={d}
            folder={`logos/${profile?.id ?? "company"}`}
            value={profile?.logo_url ?? null}
            onChange={(url) => commitProfile({ logo_url: url })}
          />
        </Row>
        <Row label={t("settings.fields.companyNameArabic")}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.name_ar ?? ""}
            validate={(v) => (v.trim().length < 2 ? (t("settings.fields.nameRequired")) : null)}
            onCommit={(v) => commitProfile({ name_ar: v.trim() })}
          />
        </Row>
        <Row label={t("settings.fields.companyNameEnglish")}>
          <TextInput isAr={isAr} disabled={d} value={profile?.name_en ?? ""} onCommit={(v) => commitProfile({ name_en: v.trim() || null })} />
        </Row>
        <Row label={t("settings.fields.companyCode")} hint={t("settings.fields.readOnly")}>
          <Input value={profile?.organization_code ?? ""} readOnly disabled />
        </Row>
        <Row label={t("settings.fields.email")}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.email ?? ""}
            validate={(v) => (v && !EMAIL_RE.test(v) ? (t("settings.fields.invalidEmail")) : null)}
            onCommit={(v) => commitProfile({ email: v.trim() || null })}
          />
        </Row>
        <Row label={t("settings.fields.phone")} hint="05XXXXXXXX">
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.phone ?? ""}
            validate={(v) => (v && !PHONE_RE.test(v.trim()) ? (t("settings.fields.invalidPhoneNumber")) : null)}
            onCommit={(v) => commitProfile({ phone: v.trim() || null })}
          />
        </Row>
        <Row label={t("settings.fields.address")}>
          <TextInput isAr={isAr} disabled={d} value={settings.address ?? ""} onCommit={(v) => commit({ address: v.trim() || null }, "general")} />
        </Row>
        <Row label={t("settings.fields.website")}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={profile?.website ?? ""}
            placeholder="https://…"
            validate={(v) => (v && !/^https?:\/\//.test(v) ? (t("settings.fields.invalidUrl")) : null)}
            onCommit={(v) => commitProfile({ website: v.trim() || null })}
          />
        </Row>
        <Row label={t("settings.fields.commercialRegistration")}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={settings.commercial_registration ?? ""}
            onCommit={(v) => commit({ commercial_registration: v.trim() || null }, "general")}
          />
        </Row>
        <Row label={t("settings.fields.vatNumber")}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={settings.tax_number ?? ""}
            onCommit={(v) => commit({ tax_number: v.trim() || null }, "general")}
          />
        </Row>
      </Card>

      <Card title={t("settings.fields.locale")} description={t("settings.fields.localeDesc")}>
        <Row label={t("settings.fields.timeZone")}>
          <Select disabled={d} value={settings.timezone} onChange={(e) => commit({ timezone: e.target.value }, "general")}>
            {["Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Africa/Cairo", "UTC"].map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </Row>
        <Row label={t("settings.fields.language")}>
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
        <Row label={t("settings.fields.currency")} hint={t("settings.fields.threeLetterCode")}>
          <TextInput
            isAr={isAr}
            disabled={d}
            value={settings.currency}
            validate={(v) => (!/^[A-Za-z]{3}$/.test(v.trim()) ? (t("settings.fields.invalidCurrencyCode")) : null)}
            onCommit={(v) => commit({ currency: v.trim().toUpperCase() }, "general")}
          />
        </Row>
        <Row label={t("settings.fields.dateFormat")}>
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
        <Row label={t("settings.fields.numberFormat")}>
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
  const { t } = useI18n();
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
    <div className="flex flex-col gap-4">
      <Card
        title={t("settings.fields.salesChannels")}
        description={t("settings.fields.salesChannelsDesc")}
      >
        {(
          [
            ["sales_channel_customer_app", t("settings.fields.customerApp")],
            ["sales_channel_cashier", t("settings.fields.cashier")],
            ["sales_channel_website", t("settings.fields.website")],
            ["sales_channel_external_api", t("settings.fields.externalApi")],
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
        title={t("settings.fields.paymentMethods")}
        description={t("settings.fields.paymentMethodsDesc")}
      >
        <div className="flex flex-wrap gap-2 py-2">
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
        <Row label={t("settings.fields.defaultPaymentMethod")}>
          <Select
            disabled={d}
            value={settings.default_payment_method}
            onChange={(e) => commit({ default_payment_method: e.target.value as PaymentMethod }, "business")}
          >
            {PAYMENT_METHODS.filter((m) => settings.payment_methods.includes(m.value)).map((m) => (
              <option key={m.value} value={m.value}>
                {isAr ? m.ar : m.en}
              </option>
            ))}
          </Select>
        </Row>
      </Card>

      <Card title={t("settings.fields.tax")} description={t("settings.fields.taxDesc")}>
        <Row label={t("settings.fields.taxEnabled")}>
          <Toggle label="tax" disabled={d} checked={settings.tax_enabled} onChange={(v) => commit({ tax_enabled: v }, "business")} />
        </Row>
        <Row label={t("settings.fields.taxPercentage")}>
          <NumberInput
            isAr={isAr}
            disabled={d || !settings.tax_enabled}
            value={Number(settings.tax_percentage)}
            min={0}
            max={100}
            onCommit={(v) => commit({ tax_percentage: v }, "business")}
          />
        </Row>
        <Row label={t("settings.fields.pricesIncludeTax")}>
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
  const { t } = useI18n();
  const d = canEdit ? undefined : true;
  return (
    <div className="flex flex-col gap-4">
      <Card title={t("settings.fields.subscriptionActivation")}>
        <Row label={t("settings.fields.defaultActivation")}>
          <Segmented
            disabled={d}
            value={settings.default_activation}
            onChange={(v) => commit({ default_activation: v }, "membership")}
            options={[
              { value: "immediate" as const, label: t("settings.fields.immediately") },
              { value: "manual" as const, label: t("settings.fields.manual") },
              { value: "scheduled" as const, label: t("settings.fields.scheduled") },
            ]}
          />
        </Row>
        <Row label={t("settings.fields.autoRenewal")}>
          <Toggle label="auto renewal" disabled={d} checked={settings.auto_renewal} onChange={(v) => commit({ auto_renewal: v }, "membership")} />
        </Row>
        <Row
          label={t("settings.fields.defaultBonusDays")}
          hint={t("settings.fields.eachPlanCanOverride")}
        >
          <NumberInput isAr={isAr} disabled={d} value={settings.default_bonus_days} min={0} max={365} onCommit={(v) => commit({ default_bonus_days: v }, "membership")} />
        </Row>
        <Row label={t("settings.fields.oneDrinkPerDay")}>
          <Toggle label="one per day" disabled={d} checked={settings.one_drink_per_day} onChange={(v) => commit({ one_drink_per_day: v }, "membership")} />
        </Row>
      </Card>
    </div>
  );
}

function OrderingSection({ settings, isAr, canEdit, commit }: BodyProps) {
  const { t } = useI18n();
  const d = canEdit ? undefined : true;
  return (
    <div className="flex flex-col gap-4">
      <Card title={t("settings.fields.orderingRules")}>
        <Row label={t("settings.fields.orderPrepMinutes")}>
          <NumberInput isAr={isAr} disabled={d} value={settings.order_prep_minutes} min={0} max={240} onCommit={(v) => commit({ order_prep_minutes: v }, "ordering")} />
        </Row>
        <Row label={t("settings.fields.orderNumberFormat")}>
          <Segmented
            disabled={d}
            value={settings.order_number_format}
            onChange={(v) => commit({ order_number_format: v }, "ordering")}
            options={[
              { value: "sequential" as const, label: t("settings.fields.sequential") },
              { value: "daily" as const, label: t("settings.fields.daily") },
              { value: "branch_prefixed" as const, label: t("settings.fields.branchPrefixed") },
            ]}
          />
        </Row>
        <Row label={t("settings.fields.queueBehaviour")}>
          <Segmented
            disabled={d}
            value={settings.queue_behavior}
            onChange={(v) => commit({ queue_behavior: v }, "ordering")}
            options={[
              { value: "fifo" as const, label: t("settings.fields.fifo") },
              { value: "priority" as const, label: t("settings.fields.priority") },
              { value: "manual" as const, label: t("settings.fields.manual") },
            ]}
          />
        </Row>
        <Row label={t("settings.fields.customerSelfRegistration")}>
          <Toggle
            label="registration"
            disabled={d}
            checked={settings.customer_registration_enabled}
            onChange={(v) => commit({ customer_registration_enabled: v }, "ordering")}
          />
        </Row>
        <Row label={t("settings.fields.customerComments")}>
          <Toggle
            label="comments"
            disabled={d}
            checked={settings.customer_comments_enabled}
            onChange={(v) => commit({ customer_comments_enabled: v }, "ordering")}
          />
        </Row>
        <Row label={t("settings.fields.allowMultipleActiveOrders")}>
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


type SecurityConfirmAction =
  | { kind: "two_factor_off" }
  | { kind: "restriction_none" }
  | { kind: "audit_log_off" };

function SecuritySection({ settings, isAr, canEdit, commit }: BodyProps) {
  const { t } = useI18n();
  const d = canEdit ? undefined : true;
  const [pendingAction, setPendingAction] = useState<SecurityConfirmAction | null>(null);
  const [busy, setBusy] = useState(false);

  const runConfirmed = useCallback(
    async (patch: SettingsPatch) => {
      setBusy(true);
      try {
        await commit(patch, "security");
      } finally {
        setBusy(false);
        setPendingAction(null);
      }
    },
    [commit],
  );

  const confirmCopy: Record<SecurityConfirmAction["kind"], { title: string; description: string }> = {
    two_factor_off: {
      title: t("settings.fields.turnOffTwoFactor"),
      description: t("settings.fields.turnOffTwoFactorDesc"),
    },
    restriction_none: {
      title: t("settings.fields.removeLoginRestriction"),
      description: t("settings.fields.removeLoginRestrictionDesc"),
    },
    audit_log_off: {
      title: t("settings.fields.disableAuditLog"),
      description: t("settings.fields.disableAuditLogDesc"),
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title={t("settings.fields.sessionsAndPasswords")}>
        <Row label={t("settings.fields.sessionTimeout")}>
          <NumberInput isAr={isAr} disabled={d} value={settings.session_timeout_minutes} min={15} max={10080} onCommit={(v) => commit({ session_timeout_minutes: v }, "security")} />
        </Row>
        <Row label={t("settings.fields.passwordPolicy")}>
          <Segmented
            disabled={d}
            value={settings.password_policy}
            onChange={(v) => commit({ password_policy: v }, "security")}
            options={[
              { value: "standard" as const, label: t("settings.fields.standard") },
              { value: "strong" as const, label: t("settings.fields.strong") },
              { value: "strict" as const, label: t("settings.fields.strict") },
            ]}
          />
        </Row>
        <Row label={t("settings.fields.twoFactorAuthentication")}>
          <Toggle
            label="2fa"
            disabled={d}
            checked={settings.two_factor_required}
            onChange={(v) => {
              if (!v) {
                setPendingAction({ kind: "two_factor_off" });
                return;
              }
              void commit({ two_factor_required: true }, "security");
            }}
          />
        </Row>
      </Card>
      <Card title={t("settings.fields.loginRestrictions")}>
        <Row label={t("settings.fields.restriction")}>
          <Segmented
            disabled={d}
            value={settings.login_restriction}
            onChange={(v) => {
              if (v === "none" && settings.login_restriction !== "none") {
                setPendingAction({ kind: "restriction_none" });
                return;
              }
              void commit({ login_restriction: v }, "security");
            }}
            options={[
              { value: "none" as const, label: t("settings.fields.none") },
              { value: "ip_allowlist" as const, label: t("settings.fields.ipAllowlist") },
              { value: "business_hours" as const, label: t("settings.fields.businessHours") },
            ]}
          />
        </Row>
        <Row label={t("settings.fields.allowedIpAddresses")} hint={t("settings.fields.commaSeparated")}>
          <TextInput
            isAr={isAr}
            disabled={d || settings.login_restriction !== "ip_allowlist"}
            value={settings.allowed_ip_addresses.join(", ")}
            validate={(v) => {
              const items = v.split(",").map((x) => x.trim()).filter(Boolean);
              const ok = items.every((ip) => /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(ip));
              return ok ? null : t("settings.fields.invalidIpAddress");
            }}
            onCommit={(v) =>
              commit({ allowed_ip_addresses: v.split(",").map((x) => x.trim()).filter(Boolean) }, "security")
            }
          />
        </Row>
        <Row label={t("settings.fields.auditLogEnabled")}>
          <Toggle
            label="audit"
            disabled={d}
            checked={settings.audit_log_enabled}
            onChange={(v) => {
              if (!v) {
                setPendingAction({ kind: "audit_log_off" });
                return;
              }
              void commit({ audit_log_enabled: true }, "security");
            }}
          />
        </Row>
      </Card>

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? confirmCopy[pendingAction.kind].title : ""}
        description={pendingAction ? confirmCopy[pendingAction.kind].description : ""}
        tone="danger"
        busy={busy}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          if (pendingAction.kind === "two_factor_off") void runConfirmed({ two_factor_required: false });
          else if (pendingAction.kind === "restriction_none") void runConfirmed({ login_restriction: "none" });
          else if (pendingAction.kind === "audit_log_off") void runConfirmed({ audit_log_enabled: false });
        }}
      />
    </div>
  );
}

