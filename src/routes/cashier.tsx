import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppWorkspace } from "@/layouts/AppWorkspace";
import { useOrganization } from "@/providers/OrganizationProvider";
import { RoleGate } from "@/layouts/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/use-auth";

export const Route = createFileRoute("/cashier")({
  head: () => ({
    meta: [
      { title: "Cashier · KOB" },
      { name: "description", content: "KOB cashier order approval console." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CashierLayout,
});

function CashierLayout() {
  const navigate = useNavigate();
  const { branchId } = useRole();
  const { lang } = useI18n();
  const { organization, clearOrganization } = useOrganization();
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (!branchId) {
      setBranchName("");
      return;
    }

    let cancelled = false;

    void supabase
      .from("branches")
      .select("name_en,name_ar")
      .eq("id", branchId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setBranchName(
          lang === "ar"
            ? data.name_ar || data.name_en
            : data.name_en || data.name_ar,
        );
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, lang]);

  const items: [] = [];

  async function handleSignOut() {
    clearOrganization();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <RoleGate allow="cashier">
      <AppWorkspace
        title={
          branchName ||
          (lang === "ar"
            ? organization?.nameAr || organization?.nameEn
            : organization?.nameEn || organization?.nameAr) ||
          "KOB"
        }
        subtitle={lang === "ar" ? "الكاشير" : "Cashier"}
        homeTo="/cashier"
        items={items}
        onSignOut={handleSignOut}
        shell="cashier"
        avatarLabel={lang === "ar" ? "ك" : "C"}
        showBell={false}
      >
        <Outlet />
      </AppWorkspace>
    </RoleGate>
  );
}
