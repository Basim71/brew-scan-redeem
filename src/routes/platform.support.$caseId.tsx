import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/support/$caseId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/platform/customer-success/$caseId", params: { caseId: (params as any).caseId } });
  },
});
