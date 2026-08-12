import { CreditCard, KeyRound, Link2, Store, Webhook } from "lucide-react";

import { Badge } from "@/components/kob";
import { Card, Row, Toggle } from "./parts";
import { TextInput } from "./inputs";
import type { SectionProps } from "./types";

type Integration = {
  key: string;
  ar: string;
  en: string;
  group: "gateway" | "pos" | "developer";
  icon: any;
  hintAr: string;
  hintEn: string;
};

const INTEGRATIONS: Integration[] = [
  { key: "moyasar", ar: "ميسر", en: "Moyasar", group: "gateway", icon: CreditCard, hintAr: "معرّف الحساب", hintEn: "Account reference" },
  { key: "tap", ar: "تاب", en: "Tap Payments", group: "gateway", icon: CreditCard, hintAr: "معرّف الحساب", hintEn: "Account reference" },
  { key: "hyperpay", ar: "هايبر باي", en: "HyperPay", group: "gateway", icon: CreditCard, hintAr: "معرّف الحساب", hintEn: "Account reference" },
  { key: "stripe", ar: "Stripe", en: "Stripe", group: "gateway", icon: CreditCard, hintAr: "معرّف الحساب", hintEn: "Account reference" },
  { key: "foodics", ar: "فودكس", en: "Foodics", group: "pos", icon: Store, hintAr: "معرّف المتجر", hintEn: "Store reference" },
  { key: "marn", ar: "مرن", en: "Marn", group: "pos", icon: Store, hintAr: "معرّف المتجر", hintEn: "Store reference" },
  { key: "accounting", ar: "المحاسبة", en: "Accounting", group: "pos", icon: Store, hintAr: "معرّف النظام", hintEn: "System reference" },
  { key: "api_key", ar: "مرجع مفتاح API", en: "API key reference", group: "developer", icon: KeyRound, hintAr: "اسم المفتاح فقط", hintEn: "Key name only" },
  { key: "webhook_url", ar: "عنوان Webhook", en: "Webhook URL", group: "developer", icon: Webhook, hintAr: "https://…", hintEn: "https://…" },
];

const GROUPS: Array<{ key: Integration["group"]; ar: string; en: string; descAr: string; descEn: string }> = [
  {
    key: "gateway",
    ar: "بوابات الدفع",
    en: "Payment gateways",
    descAr: "اربط بوابة الدفع لتحصيل قيمة الاشتراكات.",
    descEn: "Connect a gateway to collect subscription payments.",
  },
  {
    key: "pos",
    ar: "نقاط البيع والأنظمة",
    en: "POS & business systems",
    descAr: "مزامنة الطلبات والمبيعات مع نظامك الحالي.",
    descEn: "Sync orders and sales with your existing system.",
  },
  {
    key: "developer",
    ar: "للمطورين",
    en: "Developer",
    descAr: "لا تُخزَّن أي مفاتيح سرية في هذه الصفحة.",
    descEn: "No secret keys are stored on this page.",
  },
];

export function IntegrationsSection({ settings, isAr, canEdit, commit }: SectionProps) {
  const d = canEdit ? undefined : true;
  const current = (settings.integrations ?? {}) as Record<string, string>;

  const setValue = (key: string, value: string) => {
    const next = { ...current };
    if (value.trim()) next[key] = value.trim();
    else delete next[key];
    void commit({ integrations: next }, "integrations");
  };

  return (
    <div className="cs-stack">
      {GROUPS.map((group) => (
        <Card
          key={group.key}
          title={isAr ? group.ar : group.en}
          description={isAr ? group.descAr : group.descEn}
        >
          <div className="cs-provider-grid">
            {INTEGRATIONS.filter((i) => i.group === group.key).map((item) => {
              const connected = Boolean(current[item.key]);
              return (
                <article key={item.key} className="cs-provider" data-on={connected ? "true" : "false"}>
                  <header>
                    <item.icon className="h-4 w-4" />
                    <b>{isAr ? item.ar : item.en}</b>
                    <Badge tone={connected ? "success" : "neutral"}>
                      {connected ? (isAr ? "متصل" : "Connected") : isAr ? "غير متصل" : "Not connected"}
                    </Badge>
                  </header>
                  <label>{isAr ? item.hintAr : item.hintEn}</label>
                  <TextInput
                    isAr={isAr}
                    disabled={d}
                    value={current[item.key] ?? ""}
                    validate={(v) => (v.length > 160 ? (isAr ? "الحد ١٦٠ حرف" : "Max 160 characters") : null)}
                    onCommit={(v) => setValue(item.key, v)}
                  />
                </article>
              );
            })}
          </div>
        </Card>
      ))}

      <Card title={isAr ? "واجهة خارجية" : "External API"}>
        <Row
          label={isAr ? "تفعيل قناة الواجهة الخارجية" : "Enable external API channel"}
          hint={isAr ? "يتحكم في بيع الاشتراكات عبر API" : "Controls selling subscriptions through the API"}
        >
          <Toggle
            label="external api"
            disabled={d}
            checked={settings.sales_channel_external_api}
            onChange={(v) => commit({ sales_channel_external_api: v }, "integrations")}
          />
        </Row>
        <Row label={isAr ? "مستند الربط" : "Integration docs"}>
          <span className="cs-inline-note">
            <Link2 className="h-3.5 w-3.5" />
            {isAr ? "تُدار نقاط النهاية من فريق KOB." : "Endpoints are provisioned by the KOB team."}
          </span>
        </Row>
      </Card>
    </div>
  );
}