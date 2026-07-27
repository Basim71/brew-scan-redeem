import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

type Settings = {
  default_language: string;
  currency: string;
  timezone: string;
  customer_registration_enabled: boolean;
  customer_comments_enabled: boolean;
  one_drink_per_day: boolean;
};

function SettingsPage() {
  const { lang } = useI18n();
  const isRTL = lang === "ar";
  const { organization } = useOrganization();
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!organization?.id) return;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("organization_settings")
        .select("default_language,currency,timezone,customer_registration_enabled,customer_comments_enabled,one_drink_per_day")
        .eq("organization_id", organization.id)
        .maybeSingle();
      setS(
        data ?? {
          default_language: "ar",
          currency: "SAR",
          timezone: "Asia/Riyadh",
          customer_registration_enabled: true,
          customer_comments_enabled: true,
          one_drink_per_day: true,
        },
      );
      setLoading(false);
    })();
  }, [organization?.id]);

  async function save() {
    if (!s || !organization?.id) return;
    setSaving(true); setMsg(null);
    const { error } = await supabase
      .from("organization_settings")
      .upsert({ organization_id: organization.id, ...s });
    setSaving(false);
    setMsg(error ? error.message : isRTL ? "تم الحفظ" : "Saved");
  }

  if (loading || !s) return <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>{isRTL ? "جارٍ التحميل…" : "Loading…"}</div>;

  return (
    <div className="company-page" dir={isRTL ? "rtl" : "ltr"}>
      <header className="company-page-header">
        <div>
          <span className="company-kicker">{isRTL ? "الإعدادات" : "Settings"}</span>
          <h1>{isRTL ? "إعدادات الشركة" : "Organization Settings"}</h1>
          <p>{isRTL ? "تفضيلات عامة للنظام." : "General preferences for your workspace."}</p>
        </div>
      </header>

      <div className="company-card-grid two">
        <div className="company-card">
          <h3>{isRTL ? "اللغة والعملة" : "Locale & Currency"}</h3>
          <label className="company-field">
            <span>{isRTL ? "اللغة الافتراضية" : "Default language"}</span>
            <select value={s.default_language} onChange={(e) => setS({ ...s, default_language: e.target.value })}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="company-field">
            <span>{isRTL ? "العملة" : "Currency"}</span>
            <input value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })} />
          </label>
          <label className="company-field">
            <span>{isRTL ? "المنطقة الزمنية" : "Timezone"}</span>
            <input value={s.timezone} onChange={(e) => setS({ ...s, timezone: e.target.value })} />
          </label>
        </div>

        <div className="company-card">
          <h3>{isRTL ? "قواعد النظام" : "System Rules"}</h3>
          <label className="company-toggle">
            <input type="checkbox" checked={s.customer_registration_enabled} onChange={(e) => setS({ ...s, customer_registration_enabled: e.target.checked })} />
            <span>{isRTL ? "السماح بتسجيل العملاء" : "Allow customer registration"}</span>
          </label>
          <label className="company-toggle">
            <input type="checkbox" checked={s.customer_comments_enabled} onChange={(e) => setS({ ...s, customer_comments_enabled: e.target.checked })} />
            <span>{isRTL ? "السماح بملاحظات العميل" : "Allow customer notes"}</span>
          </label>
          <label className="company-toggle">
            <input type="checkbox" checked={s.one_drink_per_day} onChange={(e) => setS({ ...s, one_drink_per_day: e.target.checked })} />
            <span>{isRTL ? "مشروب واحد فقط لكل يوم" : "One drink per day"}</span>
          </label>
        </div>
      </div>

      <div className="company-actions">
        <button className="company-btn-primary" onClick={() => void save()} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? (isRTL ? "جارٍ الحفظ…" : "Saving…") : (isRTL ? "حفظ" : "Save")}
        </button>
        {msg && <span className="company-hint">{msg}</span>}
      </div>
    </div>
  );
}