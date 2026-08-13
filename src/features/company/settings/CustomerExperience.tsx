import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { Smartphone } from "lucide-react";

import { Card, Row, Segmented } from "./parts";
import { TextInput } from "./inputs";
import type { SectionProps } from "./types";
import type { OrganizationSettingsRow } from "@/services/company/company-settings.service";

type StepKey = "language" | "phone" | "welcome" | "subscription" | "drinks" | "success";

const STEPS: Array<{ key: StepKey; ar: string; en: string }> = [
  { key: "language", ar: "اللغة", en: "Language" },
  { key: "phone", ar: "رقم الجوال", en: "Phone / OTP" },
  { key: "welcome", ar: "الترحيب", en: "Welcome" },
  { key: "subscription", ar: "الاشتراك", en: "Subscription" },
  { key: "drinks", ar: "المشروبات", en: "Drinks" },
  { key: "success", ar: "الإتمام", en: "Success" },
];

/** Fields that belong to each journey step, so the editor and the preview stay in sync. */
const FIELDS: Record<StepKey, Array<[keyof OrganizationSettingsRow, keyof OrganizationSettingsRow, string, string]>> = {
  language: [],
  phone: [],
  welcome: [
    ["welcome_message_ar", "welcome_message_en", "رسالة الترحيب", "Welcome message"],
    ["welcome_subtitle_ar", "welcome_subtitle_en", "العنوان الفرعي", "Welcome subtitle"],
  ],
  subscription: [
    ["empty_subscription_message_ar", "empty_subscription_message_en", "لا يوجد اشتراك", "No subscription found"],
    [
      "expired_subscription_message_ar",
      "expired_subscription_message_en",
      "اشتراك منتهي",
      "Expired subscription",
    ],
  ],
  drinks: [["loyalty_message_ar", "loyalty_message_en", "رسالة الولاء", "Loyalty message"]],
  success: [
    ["redeem_success_message_ar", "redeem_success_message_en", "تأكيد الطلب", "Order confirmed"],
    ["order_completed_message_ar", "order_completed_message_en", "اكتمال الطلب", "Order completed"],
    ["thank_you_message_ar", "thank_you_message_en", "رسالة الشكر", "Thank you message"],
  ],
};

export function CustomerExperienceSection({ settings, isAr, canEdit, commit }: SectionProps) {
  const { t } = useI18n();
  const d = canEdit ? undefined : true;
  const [step, setStep] = useState<StepKey>("welcome");
  const [previewLang, setPreviewLang] = useState<"ar" | "en">(isAr ? "ar" : "en");
  const fields = FIELDS[step];
  const pick = (ar: keyof OrganizationSettingsRow, en: keyof OrganizationSettingsRow) =>
    ((previewLang === "ar" ? settings[ar] : settings[en]) as string | null) ?? "";

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={t("settings.customerExperience.customerJourney")}
        description={
          t("settings.customerExperience.pickAStepToEditIts")
        }
      >
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s, index) => (
            <button
              key={s.key}
              type="button"
              data-active={s.key === step ? "true" : "false"}
              onClick={() => setStep(s.key)}
            >
              <b>{index + 1}</b>
              {isAr ? s.ar : s.en}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="flex flex-col gap-3 min-w-0">
            {fields.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                {t("settings.customerExperience.thisStepHasNoEditableCopy")}
              </div>
            ) : (
              fields.map(([arKey, enKey, arLabel, enLabel]) => (
                <div key={String(arKey)} className="flex flex-col gap-2 rounded-xl border border-border p-3">
                  <Row label={`${isAr ? arLabel : enLabel} — ${t("settings.customerExperience.arabic")}`}>
                    <TextInput
                      isAr={isAr}
                      multiline
                      disabled={d}
                      value={(settings[arKey] as string | null) ?? ""}
                      validate={(v) => (v.length > 200 ? (t("settings.customerExperience.max200Characters")) : null)}
                      onCommit={(v) => commit({ [arKey]: v.trim() || null } as any, "experience")}
                    />
                  </Row>
                  <Row label={`${isAr ? arLabel : enLabel} — ${t("settings.customerExperience.english")}`}>
                    <TextInput
                      isAr={isAr}
                      multiline
                      disabled={d}
                      value={(settings[enKey] as string | null) ?? ""}
                      validate={(v) => (v.length > 200 ? (t("settings.customerExperience.max200Characters")) : null)}
                      onCommit={(v) => commit({ [enKey]: v.trim() || null } as any, "experience")}
                    />
                  </Row>
                </div>
              ))
            )}
          </div>

          <aside className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <Smartphone className="h-3.5 w-3.5" />
              <Segmented
                value={previewLang}
                onChange={setPreviewLang}
                options={[
                  { value: "ar" as const, label: "العربية" },
                  { value: "en" as const, label: "English" },
                ]}
              />
            </div>
            <div className="relative mx-auto flex h-[520px] w-[260px] flex-col rounded-[2.25rem] border-4 border-foreground/80 bg-foreground p-2 shadow-lg" dir={previewLang === "ar" ? "rtl" : "ltr"}>
              <div className="mx-auto mb-1 h-4 w-24 rounded-full bg-foreground" />
              <div className="flex-1 overflow-hidden rounded-[1.75rem] bg-background p-4">
                <PreviewScreen
                  step={step}
                  lang={previewLang}
                  settings={settings}
                  pick={pick}
                />
              </div>
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
}

function PreviewScreen({
  step,
  lang,
  settings,
  pick,
}: {
  step: StepKey;
  lang: "ar" | "en";
  settings: OrganizationSettingsRow;
  pick: (ar: keyof OrganizationSettingsRow, en: keyof OrganizationSettingsRow) => string;
}) {
  const ar = lang === "ar";
  if (step === "language")
    return (
      <div className="flex flex-col gap-3 text-center text-foreground">
        <h4>{ar ? "اختر اللغة" : "Choose language"}</h4>
        <button className="rounded-[var(--kob-radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">العربية</button>
        <button className="rounded-[var(--kob-radius-button)] border border-border px-4 py-2 text-sm font-semibold text-foreground">English</button>
      </div>
    );
  if (step === "phone")
    return (
      <div className="flex flex-col gap-3 text-center text-foreground">
        <h4>{ar ? "رقم الجوال" : "Mobile number"}</h4>
        <div className="rounded-[var(--kob-radius-input)] border border-border bg-muted px-3 py-2 text-sm">05XXXXXXXX</div>
        <button className="rounded-[var(--kob-radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{ar ? "متابعة" : "Continue"}</button>
        <small>{ar ? "سيتم إرسال رمز تحقق" : "A verification code will be sent"}</small>
      </div>
    );
  if (step === "welcome")
    return (
      <div className="flex flex-col gap-3 text-center text-foreground">
        <h4>{pick("welcome_message_ar", "welcome_message_en") || (ar ? "أهلًا بك" : "Welcome")}</h4>
        <p>
          {pick("welcome_subtitle_ar", "welcome_subtitle_en") ||
            (ar ? "قهوتك اليومية جاهزة" : "Your daily coffee is ready")}
        </p>
        <button className="rounded-[var(--kob-radius-button)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{ar ? "ابدأ" : "Start"}</button>
      </div>
    );
  if (step === "subscription")
    return (
      <div className="flex flex-col gap-3 text-center text-foreground">
        <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-start">
          <b>{ar ? "الاشتراك الشهري" : "Monthly plan"}</b>
          <span>{ar ? "٢٢ يومًا متبقيًا" : "22 days remaining"}</span>
        </div>
        <p className="muted">
          {pick("empty_subscription_message_ar", "empty_subscription_message_en") ||
            (ar ? "لا يوجد اشتراك نشط لهذا الرقم" : "No active subscription for this number")}
        </p>
        <p className="muted">
          {pick("expired_subscription_message_ar", "expired_subscription_message_en") ||
            (ar ? "انتهى اشتراكك، يمكنك التجديد من الكاشير" : "Your plan expired — renew at the cashier")}
        </p>
      </div>
    );
  if (step === "drinks")
    return (
      <div className="flex flex-col gap-3 text-center text-foreground">
        <h4>{ar ? "اختر مشروب اليوم" : "Pick today's drink"}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span>{ar ? "لاتيه" : "Latte"}</span>
          <span>{ar ? "أمريكانو" : "Americano"}</span>
          <span>{ar ? "كابتشينو" : "Cappuccino"}</span>
          <span>{ar ? "V60" : "V60"}</span>
        </div>
        <p className="muted">{pick("loyalty_message_ar", "loyalty_message_en") || (ar ? "كل كوب يقرّبك من مكافأة" : "Every cup earns you rewards")}</p>
        {settings.customer_comments_enabled ? (
          <div className="rounded-[var(--kob-radius-input)] border border-border bg-muted px-3 py-2 text-sm">{ar ? "ملاحظات للباريستا" : "Note for the barista"}</div>
        ) : null}
      </div>
    );
  return (
    <div className="flex flex-col gap-3 text-center text-foreground">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-kob-success text-lg text-white">✓</div>
      <h4>
        {pick("redeem_success_message_ar", "redeem_success_message_en") || (ar ? "تم إرسال طلبك" : "Order sent")}
      </h4>
      <p>
        {pick("order_completed_message_ar", "order_completed_message_en") ||
          (ar ? `جاهز خلال ${settings.order_prep_minutes} دقيقة` : `Ready in ${settings.order_prep_minutes} minutes`)}
      </p>
      <p className="muted">
        {pick("thank_you_message_ar", "thank_you_message_en") || (ar ? "شكرًا لك، نراك غدًا" : "Thank you, see you tomorrow")}
      </p>
    </div>
  );
}