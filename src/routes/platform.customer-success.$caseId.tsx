import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/customer-success/$caseId")({
  beforeLoad: () => {
    throw redirect({ to: "/platform/support" });
  },
});
