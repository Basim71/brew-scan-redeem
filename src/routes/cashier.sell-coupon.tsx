import { createFileRoute } from "@tanstack/react-router";
import { useRole } from "@/lib/use-auth";
import { SellCouponForm } from "@/lib/sell-coupon";
import { FullScreenLoader } from "@/lib/ui";

export const Route = createFileRoute("/cashier/sell-coupon")({
  component: CashierSellCoupon,
});

function CashierSellCoupon() {
  const { branchId, ready } = useRole();
  if (!ready) return <FullScreenLoader />;
  return <SellCouponForm cashierBranchId={branchId} />;
}