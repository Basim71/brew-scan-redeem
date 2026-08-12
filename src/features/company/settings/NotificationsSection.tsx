import { Mail, MessageCircle, MessageSquare, Bell } from "lucide-react";

import { Badge } from "@/components/kob";
import { Card, Row, Toggle } from "./parts";
import { TextInput } from "./inputs";
import type { SectionProps } from "./types";
import type { OrganizationSettingsRow } from "@/services/company/company-settings.service";

const PROVIDERS: Array<{
  key: string;
  channel: keyof OrganizationSettingsRow;
  ar: string;
  en: string;
  icon: any;
  hintAr: string;
  hintEn: string;
}> = [
  {
    key: "whatsapp",
    channel: "notify_whatsapp",
    ar: "واتساب",
    en: "WhatsApp",
    icon: MessageCircle,
    hintAr: "معرّف حساب الأعمال",
    hintEn: "Business account reference",
  },
  { key: "sms", channel: "notify_sms", ar: "الرسائل النصية", en: "SMS", icon: MessageSquare, hintAr: "اسم المرسل", hintEn: "Sender name" },
  { key: "email", channel: "notify_email", ar: "البريد الإلكتروني", en: "Email", icon: Mail, hintAr: "بريد المرسل", hintEn: "From address" },
  { key: "push", channel: "notify_push", ar: "الإشعارات الفورية", en: "Push", icon: Bell, hintAr: "معرّف التطبيق", hintEn: "App reference" },
];

const EVENTS: Array<[keyof OrganizationSettingsRow, string, string]> = [
  ["notify_orders", "طلب جديد", "New order"],
  ["notify_subscription_expiry", "انتهاء اشتراك", "Subscription expiring"],
  ["notify_low_stock", "نقص المخزون", "Low stock"],
  ["notify_training", "التدريب والدعم", "Training & support"],
];

const EXTRA_EVENTS: Array<[string, string, string]> = [
  ["order_approved", "اعتماد الطلب", "Order approved"],
  ["order_rejected", "رفض الطلب", "Order rejected"],
  ["subscription_created", "اشتراك جديد", "New subscription"],
  ["renewal_reminder", "تذكير التجديد", "Renewal reminder"],
  ["employee_added", "إضافة موظف", "Employee added"],
];

const TEMPLATES: Array<[string, string, string]> = [
  ["order_approved_ar", "قالب اعتماد الطلب (عربي)", "Order approved template (Arabic)"],
  ["order_approved_en", "قالب اعتماد الطلب (إنجليزي)", "Order approved template (English)"],
  ["renewal_reminder_ar", "قالب تذكير التجديد (عربي)", "Renewal reminder template (Arabic)"],
  ["renewal_reminder_en", "قالب تذكير التجديد (إنجليزي)", "Renewal reminder template (English)"],
];

export function NotificationsSection({ settings, isAr, canEdit, commit }: SectionProps) {
  const d = canEdit ? undefined : true;
  const providers = settings.notification_providers ?? {};
  const events = settings.notification_events ?? {};
  const templates = settings.notification_templates ?? {};

  const setProvider = (key: string, patch: { connected?: boolean; reference?: string }) => {
    const next = { ...providers, [key]: { ...(providers[key] ?? {}), ...patch } };
    void commit({ notification_providers: next }, "notifications");
  };

  return (
    <div className="cs-stack">
      <Card
        title={isAr ? "قنوات التواصل" : "Communication providers"}
        description={
          isAr
            ? "فعّل القناة وأضف مرجع الحساب. لا تُخزَّن أي مفاتيح سرية هنا."
            : "Enable a channel and store its account reference. No secret keys are kept here."
        }
      >
        <div className="cs-provider-grid">
          {PROVIDERS.map((p) => {
            const on = settings[p.channel] as boolean;
            const connected = Boolean(providers[p.key]?.connected);
            return (
              <article key={p.key} className="cs-provider" data-on={on ? "true" : "false"}>
                <header>
                  <p.icon className="h-4 w-4" />
                  <b>{isAr ? p.ar : p.en}</b>
                  <Toggle
                    label={isAr ? p.ar : p.en}
                    disabled={d}
                    checked={on}
                    onChange={(v) => commit({ [p.channel]: v } as any, "notifications")}
                  />
                </header>
                <Badge tone={connected ? "success" : "neutral"}>
                  {connected ? (isAr ? "متصل" : "Connected") : isAr ? "غير متصل" : "Not connected"}
                </Badge>
                <label>{isAr ? p.hintAr : p.hintEn}</label>
                <TextInput
                  isAr={isAr}
                  disabled={d || !on}
                  value={providers[p.key]?.reference ?? ""}
                  validate={(v) => (v.length > 120 ? (isAr ? "الحد ١٢٠ حرف" : "Max 120 characters") : null)}
                  onCommit={(v) => setProvider(p.key, { reference: v.trim(), connected: Boolean(v.trim()) })}
                />
              </article>
            );
          })}
        </div>
      </Card>

      <Card title={isAr ? "مشغّلات الأحداث" : "Event triggers"}>
        {EVENTS.map(([key, ar, en]) => (
          <Row key={String(key)} label={isAr ? ar : en}>
            <Toggle
              label={isAr ? ar : en}
              disabled={d}
              checked={settings[key] as boolean}
              onChange={(v) => commit({ [key]: v } as any, "notifications")}
            />
          </Row>
        ))}
        {EXTRA_EVENTS.map(([key, ar, en]) => (
          <Row key={key} label={isAr ? ar : en}>
            <Toggle
              label={isAr ? ar : en}
              disabled={d}
              checked={Boolean(events[key])}
              onChange={(v) => commit({ notification_events: { ...events, [key]: v } }, "notifications")}
            />
          </Row>
        ))}
      </Card>

      <Card
        title={isAr ? "قوالب الرسائل" : "Message templates"}
        description={isAr ? "استخدم {name} و {branch} و {drink} كمتغيرات." : "Use {name}, {branch} and {drink} as variables."}
      >
        {TEMPLATES.map(([key, ar, en]) => (
          <Row key={key} label={isAr ? ar : en}>
            <TextInput
              isAr={isAr}
              multiline
              disabled={d}
              value={templates[key] ?? ""}
              validate={(v) => (v.length > 300 ? (isAr ? "الحد ٣٠٠ حرف" : "Max 300 characters") : null)}
              onCommit={(v) => {
                const next = { ...templates };
                if (v.trim()) next[key] = v.trim();
                else delete next[key];
                void commit({ notification_templates: next }, "notifications");
              }}
            />
          </Row>
        ))}
      </Card>
    </div>
  );
}