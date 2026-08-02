export type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "this_month"
  | "last_month"
  | "custom";

export type DateRange = { from: string; to: string };

export type AnalyticsFilters = {
  branchId: string;
  drinkId: string;
  planId: string;
  cashierId: string;
  customerId: string;
  couponCode: string;
  paymentMethod: string;
  status: string;
};

export const EMPTY_FILTERS: AnalyticsFilters = {
  branchId: "",
  drinkId: "",
  planId: "",
  cashierId: "",
  customerId: "",
  couponCode: "",
  paymentMethod: "",
  status: "",
};

export type Named = { id: string; name_ar: string | null; name_en: string | null };

export type SaleRecord = {
  id: string;
  receipt: string;
  createdAt: string;
  status: string;
  amount: number;
  branchId: string | null;
  branchName: { ar: string | null; en: string | null };
  drinkId: string | null;
  drinkName: { ar: string | null; en: string | null };
  planId: string | null;
  planName: { ar: string | null; en: string | null };
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  cashierId: string | null;
  cashierName: string | null;
  couponCode: string | null;
  paymentMethod: string;
  note: string | null;
};

export type SubscriptionRecord = {
  id: string;
  createdAt: string;
  startDate: string;
  endDate: string;
  status: string;
  price: number;
  branchId: string | null;
  branchName: { ar: string | null; en: string | null };
  planId: string | null;
  planName: { ar: string | null; en: string | null };
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  couponCode: string | null;
  isRenewal: boolean;
};

export type CouponRecord = {
  id: string;
  code: string;
  status: string;
  price: number;
  soldAt: string | null;
  createdAt: string;
  branchId: string | null;
  branchName: { ar: string | null; en: string | null };
  planId: string | null;
  planName: { ar: string | null; en: string | null };
};

export type CustomerRecord = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  subscriptions: number;
  orders: number;
  spend: number;
  lastActivity: string | null;
};

export type AnalyticsDataset = {
  sales: SaleRecord[];
  subscriptions: SubscriptionRecord[];
  coupons: CouponRecord[];
  customers: CustomerRecord[];
  branches: Named[];
  drinks: Named[];
  plans: Named[];
  cashiers: Array<{ id: string; name: string }>;
  customerOptions: Array<{ id: string; name: string }>;
  paymentMethods: string[];
  activeMembers: number;
};

export type Kpis = {
  revenue: number;
  orders: number;
  averageOrder: number;
  subscriptionsSold: number;
  renewals: number;
  expiredMemberships: number;
  couponsRedeemed: number;
  activeMembers: number;
  newCustomers: number;
  returningCustomers: number;
};