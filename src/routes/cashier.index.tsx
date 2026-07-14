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
  Coffee,
  Loader2,
  RefreshCw,
  UserPlus,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { StatusPill } from "@/lib/ui";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/cashier/")({
  component: CashierDashboard,
});

type Order = {
  id: string;
  status: string;
  created_at: string;
  order_date: string;

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
  status: string;
  created_at: string;
};

type Coupon = {
  id: string;
  code: string;
  plan_id: string;
  branch_id: string | null;
  status: string;
};

type Plan = {
  id: string;
  name: string;
  duration_days: number;
};

function CashierDashboard() {
  const navigate =
    useNavigate();

  const { branchId } =
    useRole();

  const {
    t,
    fmtNum,
    timeAgo,
  } = useI18n();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [
    registrations,
    setRegistrations,
  ] =
    useState<
      RegistrationRequest[]
    >([]);

  const [coupons, setCoupons] =
    useState<Coupon[]>([]);

  const [plans, setPlans] =
    useState<Plan[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
    useState<string | null>(
      null,
    );

  const [
    selectedCoupons,
    setSelectedCoupons,
  ] = useState<
    Record<string, string>
  >({});

  const [
    selectedDates,
    setSelectedDates,
  ] = useState<
    Record<string, string>
  >({});

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const planMap =
    useMemo(
      () =>
        new Map(
          plans.map((plan) => [
            plan.id,
            plan,
          ]),
        ),
      [plans],
    );

  const load =
    useCallback(async () => {
      if (!branchId) {
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
              drink:drink_types(name_en,name_ar),
              customer:customers(name,phone),
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
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(50),

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
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(50),

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
          .order(
            "created_at",
            {
              ascending: false,
            },
          ),

        supabase
          .from("plans")
          .select(
            `
              id,
              name,
              duration_days
            `,
          ),
      ]);

      if (
        ordersResult.error
      ) {
        setError(
          ordersResult.error
            .message,
        );
      }

      if (
        registrationsResult.error
      ) {
        setError(
          registrationsResult
            .error.message,
        );
      }

      if (
        couponsResult.error
      ) {
        setError(
          couponsResult.error
            .message,
        );
      }

      setOrders(
        (ordersResult.data ??
          []) as unknown as Order[],
      );

      setRegistrations(
        (registrationsResult.data ??
          []) as RegistrationRequest[],
      );

      setCoupons(
        (couponsResult.data ??
          []) as Coupon[],
      );

      setPlans(
        (plansResult.data ??
          []) as Plan[],
      );

      setLoading(false);
    }, [branchId]);

  useEffect(() => {
    if (branchId) {
      void load();
    }
  }, [
    branchId,
    load,
  ]);

  useEffect(() => {
    if (!branchId) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          void load();
        },
        5000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    branchId,
    load,
  ]);

  async function decideOrder(
    id: string,
    status:
      | "approved"
      | "rejected",
  ) {
    setBusyId(id);

    const updateData =
      status === "approved"
        ? {
            status,
            approved_at:
              new Date()
                .toISOString(),
          }
        : {
            status,
            rejected_at:
              new Date()
                .toISOString(),
          };

    const { error } =
      await supabase
        .from("orders")
        .update(updateData)
        .eq("id", id);

    setBusyId(null);

    if (error) {
      setError(
        error.message,
      );

      return;
    }

    await load();
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
      selectedDates[
        request.id
      ] ??
      todayLocalISO();

    if (!couponId) {
      setError(
        "Select a coupon before activating the subscription.",
      );

      return;
    }

    setBusyId(
      request.id,
    );

    setError(null);

    const { error } =
      await supabase.rpc(
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

    if (error) {
      setError(
        error.message,
      );

      return;
    }

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

    await load();
  }

  async function rejectRegistration(
    requestId: string,
  ) {
    const confirmed =
      window.confirm(
        "Reject this registration request?",
      );

    if (!confirmed) {
      return;
    }

    setBusyId(
      requestId,
    );

    setError(null);

    const { error } =
      await supabase.rpc(
        "cashier_reject_registration",
        {
          _request_id:
            requestId,
        },
      );

    setBusyId(null);

    if (error) {
      setError(
        error.message,
      );

      return;
    }

    await load();
  }

  if (!branchId) {
    return (
      <div className="panel-warm mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 font-display text-2xl font-bold text-cream">
          {t(
            "no_branch_h",
          )}
        </h1>

        <p className="mb-6 text-sm text-cream-dim">
          {t(
            "no_branch_b",
          )}
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

  const pendingOrders =
    orders.filter(
      (order) =>
        order.status ===
        "pending",
    );

  const recentOrders =
    orders
      .filter(
        (order) =>
          order.status !==
          "pending",
      )
      .slice(0, 20);

  const pendingRegistrations =
    registrations.filter(
      (request) =>
        request.status ===
        "pending",
    );

  const recentRegistrations =
    registrations
      .filter(
        (request) =>
          request.status !==
          "pending",
      )
      .slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          className="btn-ghost-brass px-3 py-2"
        >
          <RefreshCw
            className={
              "h-4 w-4 " +
              (loading
                ? "animate-spin"
                : "")
            }
          />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="panel-warm p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-caramel-bright" />

            <h2 className="font-display text-2xl font-bold text-cream">
              Registration Requests
            </h2>
          </div>

          <span className="engraved px-3 py-1 font-mono text-sm gold-text">
            {fmtNum(
              pendingRegistrations.length,
            )}
          </span>
        </div>

        {pendingRegistrations.length ===
        0 ? (
          <div className="engraved p-8 text-center text-sm text-cream-dim">
            No pending registration requests.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRegistrations.map(
              (request) => {
                const availableCoupons =
                  coupons.filter(
                    (coupon) =>
                      !coupon.branch_id ||
                      coupon.branch_id ===
                        branchId,
                  );

                return (
                  <article
                    key={
                      request.id
                    }
                    className="engraved p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="panel flex h-14 w-14 items-center justify-center rounded-full">
                          <UserPlus className="h-6 w-6 text-caramel-bright" />
                        </div>

                        <div>
                          <div className="font-display text-xl font-semibold text-cream">
                            {
                              request.first_name
                            }{" "}
                            {
                              request.last_name
                            }
                          </div>

                          <div className="font-mono text-xs text-cream-dim">
                            {
                              request.phone
                            }
                          </div>

                          <div className="mt-1 text-[10px] uppercase tracking-widest text-cream-dim">
                            {request.preferred_language.toUpperCase()}
                            {" · "}
                            {timeAgo(
                              request.created_at,
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid items-end gap-3 md:grid-cols-[1fr_190px_auto_auto]">
                      <label className="block">
                        <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-cream-dim">
                          Coupon / Plan
                        </span>

                        <select
                          value={
                            selectedCoupons[
                              request.id
                            ] ?? ""
                          }
                          onChange={(
                            event,
                          ) => {
                            setSelectedCoupons(
                              (
                                current,
                              ) => ({
                                ...current,

                                [request.id]:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }}
                          className="inset-well w-full px-3 py-2.5 outline-none"
                        >
                          <option value="">
                            Select coupon
                          </option>

                          {availableCoupons.map(
                            (
                              coupon,
                            ) => {
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
                                  {
                                    coupon.code
                                  }
                                  {" · "}
                                  {plan
                                    ?.name ??
                                    "—"}
                                  {" · "}
                                  {plan
                                    ?.duration_days ??
                                    0}
                                  {" days"}
                                </option>
                              );
                            },
                          )}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-cream-dim">
                          Start date
                        </span>

                        <input
                          type="date"
                          value={
                            selectedDates[
                              request.id
                            ] ??
                            todayLocalISO()
                          }
                          onChange={(
                            event,
                          ) => {
                            setSelectedDates(
                              (
                                current,
                              ) => ({
                                ...current,

                                [request.id]:
                                  event
                                    .target
                                    .value,
                              }),
                            );
                          }}
                          className="inset-well w-full px-3 py-2.5 outline-none"
                        />
                      </label>

                      <button
                        type="button"
                        disabled={
                          busyId ===
                            request.id
                        }
                        onClick={() => {
                          void rejectRegistration(
                            request.id,
                          );
                        }}
                        className="btn-ghost-brass flex items-center justify-center gap-2 px-4 py-2.5"
                      >
                        <X className="h-4 w-4" />

                        Reject
                      </button>

                      <button
                        type="button"
                        disabled={
                          busyId ===
                            request.id
                        }
                        onClick={() => {
                          void activateRegistration(
                            request,
                          );
                        }}
                        className="btn-brass flex items-center justify-center gap-2 px-5 py-2.5"
                      >
                        {busyId ===
                        request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}

                        Activate
                      </button>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="panel-warm p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-cream">
            {t(
              "pending_orders",
            )}
          </h2>

          <span className="engraved px-3 py-1 font-mono text-sm gold-text">
            {fmtNum(
              pendingOrders.length,
            )}
          </span>
        </div>

        {pendingOrders.length ===
        0 ? (
          <div className="engraved p-8 text-center text-sm text-cream-dim">
            {t(
              "empty_queue",
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map(
              (order) => (
                <div
                  key={
                    order.id
                  }
                  className="engraved flex flex-wrap items-center justify-between gap-4 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="panel flex h-14 w-14 items-center justify-center rounded-full">
                      <Coffee className="h-6 w-6 text-caramel-bright" />
                    </div>

                    <div>
                      <div className="font-display text-xl font-semibold text-cream">
                        {order.drink
                          ?.name_en ??
                          "—"}
                      </div>

                      <div className="font-mono text-xs text-cream-dim">
                        {order.customer
                          ?.phone}
                        {" · "}
                        {order.customer
                          ?.name ??
                          "—"}
                      </div>

                      <div className="mt-1 text-[10px] uppercase tracking-widest text-cream-dim">
                        {order.subscription
                          ?.plan
                          ?.name ??
                          ""}
                        {" · "}
                        {timeAgo(
                          order.created_at,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        busyId ===
                        order.id
                      }
                      onClick={() => {
                        void decideOrder(
                          order.id,
                          "rejected",
                        );
                      }}
                      className="btn-ghost-brass flex items-center gap-1.5 px-4 py-2.5"
                    >
                      <X className="h-4 w-4" />

                      {t(
                        "btn_reject",
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={
                        busyId ===
                        order.id
                      }
                      onClick={() => {
                        void decideOrder(
                          order.id,
                          "approved",
                        );
                      }}
                      className="btn-brass flex items-center gap-1.5 px-5 py-2.5"
                    >
                      {busyId ===
                      order.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}

                      {t(
                        "btn_approve",
                      )}
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel p-6">
        <h2 className="mb-4 font-display text-xl font-bold text-cream">
          Recent Registration Requests
        </h2>

        <div className="engraved overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-cream-dim">
                <th className="px-4 py-3 text-start">
                  Customer
                </th>

                <th className="px-4 py-3 text-start">
                  Phone
                </th>

                <th className="px-4 py-3 text-start">
                  Status
                </th>

                <th className="px-4 py-3 text-end">
                  When
                </th>
              </tr>
            </thead>

            <tbody>
              {recentRegistrations.map(
                (request) => (
                  <tr
                    key={
                      request.id
                    }
                    className="border-t border-[oklch(0.08_0.02_40)]"
                  >
                    <td className="px-4 py-3 text-cream">
                      {
                        request.first_name
                      }{" "}
                      {
                        request.last_name
                      }
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-cream-dim">
                      {
                        request.phone
                      }
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill
                        s={
                          request.status
                        }
                      />
                    </td>

                    <td className="px-4 py-3 text-end text-cream-dim">
                      {timeAgo(
                        request.created_at,
                      )}
                    </td>
                  </tr>
                ),
              )}

              {recentRegistrations.length ===
                0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-cream-dim"
                  >
                    No registration history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="mb-4 font-display text-xl font-bold text-cream">
          {t("recent")}
        </h2>

        <div className="engraved overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-cream-dim">
                <th className="px-4 py-3 text-start">
                  {t(
                    "col_coffee",
                  )}
                </th>

                <th className="px-4 py-3 text-start">
                  {t(
                    "col_phone",
                  )}
                </th>

                <th className="px-4 py-3 text-start">
                  {t(
                    "col_status",
                  )}
                </th>

                <th className="px-4 py-3 text-end">
                  {t(
                    "col_when",
                  )}
                </th>
              </tr>
            </thead>

            <tbody>
              {recentOrders.map(
                (order) => (
                  <tr
                    key={
                      order.id
                    }
                    className="border-t border-[oklch(0.08_0.02_40)]"
                  >
                    <td className="px-4 py-3 text-cream">
                      {order.drink
                        ?.name_en ??
                        "—"}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-cream-dim">
                      {order.customer
                        ?.phone ??
                        ""}
                    </td>

                    <td className="px-4 py-3">
                      <StatusPill
                        s={
                          order.status
                        }
                      />
                    </td>

                    <td className="px-4 py-3 text-end text-cream-dim">
                      {timeAgo(
                        order.created_at,
                      )}
                    </td>
                  </tr>
                ),
              )}

              {recentOrders.length ===
                0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-6 text-center text-cream-dim"
                  >
                    {t(
                      "empty_orders",
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function todayLocalISO() {
  const date =
    new Date();

  const offset =
    date.getTimezoneOffset();

  return new Date(
    date.getTime() -
      offset * 60000,
  )
    .toISOString()
    .slice(0, 10);
}
