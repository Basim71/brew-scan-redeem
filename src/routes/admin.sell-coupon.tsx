import { createFileRoute } from "@tanstack/react-router";
import { SellCouponForm } from "@/features/coupons/SellCouponForm";

export const Route = createFileRoute("/admin/sell-coupon")({
  component: () => <SellCouponForm />,
});