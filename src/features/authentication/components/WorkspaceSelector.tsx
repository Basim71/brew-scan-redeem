import { Building2, LogOut, ShieldCheck } from "lucide-react";

import type { Membership } from "../types";
import { useI18n } from "@/lib/i18n";

type Props = {
  memberships: Membership[];
  onSelect: (m: Membership) => void;
  onSignOut: () => void;
  busy?: boolean;
};

function orgLabel(m: Membership, lang: "ar" | "en") {
  const ar = m.organization.nameAr?.trim();
  const en = m.organization.nameEn?.trim();
  if (lang === "ar") return ar || en || m.organization.code;
  return en || ar || m.organization.code;
}

function roleLabel(role: string, lang: "ar" | "en"): string {
  const map: Record<string, { ar: string; en: string }> = {
    owner: { ar: "المالك", en: "Owner" },
    admin: { ar: "مدير", en: "Admin" },
    manager: { ar: "مشرف", en: "Manager" },
    cashier: { ar: "كاشير", en: "Cashier" },
    platform_owner: { ar: "مالك المنصة", en: "Platform Owner" },
    platform_admin: { ar: "مدير المنصة", en: "Platform Admin" },
    support_level_1: { ar: "دعم مستوى 1", en: "Support L1" },
    support_level_2: { ar: "دعم مستوى 2", en: "Support L2" },
    support_level_3: { ar: "دعم مستوى 3", en: "Support L3" },
  };
  const entry = map[role];
  return entry ? entry[lang] : role;
}

export function WorkspaceSelector({ memberships, onSelect, onSignOut, busy }: Props) {
  const { lang, dir } = useI18n();

  return (
    <main className="kob-auth-page" dir={dir}>
      <div className="kob-auth-ambient kob-auth-ambient-one" />
      <div className="kob-auth-ambient kob-auth-ambient-two" />
      <section className="kob-auth-card" style={{ maxWidth: 520 }}>
        <div className="kob-auth-brand">
          <div className="kob-auth-divider" aria-hidden="true">
            <span />
            <em>{lang === "ar" ? "اختر مساحة العمل" : "Choose a Workspace"}</em>
            <span />
          </div>
          <p className="kob-auth-tagline">
            {lang === "ar"
              ? "لديك أكثر من مساحة عمل نشطة."
              : "You have access to more than one workspace."}
          </p>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {memberships.map((m) => {
            const isPlatform = m.organization.type === "platform";
            return (
              <button
                key={m.membershipId}
                type="button"
                disabled={busy}
                onClick={() => onSelect(m)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  textAlign: dir === "rtl" ? "right" : "left",
                  cursor: busy ? "wait" : "pointer",
                  border: "1px solid rgba(234, 200, 132, 0.25)",
                  background: "rgba(28, 18, 12, 0.55)",
                  color: "#f5e4c1",
                  borderRadius: 16,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    display: "grid",
                    placeItems: "center",
                    background: isPlatform ? "rgba(214, 168, 92, 0.15)" : "rgba(120, 84, 48, 0.25)",
                    color: "#e8c98a",
                  }}
                >
                  {isPlatform ? <ShieldCheck /> : <Building2 />}
                </span>
                <span style={{ display: "grid", gap: 2, flex: 1 }}>
                  <strong style={{ fontSize: 15 }}>{orgLabel(m, lang)}</strong>
                  <small style={{ opacity: 0.75, fontSize: 12 }}>
                    {isPlatform
                      ? (lang === "ar" ? "مساحة المنصة" : "Platform")
                      : (lang === "ar" ? "شركة" : "Company")}
                    {" · "}
                    {roleLabel(m.role, lang)}
                    {" · "}
                    <span dir="ltr">{m.organization.code}</span>
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSignOut}
          disabled={busy}
          style={{
            marginTop: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            justifyContent: "center",
            width: "100%",
            padding: "10px 12px",
            border: "1px solid rgba(234, 200, 132, 0.2)",
            borderRadius: 12,
            background: "transparent",
            color: "#e8c98a",
            cursor: busy ? "wait" : "pointer",
          }}
        >
          <LogOut className="h-4 w-4" />
          <span>{lang === "ar" ? "تسجيل الخروج" : "Sign out"}</span>
        </button>
      </section>
    </main>
  );
}