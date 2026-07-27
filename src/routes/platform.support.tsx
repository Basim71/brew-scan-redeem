import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/platform/support")({
  beforeLoad: () => { throw redirect({ to: "/platform/customer-success" }); },
});
