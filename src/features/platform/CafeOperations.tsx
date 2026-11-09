import { useEffect, useState } from "react";

import { AnalyticsShell } from "@/features/company/analytics/AnalyticsShell";
import { AuditLogSection } from "@/features/company/settings/AuditLog";
import { IntegrationsSection } from "@/features/company/settings/IntegrationsSection";
import { SecuritySection } from "@/features/company/settings/CompanySettingsShell";
import {
  ensureOrganizationSettings,
  getOrganizationProfile,
  updateOrganizationSettings,
  type OrganizationProfileRow,
  type OrganizationSettingsRow,
  type SettingsPatch,
} from "@/services/company/company-settings.service";

/** Security, integrations, activity, and the detailed analytics café owners no longer see. */
export function CafeOperations({ organizationId }: { organizationId: string }) {
  const [settings, setSettings] = useState<OrganizationSettingsRow | null>(
    null,
  );
  const [profile, setProfile] = useState<OrganizationProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [part, setPart] = useState<
    "security" | "integrations" | "activity" | "analytics"
  >("security");

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      ensureOrganizationSettings(organizationId),
      getOrganizationProfile(organizationId),
    ])
      .then(([nextSettings, nextProfile]) => {
        if (cancelled) return;
        setSettings(nextSettings);
        setProfile(nextProfile);
        setError(null);
      })
      .catch((cause) => {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "تعذر تحميل إعدادات المقهى",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  async function commit(patch: SettingsPatch, section: string) {
    const next = await updateOrganizationSettings(
      organizationId,
      patch,
      section,
      settings as never,
    );
    setSettings(next);
  }

  const shared = settings
    ? {
        settings,
        profile,
        organizationId,
        isAr: true,
        canEdit: true,
        isOwner: true,
        commit,
        commitProfile: async () => undefined,
      }
    : null;

  return (
    <div className="flex flex-col gap-4">
      <p>
        هذه الأدوات نقلت من لوحة المقهى وتبقى لإدارة منصة كوب: الأمان،
        التكاملات، سجل النشاط، والتحليلات التفصيلية.
      </p>
      <div className="cafe-tabs">
        {(
          [
            ["security", "مركز الأمان"],
            ["integrations", "التكاملات وبوابات الدفع"],
            ["activity", "مركز النشاط"],
            ["analytics", "تحليلات تفصيلية"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={part === id ? "on" : ""}
            onClick={() => setPart(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {error ? <div className="cafe-error">{error}</div> : null}
      {part === "analytics" ? <AnalyticsShell /> : null}
      {shared && part === "security" ? <SecuritySection {...shared} /> : null}
      {shared && part === "integrations" ? (
        <IntegrationsSection {...shared} />
      ) : null}
      {shared && part === "activity" ? <AuditLogSection {...shared} /> : null}
    </div>
  );
}
