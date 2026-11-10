import { useI18n } from "@/lib/i18n";

import type { SectionProps } from "./types";
import type { OrganizationSettingsRow } from "@/services/company/company-settings.service";

const EVENTS: Array<{
  key?: keyof OrganizationSettingsRow;
  event?: string;
  title: string;
  hint: string;
}> = [
  {
    key: "notify_orders",
    title: "cafe.notify.newOrder",
    hint: "cafe.notify.newOrderHint",
  },
  {
    key: "notify_subscription_expiry",
    title: "cafe.notify.expiring",
    hint: "cafe.notify.expiringHint",
  },
  {
    event: "subscription_created",
    title: "cafe.notify.newSub",
    hint: "cafe.notify.newSubHint",
  },
  {
    event: "renewal_reminder",
    title: "cafe.notify.renewal",
    hint: "cafe.notify.renewalHint",
  },
  {
    event: "employee_added",
    title: "cafe.notify.newEmployee",
    hint: "cafe.notify.newEmployeeHint",
  },
];

export function NotificationsSection({
  settings,
  canEdit,
  commit,
  profile,
}: SectionProps) {
  const { t } = useI18n();
  const events = settings.notification_events ?? {};

  const eventOn = (item: (typeof EVENTS)[number]) => {
    if (item.key) return Boolean(settings[item.key]);
    return Boolean(events[item.event ?? ""]);
  };

  const setEvent = (item: (typeof EVENTS)[number], value: boolean) => {
    if (!canEdit) return;
    if (item.key) void commit({ [item.key]: value } as never, "notifications");
    else
      void commit(
        { notification_events: { ...events, [item.event ?? ""]: value } },
        "notifications",
      );
  };

  const channels: Array<{
    key: keyof OrganizationSettingsRow;
    title: string;
    hint: string;
  }> = [
    {
      key: "notify_push",
      title: "cafe.notify.dashboard",
      hint: "cafe.notify.dashboardHint",
    },
    {
      key: "notify_email",
      title: "cafe.notify.email",
      hint: profile?.email || "cafe.notify.emailHint",
    },
    {
      key: "notify_whatsapp",
      title: "cafe.notify.whatsapp",
      hint: "cafe.notify.whatsappHint",
    },
  ];

  return (
    <div className="cafe-split">
      <section className="cafe-card">
        <h2>{t("cafe.notify.what")}</h2>
        {EVENTS.map((item) => (
          <div className="cafe-sale" key={item.title}>
            <div>
              <b>{t(item.title)}</b>
              <div className="cafe-muted">{t(item.hint)}</div>
            </div>
            <button
              type="button"
              className={eventOn(item) ? "cafe-switch" : "cafe-switch off"}
              onClick={() => setEvent(item, !eventOn(item))}
              disabled={!canEdit}
            >
              <i />
            </button>
          </div>
        ))}
      </section>
      <section className="cafe-card">
        <h2>{t("cafe.notify.where")}</h2>
        {channels.map((item) => {
          const on = Boolean(settings[item.key]);
          const hint = item.hint.startsWith("cafe.") ? t(item.hint) : item.hint;
          return (
            <div className="cafe-sale" key={item.key}>
              <div>
                <b>{t(item.title)}</b>
                <div className="cafe-muted">{hint}</div>
              </div>
              <button
                type="button"
                className={on ? "cafe-switch" : "cafe-switch off"}
                disabled={!canEdit}
                onClick={() =>
                  void commit({ [item.key]: !on } as never, "notifications")
                }
              >
                <i />
              </button>
            </div>
          );
        })}
        <p className="cafe-note">{t("cafe.notify.ready")}</p>
      </section>
    </div>
  );
}
