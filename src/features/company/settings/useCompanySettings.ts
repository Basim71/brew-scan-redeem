import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/providers/OrganizationProvider";
import {
  ensureOrganizationSettings,
  updateOrganizationSettings,
  type OrganizationSettingsRow,
  type SettingsPatch,
} from "@/services/company/company-settings.service";

export const companySettingsKey = (organizationId: string | null | undefined) => [
  "company-settings",
  organizationId ?? "none",
];

/**
 * Single source of truth for company configuration.
 * Any surface (dashboard, cashier, plans, orders, reports, QR pages) reads
 * through this hook, so a saved change propagates without a page refresh.
 */
export function useCompanySettings() {
  const { organization } = useOrganization();
  const organizationId = organization?.id ?? null;
  const queryClient = useQueryClient();
  const key = companySettingsKey(organizationId);

  const query = useQuery({
    queryKey: key,
    enabled: Boolean(organizationId),
    staleTime: 15_000,
    queryFn: () => ensureOrganizationSettings(organizationId as string),
  });

  // Realtime propagation across tabs/sessions of the same company.
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`org-settings-${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_settings",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload: any) => {
          if (payload?.new) queryClient.setQueryData(key, payload.new as OrganizationSettingsRow);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, queryClient, key.join("|")]);

  const mutation = useMutation({
    mutationFn: async ({ patch, section }: { patch: SettingsPatch; section: string }) => {
      if (!organizationId) throw new Error("no_organization");
      const previous = queryClient.getQueryData<OrganizationSettingsRow>(key) ?? null;
      return updateOrganizationSettings(
        organizationId,
        patch,
        section,
        previous as unknown as Record<string, unknown> | null,
      );
    },
    // Optimistic update
    onMutate: async ({ patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<OrganizationSettingsRow>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...patch });
      return { previous };
    },
    // Rollback on failure — never leave the UI inconsistent
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (row) => {
      queryClient.setQueryData(key, row);
      // Company-wide propagation: refresh every dependent workspace.
      void queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "company-settings" });
    },
  });

  return {
    settings: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: (patch: SettingsPatch, section: string) => mutation.mutateAsync({ patch, section }),
    saving: mutation.isPending,
    saveError: mutation.error as Error | null,
  };
}
