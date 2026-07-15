import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Check,
  Clock3,
  Coffee,
  Inbox,
  Loader2,
  Phone,
  RefreshCw,
  Tag,
  User,
  UserPlus,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/use-auth";

export const Route = createFileRoute("/cashier/")({
  component: CashierQueuePage,
});

type QueueFilter =
  | "all"
  | "orders"
  | "registrations";

type OrderStatus =
  | "pending"
  | "approved"
  | "rejected";

type RegistrationStatus =
  | "pending"
  | "approved"
  | "rejected";

type OrderRow = {
  id: string;
  status: OrderStatus;
  created_at: string;
  order_date?: string | null;
  selected_options: Array<{
    group_name_en: string;
    group_name_ar: string;
    option_name_en: string;
    option_name_ar: string;
  }>;
  customer_note: string | null;

  drink: {
    name_en: string;
    name_ar: string;
  } | null;

  customer: {
    name: string;
    phone: string;
  } | null;

  subscription: {
    id: string;
    end_date: string;

    plan: {
      name: string;
      duration_days: number;
    } | null;
  } | null;
};

type RegistrationRequest = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  branch_id: string;
  preferred_language: string;
  status: RegistrationStatus;
  created_at: string;
};

type CouponRow = {
  id: string;
  code: string;
  plan_id: string;
  branch_id: string | null;
  status: string;
};

type PlanRow = {
  id: string;
  name: string;
  duration_days: number;
};

type QueueItem =
  | {
      kind: "order";
      id: string;
      createdAt: string;
      data: OrderRow;
    }
  | {
      kind: "registration";
      id: string;
      createdAt: string;
      data: RegistrationRequest;
    };

function CashierQueuePage() {
  const navigate = useNavigate();
  const { branchId } = useRole();

  const {
    t,
    fmtNum,
    timeAgo,
    lang,
  } = useI18n();

  const [orders, setOrders] =
    useState<OrderRow[]>([]);

  const [
    registrations,
    setRegistrations,
  ] = useState<
    RegistrationRequest[]
  >([]);

  const [coupons, setCoupons] =
    useState<CouponRow[]>([]);

  const [plans, setPlans] =
    useState<PlanRow[]>([]);

  const [filter, setFilter] =
    useState<QueueFilter>("all");

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState<string | null>(null);

  const [
    selectedCoupons,
    setSelectedCoupons,
  ] = useState<
    Record<string, string>
  >({});

  const [
    selectedStartDates,
    setSelectedStartDates,
  ] = useState<
    Record<string, string>
  >({});

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const planMap = useMemo(
    () =>
      new Map(
        plans.map((plan) => [
          plan.id,
          plan,
        ]),
      ),
    [plans],
  );

  const loadQueue =
    useCallback(async () => {
      if (!branchId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [
        ordersResult,
        registrationsResult,
        couponsResult,
        plansResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `
              id,
              status,
              created_at,
              order_date,
              selected_options,
              customer_note,
              drink:drink_types(
                name_en,
                name_ar
              ),
              customer:customers(
                name,
                phone
              ),
              subscription:subscriptions(
                id,
                end_date,
                plan:plans(
                  name,
                  duration_days
                )
              )
            `,
          )
          .eq(
            "branch_id",
            branchId,
          )
          .eq(
            "status",
            "pending",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from(
            "registration_requests",
          )
          .select(
            `
              id,
              first_name,
              last_name,
              phone,
              branch_id,
              preferred_language,
              status,
              created_at
            `,
          )
          .eq(
            "branch_id",
            branchId,
          )
          .eq(
            "status",
            "pending",
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from("coupons")
          .select(
            `
              id,
              code,
              plan_id,
              branch_id,
              status
            `,
          )
          .eq(
            "status",
            "available",
          )
          .or(
            `branch_id.eq.${branchId},branch_id.is.null`,
          )
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("plans")
          .select(
            `
              id,
              name,
              duration_days
            `,
          )
          .order("name"),
      ]);

      const firstError =
        ordersResult.error ??
        registrationsResult.error ??
        couponsResult.error ??
        plansResult.error;

      if (firstError) {
        setError(
          firstError.message,
        );
      }

      setOrders(
        (ordersResult.data ??
          []) as unknown as OrderRow[],
      );

      setRegistrations(
        (registrationsResult.data ??
          []) as RegistrationRequest[],
      );

      setCoupons(
        (couponsResult.data ??
          []) as CouponRow[],
      );

      setPlans(
        (plansResult.data ??
          []) as PlanRow[],
      );

      setLoading(false);
    }, [branchId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!branchId) {
      return;
    }

    const intervalId =
      window.setInterval(() => {
        void loadQueue();
      }, 5000);

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    branchId,
    loadQueue,
  ]);

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status ===
          "pending",
      ),
    [orders],
  );

  const pendingRegistrations =
    useMemo(
      () =>
        registrations.filter(
          (registration) =>
            registration.status ===
            "pending",
        ),
      [registrations],
    );

  const queueItems =
    useMemo<QueueItem[]>(() => {
      const orderItems: QueueItem[] =
        pendingOrders.map(
          (order) => ({
            kind: "order",
            id: order.id,
            createdAt:
              order.created_at,
            data: order,
          }),
        );

      const registrationItems:
        QueueItem[] =
          pendingRegistrations.map(
            (registration) => ({
              kind:
                "registration",
              id:
                registration.id,
              createdAt:
                registration.created_at,
              data:
                registration,
            }),
          );

      const merged = [
        ...orderItems,
        ...registrationItems,
      ].sort(
        (first, second) =>
          new Date(
            second.createdAt,
          ).getTime() -
          new Date(
            first.createdAt,
          ).getTime(),
      );

      if (filter === "orders") {
        return merged.filter(
          (item) =>
            item.kind ===
            "order",
        );
      }

      if (
        filter ===
        "registrations"
      ) {
        return merged.filter(
          (item) =>
            item.kind ===
            "registration",
        );
      }

      return merged;
    }, [
      filter,
      pendingOrders,
      pendingRegistrations,
    ]);

  async function decideOrder(
    orderId: string,
    status:
      | "approved"
      | "rejected",
  ) {
    setBusyId(orderId);
    setError(null);
    setSuccess(null);

    const timestamp =
      new Date().toISOString();

    const updateData =
      status === "approved"
        ? {
            status,
            approved_at:
              timestamp,
          }
        : {
            status,
            rejected_at:
              timestamp,
          };

    const {
      error: updateError,
    } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("status", "pending");

    setBusyId(null);

    if (updateError) {
      setError(
        updateError.message,
      );
      return;
    }

    setSuccess(
      status === "approved"
        ? lang === "ar"
          ? "تم قبول طلب القهوة."
          : "Coffee order approved."
        : lang === "ar"
          ? "تم رفض طلب القهوة."
          : "Coffee order rejected.",
    );

    setOrders((current) =>
      current.filter(
        (order) =>
          order.id !==
          orderId,
      ),
    );
  }

  async function activateRegistration(
    request:
      RegistrationRequest,
  ) {
    const couponId =
      selectedCoupons[
        request.id
      ];

    const startDate =
      selectedStartDates[
        request.id
      ] ??
      todayLocalISO();

    if (!couponId) {
      setError(
        lang === "ar"
          ? "اختر الكوبون والباقة قبل تفعيل الاشتراك."
          : "Select a coupon and plan before activating the subscription.",
      );

      return;
    }

    setBusyId(request.id);
    setError(null);
    setSuccess(null);

    const {
      error: rpcError,
    } = await supabase.rpc(
      "cashier_activate_registration",
      {
        _request_id:
          request.id,

        _coupon_id:
          couponId,

        _start_date:
          startDate,
      },
    );

    setBusyId(null);

    if (rpcError) {
      setError(
        translateActivationError(
          rpcError.message,
          lang,
        ),
      );

      return;
    }

    setRegistrations(
      (current) =>
        current.filter(
          (registration) =>
            registration.id !==
            request.id,
        ),
    );

    setSelectedCoupons(
      (current) => {
        const next = {
          ...current,
        };

        delete next[
          request.id
        ];

        return next;
      },
    );

    setSelectedStartDates(
      (current) => {
        const next = {
          ...current,
        };

        delete next[
          request.id
        ];

        return next;
      },
    );

    setSuccess(
      lang === "ar"
        ? "تم ربط العميل وتفعيل الاشتراك."
        : "Customer subscription activated successfully.",
    );

    await loadQueue();
  }

  async function rejectRegistration(
    requestId: string,
  ) {
    const confirmed =
      window.confirm(
        lang === "ar"
          ? "هل تريد رفض طلب التسجيل؟"
          : "Reject this registration request?",
      );

    if (!confirmed) {
      return;
    }

    setBusyId(requestId);
    setError(null);
    setSuccess(null);

    const {
      error: rpcError,
    } = await supabase.rpc(
      "cashier_reject_registration",
      {
        _request_id:
          requestId,
      },
    );

    setBusyId(null);

    if (rpcError) {
      setError(
        rpcError.message,
      );
      return;
    }

    setRegistrations(
      (current) =>
        current.filter(
          (registration) =>
            registration.id !==
            requestId,
        ),
    );

    setSuccess(
      lang === "ar"
        ? "تم رفض طلب التسجيل."
        : "Registration request rejected.",
    );
  }

  if (!branchId) {
    return (
      <div className="panel-warm mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 font-display text-2xl font-bold text-cream">
          {t("no_branch_h")}
        </h1>

        <p className="mb-6 text-sm text-cream-dim">
          {t("no_branch_b")}
        </p>

        <button
          type="button"
          onClick={() => {
            void supabase.auth
              .signOut()
              .then(() => {
                navigate({
                  to: "/auth",
                });
              });
          }}
          className="btn-ghost-brass px-5 py-2.5"
        >
          {t("signOut")}
        </button>
      </div>
    );
  }

  return (
    <div className="cashier-queue-page">
      <header className="cashier-queue-header">
        <div>
          <div className="cashier-queue-eyebrow">
            {lang === "ar"
              ? "قائمة الانتظار"
              : "Live Queue"}
          </div>

          <h1 className="cashier-queue-title">
            {lang === "ar"
              ? "طلبات الفرع"
              : "Branch Requests"}
          </h1>

          <p className="cashier-queue-description">
            {lang === "ar"
              ? "استقبل طلبات القهوة وطلبات التسجيل من مكان واحد."
              : "Manage coffee orders and registration requests from one place."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadQueue();
          }}
          disabled={loading}
          className="btn-ghost-brass cashier-refresh-button"
          title={
            lang === "ar"
              ? "تحديث"
              : "Refresh"
          }
        >
          <RefreshCw
            className={
              loading
                ? "h-4 w-4 animate-spin"
                : "h-4 w-4"
            }
          />

          <span>
            {lang === "ar"
              ? "تحديث"
              : "Refresh"}
          </span>
        </button>
      </header>

      <section className="cashier-summary-grid">
        <SummaryCard
          title={
            lang === "ar"
              ? "طلبات القهوة"
              : "Coffee Orders"
          }
          value={
            pendingOrders.length
          }
          icon={
            <Coffee className="h-5 w-5" />
          }
          tone="coffee"
        />

        <SummaryCard
          title={
            lang === "ar"
              ? "طلبات التسجيل"
              : "Registrations"
          }
          value={
            pendingRegistrations.length
          }
          icon={
            <UserPlus className="h-5 w-5" />
          }
          tone="registration"
        />
      </section>

      {error && (
        <div className="cashier-alert cashier-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="cashier-alert cashier-alert-success">
          {success}
        </div>
      )}

      <section className="cashier-queue-panel panel">
        <div className="cashier-queue-toolbar">
          <div>
            <h2 className="cashier-section-title">
              {lang === "ar"
                ? "الطلبات المعلّقة"
                : "Pending Requests"}
            </h2>

            <p className="cashier-section-subtitle">
              {fmtNum(
                queueItems.length,
              )}{" "}
              {lang === "ar"
                ? "طلب"
                : queueItems.length ===
                    1
                  ? "request"
                  : "requests"}
            </p>
          </div>

          <QueueFilterControl
            value={filter}
            onChange={setFilter}
            orderCount={
              pendingOrders.length
            }
            registrationCount={
              pendingRegistrations.length
            }
            language={lang}
          />
        </div>

        {loading &&
        queueItems.length === 0 ? (
          <div className="cashier-empty-state">
            <Loader2 className="h-8 w-8 animate-spin text-caramel" />

            <p>
              {lang === "ar"
                ? "جاري تحميل الطلبات..."
                : "Loading requests..."}
            </p>
          </div>
        ) : queueItems.length ===
          0 ? (
          <EmptyQueue
            language={lang}
            filter={filter}
          />
        ) : (
          <div className="cashier-request-grid">
            {queueItems.map(
              (item) =>
                item.kind ===
                "order" ? (
                  <CoffeeOrderCard
                    key={`order-${item.id}`}
                    order={item.data}
                    busy={
                      busyId ===
                      item.id
                    }
                    language={lang}
                    timeLabel={timeAgo(
                      item.createdAt,
                    )}
                    onApprove={() => {
                      void decideOrder(
                        item.id,
                        "approved",
                      );
                    }}
                    onReject={() => {
                      void decideOrder(
                        item.id,
                        "rejected",
                      );
                    }}
                  />
                ) : (
                  <RegistrationCard
                    key={`registration-${item.id}`}
                    request={
                      item.data
                    }
                    busy={
                      busyId ===
                      item.id
                    }
                    coupons={
                      coupons
                    }
                    planMap={
                      planMap
                    }
                    branchId={
                      branchId
                    }
                    selectedCoupon={
                      selectedCoupons[
                        item.id
                      ] ?? ""
                    }
                    selectedStartDate={
                      selectedStartDates[
                        item.id
                      ] ??
                      todayLocalISO()
                    }
                    language={lang}
                    timeLabel={timeAgo(
                      item.createdAt,
                    )}
                    onCouponChange={(
                      couponId,
                    ) => {
                      setSelectedCoupons(
                        (
                          current,
                        ) => ({
                          ...current,
                          [item.id]:
                            couponId,
                        }),
                      );
                    }}
                    onStartDateChange={(
                      date,
                    ) => {
                      setSelectedStartDates(
                        (
                          current,
                        ) => ({
                          ...current,
                          [item.id]:
                            date,
                        }),
                      );
                    }}
                    onActivate={() => {
                      void activateRegistration(
                        item.data,
                      );
                    }}
                    onReject={() => {
                      void rejectRegistration(
                        item.id,
                      );
                    }}
                  />
                ),
            )}
          </div>
        )}
      </section>
    </div>
  );
}

type SummaryCardProps = {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone:
    | "coffee"
    | "registration";
};

function SummaryCard({
  title,
  value,
  icon,
  tone,
}: SummaryCardProps) {
  return (
    <article
      className={`cashier-summary-card cashier-summary-${tone}`}
    >
      <div className="cashier-summary-icon">
        {icon}
      </div>

      <div>
        <div className="cashier-summary-label">
          {title}
        </div>

        <strong className="cashier-summary-value">
          {value}
        </strong>
      </div>
    </article>
  );
}

type QueueFilterControlProps = {
  value: QueueFilter;
  onChange: (
    value: QueueFilter,
  ) => void;
  orderCount: number;
  registrationCount: number;
  language: string;
};

function QueueFilterControl({
  value,
  onChange,
  orderCount,
  registrationCount,
  language,
}: QueueFilterControlProps) {
  const filters: Array<{
    value: QueueFilter;
    label: string;
    count: number;
  }> = [
    {
      value: "all",
      label:
        language === "ar"
          ? "الكل"
          : "All",
      count:
        orderCount +
        registrationCount,
    },
    {
      value: "orders",
      label:
        language === "ar"
          ? "الطلبات"
          : "Orders",
      count: orderCount,
    },
    {
      value: "registrations",
      label:
        language === "ar"
          ? "التسجيلات"
          : "Registrations",
      count:
        registrationCount,
    },
  ];

  return (
    <div className="cashier-filter-control">
      {filters.map(
        (filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              onChange(
                filter.value,
              );
            }}
            className={
              value ===
              filter.value
                ? "cashier-filter-button cashier-filter-button-active"
                : "cashier-filter-button"
            }
          >
            <span>
              {filter.label}
            </span>

            <span className="cashier-filter-count">
              {filter.count}
            </span>
          </button>
        ),
      )}
    </div>
  );
}

type CoffeeOrderCardProps = {
  order: OrderRow;
  busy: boolean;
  language: string;
  timeLabel: string;
  onApprove: () => void;
  onReject: () => void;
};

function CoffeeOrderCard({
  order,
  busy,
  language,
  timeLabel,
  onApprove,
  onReject,
}: CoffeeOrderCardProps) {
  const drinkName =
    language === "ar"
      ? order.drink
          ?.name_ar
      : order.drink
          ?.name_en;

  return (
    <article className="cashier-request-card cashier-order-card">
      <div className="cashier-card-accent" />

      <div className="cashier-card-header">
        <div className="cashier-request-type cashier-request-type-order">
          <Coffee className="h-4 w-4" />

          <span>
            {language === "ar"
              ? "طلب قهوة"
              : "Coffee Order"}
          </span>
        </div>

        <span className="cashier-new-badge">
          {language === "ar"
            ? "جديد"
            : "NEW"}
        </span>
      </div>

      <div className="cashier-drink-display">
        <div className="cashier-drink-icon">
          <Coffee className="h-8 w-8" />
        </div>

        <div>
          <div className="cashier-drink-label">
            {language === "ar"
              ? "المشروب"
              : "Drink"}
          </div>

          <h3 className="cashier-drink-name">
            {drinkName ?? "—"}
          </h3>
        </div>
      </div>

      <div className="cashier-card-details">
        <DetailRow
          icon={
            <User className="h-4 w-4" />
          }
          label={
            language === "ar"
              ? "العميل"
              : "Customer"
          }
          value={
            order.customer
              ?.name || "—"
          }
        />

        <DetailRow
          icon={
            <Phone className="h-4 w-4" />
          }
          label={
            language === "ar"
              ? "الجوال"
              : "Phone"
          }
          value={
            order.customer
              ?.phone || "—"
          }
          mono
        />

        <DetailRow
          icon={
            <Tag className="h-4 w-4" />
          }
          label={
            language === "ar"
              ? "الباقة"
              : "Plan"
          }
          value={
            order.subscription
              ?.plan?.name ||
            "—"
          }
        />

        <DetailRow
          icon={
            <Clock3 className="h-4 w-4" />
          }
          label={
            language === "ar"
              ? "الوقت"
              : "Time"
          }
          value={timeLabel}
        />
      </div>

      {(order.selected_options?.length > 0 || order.customer_note) && (
        <div className="cashier-customization-summary">
          {order.selected_options?.length > 0 && (
            <div>
              <span className="cashier-customization-title">
                {language === "ar" ? "الخيارات" : "Options"}
              </span>
              <ul>
                {order.selected_options.map((option, index) => (
                  <li key={`${option.option_name_en}-${index}`}>
                    <b>{language === "ar" ? option.group_name_ar : option.group_name_en}:</b>{" "}
                    {language === "ar" ? option.option_name_ar : option.option_name_en}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {order.customer_note && (
            <div className="cashier-customer-note">
              <span>{language === "ar" ? "تعليق العميل" : "Customer note"}</span>
              <p>{order.customer_note}</p>
            </div>
          )}
        </div>
      )}

      <div className="cashier-card-actions">
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="cashier-reject-button"
        >
          <X className="h-4 w-4" />

          <span>
            {language === "ar"
              ? "رفض"
              : "Reject"}
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="btn-brass cashier-approve-button"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}

          <span>
            {language === "ar"
              ? "قبول الطلب"
              : "Approve Order"}
          </span>
        </button>
      </div>
    </article>
  );
}

type RegistrationCardProps = {
  request: RegistrationRequest;
  busy: boolean;
  coupons: CouponRow[];
  planMap: Map<
    string,
    PlanRow
  >;
  branchId: string;
  selectedCoupon: string;
  selectedStartDate: string;
  language: string;
  timeLabel: string;
  onCouponChange: (
    couponId: string,
  ) => void;
  onStartDateChange: (
    date: string,
  ) => void;
  onActivate: () => void;
  onReject: () => void;
};

function RegistrationCard({
  request,
  busy,
  coupons,
  planMap,
  branchId,
  selectedCoupon,
  selectedStartDate,
  language,
  timeLabel,
  onCouponChange,
  onStartDateChange,
  onActivate,
  onReject,
}: RegistrationCardProps) {
  const fullName =
    `${request.first_name} ${request.last_name}`.trim();

  const availableCoupons =
    coupons.filter(
      (coupon) =>
        !coupon.branch_id ||
        coupon.branch_id ===
          branchId,
    );

  return (
    <article className="cashier-request-card cashier-registration-card">
      <div className="cashier-card-accent" />

      <div className="cashier-card-header">
        <div className="cashier-request-type cashier-request-type-registration">
          <UserPlus className="h-4 w-4" />

          <span>
            {language === "ar"
              ? "طلب تسجيل"
              : "Registration"}
          </span>
        </div>

        <span className="cashier-new-badge">
          {language === "ar"
            ? "جديد"
            : "NEW"}
        </span>
      </div>

      <div className="cashier-registration-customer">
        <div className="cashier-registration-avatar">
          <UserPlus className="h-7 w-7" />
        </div>

        <div className="min-w-0">
          <div className="cashier-drink-label">
            {language === "ar"
              ? "عميل جديد"
              : "New Customer"}
          </div>

          <h3 className="cashier-registration-name">
            {fullName || "—"}
          </h3>

          <div className="cashier-registration-phone">
            <Phone className="h-3.5 w-3.5" />

            <span>
              {request.phone}
            </span>
          </div>
        </div>
      </div>

      <div className="cashier-registration-meta">
        <span>
          {request.preferred_language.toUpperCase()}
        </span>

        <span>•</span>

        <span>
          {timeLabel}
        </span>
      </div>

      <div className="cashier-registration-form">
        <label className="cashier-form-field">
          <span>
            {language === "ar"
              ? "الكوبون والباقة"
              : "Coupon and Plan"}
          </span>

          <select
            value={
              selectedCoupon
            }
            disabled={busy}
            onChange={(event) => {
              onCouponChange(
                event.target
                  .value,
              );
            }}
            className="inset-well cashier-control"
          >
            <option value="">
              {language === "ar"
                ? "اختر الكوبون"
                : "Select coupon"}
            </option>

            {availableCoupons.map(
              (coupon) => {
                const plan =
                  planMap.get(
                    coupon.plan_id,
                  );

                return (
                  <option
                    key={
                      coupon.id
                    }
                    value={
                      coupon.id
                    }
                  >
                    {coupon.code}
                    {" · "}
                    {plan?.name ??
                      "—"}
                    {" · "}
                    {plan
                      ?.duration_days ??
                      0}
                    {language === "ar"
                      ? " يوم"
                      : " days"}
                  </option>
                );
              },
            )}
          </select>
        </label>

        <label className="cashier-form-field">
          <span>
            {language === "ar"
              ? "تاريخ البداية"
              : "Start Date"}
          </span>

          <input
            type="date"
            value={
              selectedStartDate
            }
            disabled={busy}
            onChange={(event) => {
              onStartDateChange(
                event.target
                  .value,
              );
            }}
            className="inset-well cashier-control"
          />
        </label>
      </div>

      {availableCoupons.length ===
        0 && (
        <div className="cashier-card-warning">
          {language === "ar"
            ? "لا توجد كوبونات متاحة لهذا الفرع."
            : "No available coupons for this branch."}
        </div>
      )}

      <div className="cashier-card-actions">
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="cashier-reject-button"
        >
          <X className="h-4 w-4" />

          <span>
            {language === "ar"
              ? "رفض"
              : "Reject"}
          </span>
        </button>

        <button
          type="button"
          disabled={
            busy ||
            !selectedCoupon
          }
          onClick={onActivate}
          className="btn-brass cashier-approve-button"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}

          <span>
            {language === "ar"
              ? "تفعيل الاشتراك"
              : "Activate Subscription"}
          </span>
        </button>
      </div>
    </article>
  );
}

type DetailRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
};

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: DetailRowProps) {
  return (
    <div className="cashier-detail-row">
      <div className="cashier-detail-icon">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <div className="cashier-detail-label">
          {label}
        </div>

        <div
          className={
            mono
              ? "cashier-detail-value font-mono"
              : "cashier-detail-value"
          }
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function EmptyQueue({
  language,
  filter,
}: {
  language: string;
  filter: QueueFilter;
}) {
  let title =
    language === "ar"
      ? "كل شيء محدّث"
      : "Everything is up to date";

  let description =
    language === "ar"
      ? "لا توجد طلبات معلّقة حاليًا."
      : "There are no pending requests right now.";

  if (filter === "orders") {
    title =
      language === "ar"
        ? "لا توجد طلبات قهوة"
        : "No coffee orders";

    description =
      language === "ar"
        ? "لا توجد طلبات قهوة معلّقة حاليًا."
        : "There are no pending coffee orders.";
  }

  if (
    filter ===
    "registrations"
  ) {
    title =
      language === "ar"
        ? "لا توجد طلبات تسجيل"
        : "No registrations";

    description =
      language === "ar"
        ? "لا توجد طلبات تسجيل معلّقة حاليًا."
        : "There are no pending registration requests.";
  }

  return (
    <div className="cashier-empty-state">
      <div className="cashier-empty-icon">
        <Inbox className="h-8 w-8" />
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {description}
      </p>
    </div>
  );
}

function todayLocalISO() {
  const date =
    new Date();

  const timezoneOffset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      timezoneOffset *
        60000,
  )
    .toISOString()
    .slice(0, 10);
}

function translateActivationError(
  message: string,
  language: string,
) {
  if (
    message.includes(
      "coupon_not_available",
    )
  ) {
    return language === "ar"
      ? "الكوبون غير متاح أو تم استخدامه."
      : "The coupon is unavailable or has already been used.";
  }

  if (
    message.includes(
      "coupon_wrong_branch",
    )
  ) {
    return language === "ar"
      ? "الكوبون غير مخصص لهذا الفرع."
      : "This coupon belongs to another branch.";
  }

  if (
    message.includes(
      "registration_already_processed",
    )
  ) {
    return language === "ar"
      ? "تمت معالجة طلب التسجيل مسبقًا."
      : "This registration request has already been processed.";
  }

  return message;
}
