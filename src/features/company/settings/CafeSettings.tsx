import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useI18n } from "@/lib/i18n";
import { useOrganization } from "@/providers/OrganizationProvider";
import {
  getOrganizationProfile,
  updateOrganizationProfile,
  type OrganizationProfileRow,
  type SettingsPatch,
} from "@/services/company/company-settings.service";
import { CafePage } from "@/features/company/cafe/ui";
import { LogoUploader } from "./LogoUploader";
import { useCompanySettings } from "./useCompanySettings";
import { BranchManagementSection } from "./BranchManagement";
import { EmployeeManagementSection } from "./EmployeeManagement";
import { NotificationsSection } from "./NotificationsSection";

const COLORS = [
  "#2f5a4f",
  "#2B1A12",
  "#6B4226",
  "#1d3557",
  "#7a1f2b",
  "#b08d57",
];

type Tab = "info" | "team" | "alerts";

export function CafeSettings() {
  const { t, lang } = useI18n();
  const isAr = lang === "ar";
  const { organization, role } = useOrganization();
  const organizationId = organization?.id ?? null;
  const canEdit = role === "owner" || role === "admin";
  const queryClient = useQueryClient();
  const hash = useRouterState({ select: (state) => state.location.hash });
  const [tab, setTab] = useState<Tab>(
    hash === "alerts" || hash === "notifications" ? "alerts" : "info",
  );
  const [error, setError] = useState<string | null>(null);
  const { settings, save } = useCompanySettings();

  useEffect(() => {
    if (hash === "alerts" || hash === "notifications") setTab("alerts");
  }, [hash]);

  const profileQuery = useQuery({
    queryKey: ["company-profile", organizationId],
    enabled: Boolean(organizationId),
    queryFn: () => getOrganizationProfile(organizationId as string),
  });
  const profile = profileQuery.data ?? null;

  const commitProfile = useCallback(
    async (patch: Partial<OrganizationProfileRow>) => {
      if (!canEdit || !organizationId) return;
      setError(null);
      try {
        const row = await updateOrganizationProfile(
          organizationId,
          patch as never,
        );
        queryClient.setQueryData(["company-profile", organizationId], row);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : t("cafe.saveError"));
      }
    },
    [canEdit, organizationId, queryClient, t],
  );

  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    phone: "",
    email: "",
    cr: "",
    vat: "",
  });
  useEffect(() => {
    if (!profile && !settings) return;
    setForm({
      name_ar: profile?.name_ar ?? "",
      name_en: profile?.name_en ?? "",
      phone: profile?.phone ?? "",
      email: profile?.email ?? "",
      cr: settings?.commercial_registration ?? "",
      vat: settings?.tax_number ?? "",
    });
  }, [profile, settings]);

  async function saveInfo() {
    await commitProfile({
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
    });
    if (settings) {
      await save(
        {
          commercial_registration: form.cr.trim() || null,
          tax_number: form.vat.trim() || null,
        },
        "business",
      );
    }
  }

  const color = profile?.primary_color || settings?.primary_color || COLORS[0];
  async function pickColor(next: string) {
    await commitProfile({ primary_color: next });
    await save({ primary_color: next }, "general");
  }

  if (!organizationId) return null;
  const sectionProps = {
    settings: settings!,
    profile,
    organizationId,
    isAr,
    canEdit,
    isOwner: role === "owner",
    commit: async (patch: SettingsPatch, section: string) => {
      await save(patch, section);
    },
    commitProfile,
  };

  return (
    <CafePage title={t("cafe.settings.title")}>
      <div className="cafe-tabs">
        {(
          [
            ["info", "cafe.settings.info"],
            ["team", "cafe.settings.team"],
            ["alerts", "cafe.settings.alerts"],
          ] as const
        ).map(([id, key]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "on" : ""}
            onClick={() => setTab(id)}
          >
            {t(key)}
          </button>
        ))}
      </div>
      {error ? <div className="cafe-error">{error}</div> : null}
      {tab === "info" ? (
        <div className="cafe-split">
          <section className="cafe-card">
            <h2>{t("cafe.settings.cafeData")}</h2>
            <LogoUploader
              isAr={isAr}
              folder={`logos/${organizationId}`}
              value={profile?.logo_url ?? null}
              onChange={(url) => void commitProfile({ logo_url: url })}
              disabled={!canEdit}
              label={t("cafe.settings.changeLogo")}
            />
            <div className="cafe-two" style={{ marginTop: 12 }}>
              <label>
                <span className="cafe-label">{t("cafe.drinks.nameAr")}</span>
                <input
                  className="cafe-input"
                  value={form.name_ar}
                  onChange={(event) =>
                    setForm({ ...form, name_ar: event.target.value })
                  }
                />
              </label>
              <label>
                <span className="cafe-label">{t("cafe.drinks.nameEn")}</span>
                <input
                  className="cafe-input"
                  dir="ltr"
                  value={form.name_en}
                  onChange={(event) =>
                    setForm({ ...form, name_en: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="cafe-two" style={{ marginTop: 12 }}>
              <label>
                <span className="cafe-label">{t("cafe.settings.phone")}</span>
                <input
                  className="cafe-input"
                  dir="ltr"
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                />
              </label>
              <label>
                <span className="cafe-label">{t("cafe.settings.email")}</span>
                <input
                  className="cafe-input"
                  dir="ltr"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="cafe-two" style={{ marginTop: 12 }}>
              <label>
                <span className="cafe-label">{t("cafe.settings.cr")}</span>
                <input
                  className="cafe-input"
                  value={form.cr}
                  onChange={(event) =>
                    setForm({ ...form, cr: event.target.value })
                  }
                />
              </label>
              <label>
                <span className="cafe-label">{t("cafe.settings.vat")}</span>
                <input
                  className="cafe-input"
                  value={form.vat}
                  onChange={(event) =>
                    setForm({ ...form, vat: event.target.value })
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="cafe-btn"
              style={{ marginTop: 16, width: "100%" }}
              disabled={!canEdit}
              onClick={() => void saveInfo()}
            >
              {t("cafe.save")}
            </button>
          </section>
          <section className="cafe-card">
            <h2>{t("cafe.settings.card")}</h2>
            <span className="cafe-label">{t("cafe.settings.cardColor")}</span>
            <div className="cafe-colors">
              {COLORS.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={color === swatch ? "on" : ""}
                  style={{ background: swatch }}
                  onClick={() => void pickColor(swatch)}
                  aria-label={swatch}
                />
              ))}
            </div>
            <div
              className="cafe-subcard"
              style={{ background: color, marginTop: 16 }}
            >
              {profile?.logo_url ? (
                <img
                  src={profile.logo_url}
                  alt=""
                  style={{ height: 36, borderRadius: 8, background: "#fff" }}
                />
              ) : null}
              <div style={{ fontWeight: 800, fontSize: 22, marginTop: 12 }}>
                {form.name_ar || form.name_en || "KOB"}
              </div>
              <div style={{ opacity: 0.85 }}>{t("cafe.settings.cardHint")}</div>
              <div className="k">KOB</div>
            </div>
            <p className="cafe-note">{t("cafe.settings.cardNote")}</p>
          </section>
        </div>
      ) : null}
      {tab === "team" && settings ? (
        <div className="cafe-split">
          <BranchManagementSection {...sectionProps} />
          <EmployeeManagementSection {...sectionProps} />
        </div>
      ) : null}
      {tab === "alerts" && settings ? (
        <NotificationsSection {...sectionProps} />
      ) : null}
    </CafePage>
  );
}
