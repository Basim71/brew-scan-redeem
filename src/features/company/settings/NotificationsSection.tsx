import { useI18n } from "@/lib/i18n";
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
  const { t } = useI18n();
  const d = canEdit ? undefined : true;
  const providers = settings.notification_providers ?? {};
  const events = settings.notification_events ?? {};
  const templates = settings.notification_templates ?? {};

  const setProvider = (key: string, patch: { connected?: boolean; reference?: string }) => {
    const next = { ...providers, [key]: { ...(providers[key] ?? {}), ...patch } };
    void commit({ notification_providers: next }, "notifications");
  };

  return (
    <div className="flex flex-col gap-4">
      <Card
        title={t("settings.notifications.communicationProviders")}
        description={
          t("settings.notifications.enableAChannelAndStoreIts")
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROVIDERS.map((p) => {
            const on = settings[p.channel] as boolean;
            const connected = Boolean(providers[p.key]?.connected);
            return (
              <article key={p.key} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3" data-on={on ? "true" : "false"}>
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
                  {connected ? (t("settings.notifications.connected")) : t("settings.notifications.notConnected")}
                </Badge>
                <label>{isAr ? p.hintAr : p.hintEn}</label>
                <TextInput
                  isAr={isAr}
                  disabled={d || !on}
                  value={providers[p.key]?.reference ?? ""}
                  validate={(v) => (v.length > 120 ? (t("settings.notifications.max120Characters")) : null)}
                  onCommit={(v) => setProvider(p.key, { reference: v.trim(), connected: Boolean(v.trim()) })}
                />
              </article>
            );
          })}
        </div>
      </Card>

      <Card title={t("settings.notifications.eventTriggers")}>
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
        title={t("settings.notifications.messageTemplates")}
        description={t("settings.notifications.useNameBranchAndDrinkAs")}
      >
        {TEMPLATES.map(([key, ar, en]) => (
          <Row key={key} label={isAr ? ar : en}>
            <TextInput
              isAr={isAr}
              multiline
              disabled={d}
              value={templates[key] ?? ""}
              validate={(v) => (v.length > 300 ? (t("settings.notifications.max300Characters")) : null)}
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