import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/financial-reports")({
  head: () => ({
    meta: [
      { title: "Business Analytics · KOB" },
      {
        name: "description",
        content:
          "Complete analytics across subscriptions, drinks, revenue and customers.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/admin/reports" });
  },
});
