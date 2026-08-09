import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — Support Center 2.0 replaced customer-success cases with tickets. */
export const Route = createFileRoute("/platform/customer-success")({
  beforeLoad: () => {
    throw redirect({ to: "/platform/support" });
  },
});
