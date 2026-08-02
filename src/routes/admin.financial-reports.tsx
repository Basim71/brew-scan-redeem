import { createFileRoute } from "@tanstack/react-router";

import { AnalyticsShell } from "@/features/company/analytics/AnalyticsShell";

export const Route = createFileRoute("/admin/financial-reports")({
  head: () => ({
    meta: [
      { title: "Business Analytics · KOB" },
      {
        name: "description",
        content: "Complete analytics across subscriptions, drinks, revenue and customers.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BusinessAnalyticsPage,
});

function BusinessAnalyticsPage() {
  return <AnalyticsShell />;
}
