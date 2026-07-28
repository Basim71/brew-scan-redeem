import { createFileRoute } from "@tanstack/react-router";
import CommandCenter from "@/features/company/dashboard/CommandCenter";

export const Route = createFileRoute("/admin/")({
  component: CommandCenter,
});
