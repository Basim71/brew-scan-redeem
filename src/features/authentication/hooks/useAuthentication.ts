import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization, type ActiveOrganization } from "@/providers/OrganizationProvider";
import { usePlatform } from "@/providers/PlatformProvider";
import { useI18n } from "@/lib/i18n";

import {
  fetchActiveMemberships,
  signInWithPassword,
  signOutEverywhere,
} from "../services/authentication.service";
import type { Membership } from "../types";
import {
  pathForDestination,
  resolveLoginDestination,
} from "../utils/resolveLoginDestination";

type Phase = "loading" | "form" | "selector" | "no_workspace";

function toActiveOrganization(m: Membership): ActiveOrganization {
  return {
    id: m.organization.id,
    code: m.organization.code,
    nameAr: m.organization.nameAr,
    nameEn: m.organization.nameEn,
    slug: m.organization.slug,
    status: m.organization.status,
  };
}

export function useAuthentication() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { activateOrganization, clearOrganization } = useOrganization();
  const { refresh: refreshPlatform } = usePlatform();

  const [phase, setPhase] = useState<Phase>("loading");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const genericError = useMemo(
    () => (lang === "ar" ? "بيانات الدخول غير صحيحة." : "Incorrect email or password."),
    [lang],
  );
  const noWorkspaceMessage = useMemo(
    () =>
      lang === "ar"
        ? "تم التحقق من الحساب، لكنه غير مرتبط بأي مساحة عمل نشطة."
        : "Your account is authenticated, but no active workspace is assigned to it.",
    [lang],
  );

  const routeMembership = useCallback(
    async (m: Membership) => {
      const destination = resolveLoginDestination(m);
      if (destination.kind === "unauthorized") {
        await signOutEverywhere();
        clearOrganization();
        setPhase("no_workspace");
        return;
      }

      if (destination.kind === "platform") {
        clearOrganization();
        await refreshPlatform();
      } else {
        try {
          await activateOrganization(toActiveOrganization(m));
        } catch (err) {
          setError(err instanceof Error ? err.message : genericError);
          setPhase("form");
          return;
        }
      }

      navigate({ to: pathForDestination(destination), replace: true });
    },
    [activateOrganization, clearOrganization, genericError, navigate, refreshPlatform],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session?.user) {
        setPhase("form");
        return;
      }
      try {
        const list = await fetchActiveMemberships(data.session.user.id);
        if (cancelled) return;
        if (list.length === 0) {
          await signOutEverywhere();
          clearOrganization();
          setPhase("no_workspace");
          return;
        }
        if (list.length === 1) {
          await routeMembership(list[0]);
          return;
        }
        setMemberships(list);
        setPhase("selector");
      } catch {
        if (!cancelled) setPhase("form");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearOrganization, routeMembership]);

  const submit = useCallback(
    async (email: string, password: string) => {
      setBusy(true);
      setError(null);
      clearOrganization();
      try {
        const result = await signInWithPassword(email, password);
        if (result.status === "invalid_credentials" || result.status === "error") {
          setError(genericError);
          return;
        }
        if (result.status === "none") {
          await signOutEverywhere();
          setPhase("no_workspace");
          return;
        }
        if (result.status === "multiple") {
          setMemberships(result.memberships);
          setPhase("selector");
          return;
        }
        if (result.destination.kind === "unauthorized") {
          await signOutEverywhere();
          setPhase("no_workspace");
          return;
        }
        await routeMembership(result.destination.membership);
      } finally {
        setBusy(false);
      }
    },
    [clearOrganization, genericError, routeMembership],
  );

  const selectWorkspace = useCallback(
    async (m: Membership) => {
      setBusy(true);
      setError(null);
      try {
        await routeMembership(m);
      } finally {
        setBusy(false);
      }
    },
    [routeMembership],
  );

  const signOutFromSelector = useCallback(async () => {
    setBusy(true);
    try {
      await signOutEverywhere();
      clearOrganization();
      setMemberships([]);
      setPhase("form");
    } finally {
      setBusy(false);
    }
  }, [clearOrganization]);

  return {
    phase,
    memberships,
    busy,
    error,
    noWorkspaceMessage,
    submit,
    selectWorkspace,
    signOutFromSelector,
  };
}