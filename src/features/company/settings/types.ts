import type {
  OrganizationProfileRow,
  OrganizationSettingsRow,
  SettingsPatch,
} from "@/services/company/company-settings.service";

export type SectionProps = {
  settings: OrganizationSettingsRow;
  profile: OrganizationProfileRow | null;
  organizationId: string;
  isAr: boolean;
  canEdit: boolean;
  isOwner: boolean;
  commit: (patch: SettingsPatch, section: string) => Promise<void>;
  commitProfile: (patch: Partial<OrganizationProfileRow>) => Promise<void>;
};