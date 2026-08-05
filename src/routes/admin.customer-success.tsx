import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/customer-success")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/support" });
  },
});
