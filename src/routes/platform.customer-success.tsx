import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/customer-success")({
  beforeLoad: () => {
    throw redirect({ to: "/platform/support" });
  },
});
