import { createFileRoute } from "@tanstack/react-router";
import { SellCouponForm } from "@/lib/sell-coupon";

export const Route = createFileRoute("/admin/sell-coupon")({
  component: () => <SellCouponForm />,
});