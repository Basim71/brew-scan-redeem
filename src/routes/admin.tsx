import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

import { useOrganization } from "@/providers/OrganizationProvider";
import { RoleGate } from "@/layouts/RoleGate";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CompanyLayout } from "@/features/company/CompanyLayout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin · KOB" },
      { name: "description", content: "KOB admin control panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const { organization, clearOrganization } = useOrganization();
  const isRTL = lang === "ar";

  async function handleSignOut() {
    clearOrganization();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <RoleGate allow="admin">
      <CompanyLayout
        title={
          (isRTL
            ? organization?.nameAr || organization?.nameEn
            : organization?.nameEn || organization?.nameAr) || "KOB"
        }
        subtitle={isRTL ? "بوابة الشركة" : "Company Portal"}
        onSignOut={handleSignOut}
      >
        <Outlet />
      </CompanyLayout>
    </RoleGate>
  );
}
