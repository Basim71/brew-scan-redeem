import { createFileRoute } from "@tanstack/react-router";
import { CustomerHub } from "@/features/company/customer-hub/CustomerHub";

export const Route = createFileRoute("/admin/customers")({
  component: CustomerHub,
});