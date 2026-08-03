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
  const d = canEdit ? undefined : true;
  const [step, setStep] = useState<StepKey>("welcome");
  const [previewLang, setPreviewLang] = useState<"ar" | "en">(isAr ? "ar" : "en");
  const fields = FIELDS[step];
  const pick = (ar: keyof OrganizationSettingsRow, en: keyof OrganizationSettingsRow) =>
    ((previewLang === "ar" ? settings[ar] : settings[en]) as string | null) ?? "";

  return (
    <div className="cs-stack">
      <Card
        title={isAr ? "رحلة العميل" : "Customer journey"}
        description={
          isAr
            ? "اختر خطوة لتحرير نصوصها، وشاهد النتيجة فورًا على الجوال."
            : "Pick a step to edit its copy and watch the phone preview update instantly."
        }
      >
        <div className="cs-journey">
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

        <div className="cs-xp">
          <div className="cs-xp-editor">
            {fields.length === 0 ? (
              <div className="cs-empty">
                {isAr
                  ? "هذه الخطوة لا تحتوي على نصوص قابلة للتعديل — يتحكم بها النظام."
                  : "This step has no editable copy — it is system generated."}
              </div>
            ) : (
              fields.map(([arKey, enKey, arLabel, enLabel]) => (
                <div key={String(arKey)} className="cs-bilingual">
                  <Row label={`${isAr ? arLabel : enLabel} — ${isAr ? "عربي" : "Arabic"}`}>
                    <TextInput
                      isAr={isAr}
                      multiline
                      disabled={d}
                      value={(settings[arKey] as string | null) ?? ""}
                      validate={(v) => (v.length > 200 ? (isAr ? "الحد ٢٠٠ حرف" : "Max 200 characters") : null)}
                      onCommit={(v) => commit({ [arKey]: v.trim() || null } as any, "experience")}
                    />
                  </Row>
                  <Row label={`${isAr ? arLabel : enLabel} — ${isAr ? "إنجليزي" : "English"}`}>
                    <TextInput
                      isAr={isAr}
                      multiline
                      disabled={d}
                      value={(settings[enKey] as string | null) ?? ""}
                      validate={(v) => (v.length > 200 ? (isAr ? "الحد ٢٠٠ حرف" : "Max 200 characters") : null)}
                      onCommit={(v) => commit({ [enKey]: v.trim() || null } as any, "experience")}
                    />
                  </Row>
                </div>
              ))
            )}
          </div>

          <aside className="cs-phone-wrap">
            <div className="cs-phone-toolbar">
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
            <div className="cs-phone" dir={previewLang === "ar" ? "rtl" : "ltr"}>
              <div className="cs-phone-notch" />
              <div className="cs-phone-screen">
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
      <div className="cs-pv">
        <h4>{ar ? "اختر اللغة" : "Choose language"}</h4>
        <button className="cs-pv-btn">العربية</button>
        <button className="cs-pv-btn ghost">English</button>
      </div>
    );
  if (step === "phone")
    return (
      <div className="cs-pv">
        <h4>{ar ? "رقم الجوال" : "Mobile number"}</h4>
        <div className="cs-pv-field">05XXXXXXXX</div>
        <button className="cs-pv-btn">{ar ? "متابعة" : "Continue"}</button>
        <small>{ar ? "سيتم إرسال رمز تحقق" : "A verification code will be sent"}</small>
      </div>
    );
  if (step === "welcome")
    return (
      <div className="cs-pv">
        <h4>{pick("welcome_message_ar", "welcome_message_en") || (ar ? "أهلًا بك" : "Welcome")}</h4>
        <p>
          {pick("welcome_subtitle_ar", "welcome_subtitle_en") ||
            (ar ? "قهوتك اليومية جاهزة" : "Your daily coffee is ready")}
        </p>
        <button className="cs-pv-btn">{ar ? "ابدأ" : "Start"}</button>
      </div>
    );
  if (step === "subscription")
    return (
      <div className="cs-pv">
        <div className="cs-pv-card">
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
      <div className="cs-pv">
        <h4>{ar ? "اختر مشروب اليوم" : "Pick today's drink"}</h4>
        <div className="cs-pv-grid">
          <span>{ar ? "لاتيه" : "Latte"}</span>
          <span>{ar ? "أمريكانو" : "Americano"}</span>
          <span>{ar ? "كابتشينو" : "Cappuccino"}</span>
          <span>{ar ? "V60" : "V60"}</span>
        </div>
        <p className="muted">{pick("loyalty_message_ar", "loyalty_message_en") || (ar ? "كل كوب يقرّبك من مكافأة" : "Every cup earns you rewards")}</p>
        {settings.customer_comments_enabled ? (
          <div className="cs-pv-field">{ar ? "ملاحظات للباريستا" : "Note for the barista"}</div>
        ) : null}
      </div>
    );
  return (
    <div className="cs-pv">
      <div className="cs-pv-tick">✓</div>
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