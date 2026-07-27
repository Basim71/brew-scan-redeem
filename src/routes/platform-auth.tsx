import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy path — always redirect to the unified sign-in page.
export const Route = createFileRoute("/platform-auth")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
});