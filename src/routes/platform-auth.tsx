import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/platform-auth")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});
