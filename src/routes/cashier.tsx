import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Inbox, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";

import { AppWorkspace } from "@/components/layouts/AppWorkspace";
import { useOrganization } from "@/components/tenant/OrganizationProvider";
import { RoleGate } from "@/components/layouts/RoleGate";
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
  const { t, lang } = useI18n();
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
        setBranchName(lang === "ar" ? data.name_ar || data.name_en : data.name_en || data.name_ar);
      });

    return () => {
      cancelled = true;
    };
  }, [branchId, lang]);

  const items = [
    { to: "/cashier", label: t("pending_orders"), icon: Inbox, exact: true },
    { to: "/cashier/sell-coupon", label: t("nav_sell_coupon"), icon: ShoppingCart },
  ];

  async function handleSignOut() {
    clearOrganization();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <RoleGate allow="cashier">
      <AppWorkspace
        title={organization?.nameAr || organization?.nameEn || "KOB"}
        subtitle={branchName || (lang === "ar" ? "الكاشير" : "Cashier")}
        homeTo="/cashier"
        items={items}
        onSignOut={handleSignOut}
      >
        <Outlet />
      </AppWorkspace>
    </RoleGate>
  );
}
