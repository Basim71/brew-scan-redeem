import { createFileRoute } from "@tanstack/react-router";
import { SellCouponForm } from "@/features/sell-coupon/SellCouponForm";

export const Route = createFileRoute("/admin/sell-coupon")({
  component: () => <SellCouponForm />,
});