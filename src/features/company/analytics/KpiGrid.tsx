import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CalendarClock,
  CalendarX2,
  Repeat2,
  ReceiptText,
  ShoppingBag,
  Ticket,
  UserPlus,
  UserCheck,
  Users,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { StatCard, StatGrid } from "@/components/kob";
import type { Kpis } from "./types";

export function KpiGrid({
  kpis,
  isAr,
  money,
  num,
}: {
  kpis: Kpis;
  isAr: boolean;
  money: (value: number) => string;
  num: (value: number) => string;
}) {
  const { t } = useI18n();
  void isAr;
  const items: Array<{ key: string; label: string; value: string; icon: LucideIcon }> = [
    { key: "revenue", label: t("analytics.kpis.revenue"), value: money(kpis.revenue), icon: BadgeDollarSign },
    { key: "orders", label: t("analytics.kpis.orders"), value: num(kpis.orders), icon: ShoppingBag },
    { key: "avg", label: t("analytics.kpis.averageOrder"), value: money(kpis.averageOrder), icon: ReceiptText },
    {
      key: "subs",
      label: t("analytics.kpis.subscriptionsSold"),
      value: num(kpis.subscriptionsSold),
      icon: Ticket,
    },
    { key: "renewals", label: t("analytics.kpis.renewals"), value: num(kpis.renewals), icon: Repeat2 },
    {
      key: "expired",
      label: t("analytics.kpis.expiredMemberships"),
      value: num(kpis.expiredMemberships),
      icon: CalendarX2,
    },
    {
      key: "coupons",
      label: t("analytics.kpis.couponsRedeemed"),
      value: num(kpis.couponsRedeemed),
      icon: CalendarClock,
    },
    { key: "active", label: t("analytics.kpis.activeMembers"), value: num(kpis.activeMembers), icon: UserCheck },
    { key: "new", label: t("analytics.kpis.newCustomers"), value: num(kpis.newCustomers), icon: UserPlus },
    {
      key: "returning",
      label: t("analytics.kpis.returningCustomers"),
      value: num(kpis.returningCustomers),
      icon: Users,
    },
  ];

  return (
    <StatGrid>
      {items.map((item) => (
        <StatCard key={item.key} label={item.label} value={item.value} icon={<item.icon className="h-4 w-4" />} />
      ))}
    </StatGrid>
  );
}
