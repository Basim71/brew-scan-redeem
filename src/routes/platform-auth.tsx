import { createFileRoute } from "@tanstack/react-router";

import { PlatformAuthPage } from "@/components/platform/PlatformAuthPage";

export const Route = createFileRoute("/platform-auth")({
  component: PlatformAuthPage,
});
