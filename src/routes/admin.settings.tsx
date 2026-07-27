import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useOrganization } from "@/providers/OrganizationProvider";
import { CompanySettingsShell } from "@/features/company/settings/CompanySettingsShell";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Company Settings · KOB" },
      { name: "description", content: "Manage your KOB company profile, team, and preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { role, ready } = useOrganization();
  const navigate = useNavigate();

  // Route-level guard in addition to RoleGate: cashier is already blocked upstream,
  // but defend against any future admin-level role that shouldn't manage settings.
  useEffect(() => {
    if (!ready) return;
    if (role === "cashier") navigate({ to: "/cashier", replace: true });
  }, [ready, role, navigate]);

  if (!ready || role === "cashier") return null;

  return <CompanySettingsShell />;
}