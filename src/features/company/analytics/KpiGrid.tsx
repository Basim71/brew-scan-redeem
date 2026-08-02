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
  const items: Array<{ key: string; label: string; value: string; icon: LucideIcon }> = [
    { key: "revenue", label: isAr ? "الإيرادات" : "Revenue", value: money(kpis.revenue), icon: BadgeDollarSign },
    { key: "orders", label: isAr ? "الطلبات" : "Orders", value: num(kpis.orders), icon: ShoppingBag },
    { key: "avg", label: isAr ? "متوسط الطلب" : "Average Order", value: money(kpis.averageOrder), icon: ReceiptText },
    {
      key: "subs",
      label: isAr ? "الاشتراكات المباعة" : "Subscriptions Sold",
      value: num(kpis.subscriptionsSold),
      icon: Ticket,
    },
    { key: "renewals", label: isAr ? "التجديدات" : "Renewals", value: num(kpis.renewals), icon: Repeat2 },
    {
      key: "expired",
      label: isAr ? "عضويات منتهية" : "Expired Memberships",
      value: num(kpis.expiredMemberships),
      icon: CalendarX2,
    },
    {
      key: "coupons",
      label: isAr ? "كوبونات مستخدمة" : "Coupons Redeemed",
      value: num(kpis.couponsRedeemed),
      icon: CalendarClock,
    },
    { key: "active", label: isAr ? "أعضاء نشطون" : "Active Members", value: num(kpis.activeMembers), icon: UserCheck },
    { key: "new", label: isAr ? "عملاء جدد" : "New Customers", value: num(kpis.newCustomers), icon: UserPlus },
    {
      key: "returning",
      label: isAr ? "عملاء عائدون" : "Returning Customers",
      value: num(kpis.returningCustomers),
      icon: Users,
    },
  ];

  return (
    <div className="an-kpi-grid">
      {items.map((item) => (
        <article key={item.key} className="an-kpi">
          <span className="an-kpi-icon" aria-hidden="true">
            <item.icon className="h-4 w-4" />
          </span>
          <div>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}