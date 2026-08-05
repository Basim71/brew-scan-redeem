import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/customer-success/$caseId")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/support" });
  },
});
