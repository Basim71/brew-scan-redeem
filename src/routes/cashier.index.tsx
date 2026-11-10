import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellRing,
  Check,
  Clock3,
  Coffee,
  Inbox,
  Phone,
  Search,
  ShieldAlert,
  Tag,
  Undo2,
  User,
  UserPlus,
  X,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/use-auth";
import { useOrganization } from "@/providers/OrganizationProvider";
import { OrderingSection } from "@/features/company/settings/CompanySettingsShell";
import { useCompanySettings } from "@/features/company/settings/useCompanySettings";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DateInput,
  EmptyState,
  Field,
  LoadingState,
  PhoneInput,
  Select,
  StatCard,
  StatGrid,
  Tabs,
} from "@/components/kob";
import { OfflinePanel } from "@/features/cashier/OfflinePanel";

export const Route = createFileRoute("/cashier/")({
  head: () => ({
    meta: [
      { title: "KOB | Cashier orders" },
      {
        name: "description",
        content:
          "Manage KOB coffee orders and verify signed offline customer codes.",
      },
      { property: "og:title", content: "KOB | Cashier orders" },
      {
        property: "og:description",
        content:
          "Manage coffee orders and signed offline redemptions with KOB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashierQueuePage,
});

type QueueFilter = "all" | "orders" | "registrations";

type FulfillmentStage = "preparing" | "ready" | "handover" | "picked_up";

type OrderRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  fulfillment_stage?: FulfillmentStage | null;
  order_number?: number | null;
  handover_declined_at?: string | null;
  order_date?: string | null;
  selected_options: Array<{
    group_name_en: string;
    group_name_ar: string;
    option_name_en: string;
    option_name_ar: string;
  }>;
  customer_note: string | null;
  drink: { name_en: string; name_ar: string; image_url?: string | null } | null;
  customer: { name: string; phone: string; member_number?: number | null } | null;
  branch?: { name_en?: string | null; name_ar?: string | null } | null;
  subscription: {
    id: string;
    end_date: string;
    cups_total?: number | null;
    cups_used?: number | null;
    plan: {
      name: string;
      name_ar?: string | null;
      name_en?: string | null;
      duration_days: number;
      max_drinks_per_day?: number | null;
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
  status: "pending" | "approved" | "rejected";
  created_at: string;
  requested_plan_id: string | null;
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
  name_ar: string | null;
  name_en: string | null;
  duration_days: number;
  price: number;
  currency: string | null;
  max_drinks_per_day: number | null;
};

const PAYMENT_METHODS = [
  "cash",
  "mada",
  "visa",
  "mastercard",
  "apple_pay",
] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

type QueueItem =
  | { kind: "order"; id: string; createdAt: string; data: OrderRow }
  | {
      kind: "registration";
      id: string;
      createdAt: string;
      data: RegistrationRequest;
    };

type LookupResult = {
  found?: boolean;
  customer?: { name?: string | null; phone?: string | null } | null;
  subscription?: {
    plan?: { name?: string | null } | null;
    end_date?: string | null;
    status?: string | null;
  } | null;
  used_today?: number | null;
};

function CashierQueuePage() {
  const navigate = useNavigate();
  const { branchId } = useRole();
  const { t, fmtNum, fmtDate, timeAgo, lang } = useI18n();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<OrderRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("orders");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCoupons, setSelectedCoupons] = useState<
    Record<string, string>
  >({});
  const [selectedPayments, setSelectedPayments] = useState<
    Record<string, PaymentMethod>
  >({});
  const [selectedStartDates, setSelectedStartDates] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [usedToday, setUsedToday] = useState<Record<string, number>>({});
  const [branchChoices, setBranchChoices] = useState<
    Array<{ id: string; name_ar: string; name_en: string }>
  >([]);
  const [pickedBranch, setPickedBranch] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchPhone, setSearchPhone] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<LookupResult | null>(null);

  const activeBranch = branchId || pickedBranch;
  const planMap = useMemo(
    () => new Map(plans.map((plan) => [plan.id, plan])),
    [plans],
  );

  useEffect(() => {
    if (branchId) return;
    let cancelled = false;
    void supabase
      .from("branches")
      .select("id,name_ar,name_en")
      .eq("is_active", true)
      .then(({ data, error: branchError }) => {
        if (cancelled) return;
        if (branchError) {
          setError(friendlyCashierError(branchError.message, lang));
          return;
        }
        const rows = (data ?? []) as Array<{
          id: string;
          name_ar: string;
          name_en: string;
        }>;
        setBranchChoices(rows);
        if (rows.length === 1) setPickedBranch(rows[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, lang]);

  const loadQueue = useCallback(async () => {
    if (!activeBranch) {
      setLoading(false);
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const rich = `id, status, created_at, order_date, selected_options, customer_note,
           fulfillment_stage, handover_declined_at, order_number,
           drink:drink_types(name_en, name_ar, image_url),
           customer:customers(name, phone, member_number),
           branch:branches(name_en, name_ar),
           subscription:subscriptions(id, end_date, cups_total, cups_used, plan:plans(name, name_ar, name_en, duration_days, max_drinks_per_day))`;
    const plain = `id, status, created_at, order_date, selected_options, customer_note,
           drink:drink_types(name_en, name_ar),
           customer:customers(name, phone, member_number),
           subscription:subscriptions(id, end_date, plan:plans(name, duration_days))`;

    try {
      const pendingTry = await supabase
        .from("orders")
        .select(rich)
        .eq("branch_id", activeBranch)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100);
      const pending = pendingTry.error
        ? await supabase
            .from("orders")
            .select(plain)
            .eq("branch_id", activeBranch)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(100)
        : pendingTry;

      const [registrationsResult, couponsResult, plansResult, usedResult] =
        await Promise.all([
          supabase
            .from("registration_requests")
            .select(
              "id, first_name, last_name, phone, branch_id, preferred_language, status, created_at, requested_plan_id",
            )
            .eq("branch_id", activeBranch)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("coupons")
            .select("id, code, plan_id, branch_id, status")
            .eq("status", "available")
            .or(`branch_id.eq.${activeBranch},branch_id.is.null`)
            .order("created_at", { ascending: false }),
          supabase
            .from("plans")
            .select(
              "id, name, name_ar, name_en, duration_days, price, currency, max_drinks_per_day",
            )
            .order("name"),
          supabase
            .from("orders")
            .select("subscription_id")
            .eq("branch_id", activeBranch)
            .eq("status", "approved")
            .eq("order_date", todayLocalISO()),
        ]);

      if (pending.error) {
        if (
          !/load failed|failed to fetch|network/i.test(pending.error.message)
        ) {
          setError(friendlyCashierError(pending.error.message, lang));
        }
      } else {
        setOrders((pending.data ?? []) as unknown as OrderRow[]);
      }

      const progressTry = await supabase
        .from("orders")
        .select(rich)
        .eq("branch_id", activeBranch)
        .eq("status", "approved")
        .in("fulfillment_stage", ["preparing", "ready", "handover"])
        .gte(
          "created_at",
          new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        )
        .order("created_at", { ascending: true })
        .limit(100);
      if (!progressTry.error)
        setInProgressOrders((progressTry.data ?? []) as unknown as OrderRow[]);

      if (!registrationsResult.error)
        setRegistrations(
          (registrationsResult.data ?? []) as RegistrationRequest[],
        );
      if (!couponsResult.error)
        setCoupons((couponsResult.data ?? []) as CouponRow[]);
      if (!plansResult.error) setPlans((plansResult.data ?? []) as PlanRow[]);
      if (!usedResult.error) {
        const counts: Record<string, number> = {};
        for (const row of usedResult.data ?? []) {
          const id = (row as { subscription_id?: string }).subscription_id;
          if (!id) continue;
          counts[id] = (counts[id] ?? 0) + 1;
        }
        setUsedToday(counts);
      }
    } catch {
      // Network dropped mid-request: stay on the current screen silently.
    } finally {
      setLoading(false);
    }
  }, [activeBranch, lang]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  // Live: a new order, or the customer confirming pickup, shows at
  // once. Bursts (one approval touches a row twice) reload once.
  useEffect(() => {
    if (!activeBranch) return;
    let timer: number | undefined;
    const channel = supabase
      .channel(`cashier-orders-${activeBranch}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `branch_id=eq.${activeBranch}`,
        },
        () => {
          window.clearTimeout(timer);
          timer = window.setTimeout(() => void loadQueue(), 250);
        },
      )
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [activeBranch, loadQueue]);

  // Fallback in case the live connection drops.
  useEffect(() => {
    if (!activeBranch) return;
    const intervalId = window.setInterval(() => {
      if (navigator.onLine) void loadQueue().catch(() => undefined);
    }, 5000);
    const onOnline = () => void loadQueue().catch(() => undefined);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", onOnline);
    };
  }, [activeBranch, loadQueue]);

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.status === "pending"),
    [orders],
  );
  const pendingRegistrations = useMemo(
    () => registrations.filter((r) => r.status === "pending"),
    [registrations],
  );

  const queueItems = useMemo<QueueItem[]>(() => {
    const merged: QueueItem[] = [
      ...pendingOrders.map((order) => ({
        kind: "order" as const,
        id: order.id,
        createdAt: order.created_at,
        data: order,
      })),
      ...pendingRegistrations.map((registration) => ({
        kind: "registration" as const,
        id: registration.id,
        createdAt: registration.created_at,
        data: registration,
      })),
    ].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    if (filter === "orders")
      return merged.filter((item) => item.kind === "order");
    if (filter === "registrations")
      return merged.filter((item) => item.kind === "registration");
    return merged;
  }, [filter, pendingOrders, pendingRegistrations]);

  // Tells the customer's phone about the change. Fire and forget:
  // the order already moved, a failed notification shouldn't show
  // the cashier an error.
  function notifyCustomer(orderId: string) {
    void supabase.functions
      .invoke("order-push", { body: { order_id: orderId } })
      .catch(() => undefined);
  }

  async function decideOrder(orderId: string, status: "approved" | "rejected") {
    setBusyId(orderId);
    setError(null);
    setSuccess(null);

    const timestamp = new Date().toISOString();
    const updateData =
      status === "approved"
        ? { status, approved_at: timestamp }
        : { status, rejected_at: timestamp };

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("status", "pending");

    setBusyId(null);

    if (updateError) {
      setError(
        updateError.message.includes("daily_limit_reached")
          ? t("cashier.dailyLimitReached")
          : updateError.message,
      );
      return;
    }

    notifyCustomer(orderId);
    setSuccess(
      t(
        status === "approved"
          ? "cashier.orderApproved"
          : "cashier.orderRejected",
      ),
    );
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }

  async function setOrderStage(orderId: string, stage: "ready" | "handover") {
    setBusyId(orderId);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc("cashier_set_order_stage", {
      _order_id: orderId,
      _stage: stage,
    });

    setBusyId(null);

    if (rpcError) {
      setError(rpcError.message);
      await loadQueue();
      return;
    }

    notifyCustomer(orderId);
    setSuccess(
      t(stage === "handover" ? "cashier.handoverSent" : "cashier.orderReady"),
    );
    await loadQueue();
  }

  async function cancelHandover(orderId: string) {
    setBusyId(orderId);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc("cashier_set_order_stage", {
      _order_id: orderId,
      _stage: "ready",
    });

    setBusyId(null);

    if (rpcError) setError(rpcError.message);
    await loadQueue();
  }

  async function activateRegistration(request: RegistrationRequest) {
    const planId =
      selectedCoupons[request.id] || request.requested_plan_id || "";
    const payment = selectedPayments[request.id];
    const startDate = selectedStartDates[request.id] ?? todayLocalISO();

    if (!planId) {
      setError(t("cashier.selectPlanFirst"));
      return;
    }
    if (!payment) {
      setError(t("cashier.selectPaymentFirst"));
      return;
    }

    setBusyId(request.id);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc("cashier_activate_plan", {
      _request_id: request.id,
      _plan_id: planId,
      _start_date: startDate,
      _payment_method: payment,
    });

    setBusyId(null);

    if (rpcError) {
      setError(translateActivationError(rpcError.message, t));
      return;
    }

    setRegistrations((current) => current.filter((r) => r.id !== request.id));
    setSuccess(t("cashier.registrationActivated"));
    await loadQueue();
  }

  async function rejectRegistration(requestId: string) {
    if (!window.confirm(t("cashier.confirmRejectRegistration"))) return;

    setBusyId(requestId);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc(
      "cashier_reject_registration",
      {
        _request_id: requestId,
      },
    );

    setBusyId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setRegistrations((current) => current.filter((r) => r.id !== requestId));
    setSuccess(t("cashier.registrationRejected"));
  }

  async function lookupCustomer() {
    if (!activeBranch) return;
    const local = localSaudiPhone(searchPhone);

    if (!local) {
      setSearchError(t("cashier.invalidPhone"));
      setSearchResult(null);
      return;
    }

    setSearchBusy(true);
    setSearchError(null);
    setSearchResult(null);

    // Customers who signed up on the site are stored as 05XXXXXXXX,
    // app customers as +9665XXXXXXXX: try each until one matches.
    let payload: LookupResult | null = null;
    for (const phone of [
      local,
      `+966${local.slice(1)}`,
      `966${local.slice(1)}`,
    ]) {
      const { data, error: lookupError } = await supabase.rpc("scan_lookup", {
        _phone: phone,
        _branch_id: activeBranch,
      });

      if (lookupError) {
        setSearchBusy(false);
        setSearchError(lookupError.message);
        return;
      }

      payload = (data ?? null) as LookupResult | null;
      if (payload?.found) break;
    }

    setSearchBusy(false);

    if (!payload?.found || !payload.subscription) {
      setSearchError(t("cashier.noSubscriptionFound"));
      return;
    }

    setSearchResult(payload);
  }

  if (!activeBranch) {
    return (
      <section className="cafe-card">
        <h2>{t("cafe.cashier.pickBranch")}</h2>
        {branchChoices.length === 0 ? (
          <p className="cafe-muted">{t("cafe.cashier.noBranch")}</p>
        ) : (
          <div className="cafe-chips">
            {branchChoices.map((branch) => (
              <button
                key={branch.id}
                type="button"
                className="cafe-chip"
                onClick={() => setPickedBranch(branch.id)}
              >
                {lang === "ar"
                  ? branch.name_ar || branch.name_en
                  : branch.name_en || branch.name_ar}
              </button>
            ))}
          </div>
        )}
        {error ? <div className="cafe-error">{error}</div> : null}
      </section>
    );
  }

  return (
    <div className="cashier-desk">
      <OfflinePanel branchId={activeBranch}>
        {(api) => (
          <>
            <div className="cafe-hd">
              <div>
                <h1>{t("cafe.cashier.title")}</h1>
              </div>
              <span className="cashier-off">
                <b />
                {api.online
                  ? t("cafe.cashier.offlineReady")
                  : t("cafe.cashier.offlineDown")}
                {api.queue ? ` · ${fmtNum(api.queue)}` : ""}
              </span>
            </div>
            <div className="cashier-tools">
              <form
                className="cashier-tool"
                onSubmit={(event) => {
                  event.preventDefault();
                  api.readCode();
                }}
              >
                <div>
                  <div className="cafe-label">
                    {t("cafe.cashier.codeLabel")}
                  </div>
                  <input
                    value={api.raw}
                    dir="ltr"
                    placeholder={t("cafe.cashier.codePh")}
                    onChange={(event) => api.setRaw(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="go"
                  onClick={api.openCamera}
                  aria-label={t("cafe.cashier.camera")}
                >
                  {t("cafe.cashier.camera")}
                </button>
                <button type="submit" className="go">
                  {t("cafe.cashier.read")}
                </button>
              </form>
              <form
                className="cashier-tool"
                onSubmit={(event) => {
                  event.preventDefault();
                  void lookupCustomer();
                }}
              >
                <div>
                  <div className="cafe-label">
                    {t("cafe.cashier.phoneLabel")}
                  </div>
                  <input
                    value={searchPhone}
                    dir="ltr"
                    inputMode="tel"
                    placeholder="05XXXXXXXX"
                    onChange={(event) => {
                      setSearchPhone(event.target.value);
                      setSearchError(null);
                    }}
                  />
                </div>
                <button type="submit" className="go" disabled={searchBusy}>
                  {t("cafe.cashier.search")}
                </button>
              </form>
            </div>
          </>
        )}
      </OfflinePanel>

      {error ? <div className="cafe-error">{error}</div> : null}
      {success ? <div className="cafe-empty">{success}</div> : null}
      {searchError ? <div className="cafe-empty">{searchError}</div> : null}
      {searchResult?.subscription ? (
        <section className="cafe-card">
          <b>{searchResult.customer?.name || "—"}</b>
          <div className="cafe-muted">
            {searchResult.subscription.plan?.name || "—"} ·{" "}
            {t("cafe.subs.days", {
              n: fmtNum(
                searchResult.subscription.end_date
                  ? daysUntil(searchResult.subscription.end_date)
                  : 0,
              ),
            })}{" "}
            ·{" "}
            {t("cafe.cashier.used", {
              n: fmtNum(searchResult.used_today ?? 0),
            })}
          </div>
        </section>
      ) : null}

      <section className="cafe-card">
        <div className="cashier-qhead">
          <h2 style={{ margin: 0 }}>{t("cafe.cashier.now")}</h2>
          <div className="cafe-chips">
            <button
              type="button"
              className={filter === "orders" ? "cafe-chip on" : "cafe-chip"}
              onClick={() => setFilter("orders")}
            >
              {t("cafe.cashier.orders")} <b>{fmtNum(pendingOrders.length)}</b>
            </button>
            <button
              type="button"
              className={
                filter === "registrations" ? "cafe-chip on" : "cafe-chip"
              }
              onClick={() => setFilter("registrations")}
            >
              {t("cafe.cashier.regs")}{" "}
              <b>{fmtNum(pendingRegistrations.length)}</b>
            </button>
          </div>
        </div>
        <div>
          {loading && queueItems.length === 0 ? (
            <div className="cafe-empty">{t("cafe.cashier.loading")}</div>
          ) : queueItems.length === 0 ? (
            <div className="cafe-empty">
              <b>
                {filter === "registrations"
                  ? t("cafe.cashier.emptyRegs")
                  : t("cafe.cashier.emptyTitle")}
              </b>
              <div>{t("cafe.cashier.emptyBody")}</div>
            </div>
          ) : (
            <div>
              {queueItems.map((item) =>
                item.kind === "order" ? (
                  <CoffeeOrderCard
                    key={`order-${item.id}`}
                    order={item.data}
                    busy={busyId === item.id}
                    isAr={lang === "ar"}
                    t={t}
                    fmtNum={fmtNum}
                    used={usedToday[item.data.subscription?.id ?? ""] ?? 0}
                    timeLabel={timeAgo(item.createdAt)}
                    branchLabel={
                      lang === "ar"
                        ? item.data.branch?.name_ar ||
                          item.data.branch?.name_en ||
                          ""
                        : item.data.branch?.name_en ||
                          item.data.branch?.name_ar ||
                          ""
                    }
                    onApprove={() => {
                      void decideOrder(item.id, "approved");
                    }}
                    onReject={() => {
                      void decideOrder(item.id, "rejected");
                    }}
                  />
                ) : (
                  <RegistrationCard
                    key={`registration-${item.id}`}
                    request={item.data}
                    busy={busyId === item.id}
                    coupons={coupons}
                    planMap={planMap}
                    branchId={activeBranch}
                    t={t}
                    selectedCoupon={
                      selectedCoupons[item.id] ||
                      item.data.requested_plan_id ||
                      ""
                    }
                    selectedPayment={selectedPayments[item.id] ?? null}
                    onPaymentChange={(method) => {
                      setSelectedPayments((current) => ({
                        ...current,
                        [item.id]: method,
                      }));
                    }}
                    selectedStartDate={
                      selectedStartDates[item.id] ?? todayLocalISO()
                    }
                    timeLabel={timeAgo(item.createdAt)}
                    onCouponChange={(couponId) => {
                      setSelectedCoupons((current) => ({
                        ...current,
                        [item.id]: couponId,
                      }));
                    }}
                    onStartDateChange={(date) => {
                      setSelectedStartDates((current) => ({
                        ...current,
                        [item.id]: date,
                      }));
                    }}
                    onActivate={() => {
                      void activateRegistration(item.data);
                    }}
                    onReject={() => {
                      void rejectRegistration(item.id);
                    }}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </section>

      {inProgressOrders.length ? (
        <Card tone="raised">
          <CardHeader
            title={t("cashier.inProgressTitle")}
            description={t("cashier.inProgressDescription")}
            icon={<Coffee className="h-4 w-4" />}
          />
          <CardBody>
            <div className="kob-queue-grid">
              {inProgressOrders.map((order) => (
                <InProgressOrderCard
                  key={`progress-${order.id}`}
                  order={order}
                  busy={busyId === order.id}
                  isAr={lang === "ar"}
                  t={t}
                  timeLabel={timeAgo(order.created_at)}
                  onReady={() => {
                    void setOrderStage(order.id, "ready");
                  }}
                  onHandover={() => {
                    void setOrderStage(order.id, "handover");
                  }}
                  onCancelHandover={() => {
                    void cancelHandover(order.id);
                  }}
                />
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}
      <CashierOrdering />
    </div>
  );
}

function CashierOrdering() {
  const { t, lang } = useI18n();
  const { role } = useOrganization();
  const { settings, save } = useCompanySettings();
  const [open, setOpen] = useState(false);
  if (!settings) return null;
  const canEdit = role === "owner" || role === "admin" || role === "manager";
  return (
    <section className="cafe-card">
      <h2>
        {t("cafe.cashier.ordering")}
        <button
          type="button"
          className="cafe-link"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? t("cafe.hide") : t("cafe.show")}
        </button>
      </h2>
      {open ? (
        <OrderingSection
          settings={settings}
          profile={null}
          organizationId={settings.organization_id}
          isAr={lang === "ar"}
          canEdit={canEdit}
          isOwner={role === "owner"}
          commit={async (patch, section) => {
            await save(patch, section);
          }}
          commitProfile={async () => undefined}
        />
      ) : (
        <p className="cafe-muted">{t("cafe.cashier.orderingHint")}</p>
      )}
    </section>
  );
}

type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

function CoffeeOrderCard({
  order,
  busy,
  isAr,
  t,
  fmtNum,
  used,
  timeLabel,
  branchLabel,
  onApprove,
  onReject,
}: {
  order: OrderRow;
  busy: boolean;
  isAr: boolean;
  t: Translate;
  fmtNum: (n: number) => string;
  used: number;
  timeLabel: string;
  branchLabel: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const drinkName = isAr ? order.drink?.name_ar : order.drink?.name_en;
  const plan = order.subscription?.plan;
  const planName =
    (isAr ? plan?.name_ar || plan?.name : plan?.name_en || plan?.name) || "—";
  const limit = Math.max(plan?.max_drinks_per_day ?? 1, 1);
  const left = Math.max(limit - used, 0);
  const days = order.subscription?.end_date
    ? daysUntil(order.subscription.end_date)
    : null;

  return (
    <article className="cashier-card">
      {order.drink?.image_url ? (
        <img src={order.drink.image_url} alt="" />
      ) : (
        <div className="ph" />
      )}
      <div className="info">
        <div className="name">{order.order_number ? `#${order.order_number} · ` : ""}{order.customer?.name || "—"}{order.customer?.member_number ? ` · №${String(order.customer.member_number).padStart(2, "0")}` : ""}</div>
        <div className="cafe-muted">
          <span className="cafe-status">{t("cafe.cashier.coffee")}</span>
        </div>
        <div style={{ marginTop: 6, fontWeight: 700, color: "#6b4226" }}>
          {t("cafe.cashier.plan", { name: planName })}
          {" · "}
          {order.subscription?.cups_total != null
            ? (() => {
                const total = order.subscription?.cups_total ?? 0;
                const rest = Math.max(total - (order.subscription?.cups_used ?? 0), 0);
                return rest > 0
                  ? t("cafe.cashier.balanceLeft", { left: fmtNum(rest), total: fmtNum(total) })
                  : t("cafe.cashier.balanceOut");
              })()
            : t("cafe.cashier.left", { left: fmtNum(left), total: fmtNum(limit) })}
          {days != null ? ` · ${t("cafe.subs.days", { n: fmtNum(days) })}` : ""}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{drinkName || "—"}</div>
        <div className="cafe-muted">
          {timeLabel}
          {branchLabel ? ` · ${branchLabel}` : ""}
        </div>

        {order.selected_options?.length || order.customer_note ? (
          <div className="kob-queue-extras">
            {order.selected_options?.length ? (
              <div>
                <span className="kob-queue-extras-title">
                  {t("cashier.options")}
                </span>
                <ul>
                  {order.selected_options.map((option, index) => (
                    <li key={`${option.option_name_en}-${index}`}>
                      <b>
                        {isAr ? option.group_name_ar : option.group_name_en}:
                      </b>{" "}
                      {isAr ? option.option_name_ar : option.option_name_en}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {order.customer_note ? (
              <div className="kob-queue-note">
                <span className="kob-queue-extras-title">
                  {t("cashier.customerNote")}
                </span>
                <p>{order.customer_note}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="cashier-actions">
        <button
          type="button"
          className="ok"
          disabled={busy}
          onClick={onApprove}
        >
          {t("cafe.cashier.accept")}
        </button>
        <button type="button" className="no" disabled={busy} onClick={onReject}>
          {t("cafe.cashier.reject")}
        </button>
      </div>
    </article>
  );
}

function InProgressOrderCard({
  order,
  busy,
  isAr,
  t,
  timeLabel,
  onReady,
  onHandover,
  onCancelHandover,
}: {
  order: OrderRow;
  busy: boolean;
  isAr: boolean;
  t: Translate;
  timeLabel: string;
  onReady: () => void;
  onHandover: () => void;
  onCancelHandover: () => void;
}) {
  const drinkName = isAr ? order.drink?.name_ar : order.drink?.name_en;
  const stage = order.fulfillment_stage ?? "preparing";

  return (
    <Card tone="raised" className="kob-queue-card" data-kind="order">
      <CardBody>
        <div className="kob-queue-card-top">
          <Badge
            tone={
              stage === "preparing"
                ? "gold"
                : stage === "ready"
                  ? "success"
                  : "info"
            }
          >
            <Coffee className="h-3.5 w-3.5" /> {t(`cashier.stage.${stage}`)}
          </Badge>
          {order.order_number ? <b className="kob-order-no">#{order.order_number}</b> : null}
          <span className="kob-queue-time">{timeLabel}</span>
        </div>

        <div className="kob-queue-headline">
          <span className="kob-queue-headline-icon" aria-hidden>
            <Coffee className="h-7 w-7" />
          </span>
          <div className="kob-min-w-0">
            <span className="kob-queue-headline-label">
              {t("cashier.drink")}
            </span>
            <h3 className="kob-queue-headline-value">{drinkName ?? "—"}</h3>
          </div>
        </div>

        <div className="kob-queue-details">
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label={t("cashier.customer")}
            value={order.customer?.name || "—"}
          />
          <DetailRow
            icon={<Phone className="h-4 w-4" />}
            label={t("cashier.phone")}
            value={order.customer?.phone || "—"}
            mono
          />
        </div>

        {order.selected_options?.length ? (
          <div className="kob-queue-extras">
            <div>
              <span className="kob-queue-extras-title">
                {t("cashier.options")}
              </span>
              <ul>
                {order.selected_options.map((option, index) => (
                  <li key={`${option.option_name_en}-${index}`}>
                    <b>{isAr ? option.group_name_ar : option.group_name_en}:</b>{" "}
                    {isAr ? option.option_name_ar : option.option_name_en}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {stage === "ready" && order.handover_declined_at ? (
          <Alert tone="warning">
            <ShieldAlert className="h-4 w-4" /> {t("cashier.handoverDeclined")}
          </Alert>
        ) : null}

        {stage === "handover" ? (
          <Alert tone="info">{t("cashier.awaitingCustomerConfirm")}</Alert>
        ) : null}

        <div className="kob-queue-actions">
          {stage === "preparing" ? (
            <Button
              size="lg"
              loading={busy}
              disabled={busy}
              onClick={onReady}
              leadingIcon={!busy ? <Check className="h-5 w-5" /> : undefined}
            >
              {t("cashier.markReady")}
            </Button>
          ) : stage === "ready" ? (
            <Button
              size="lg"
              loading={busy}
              disabled={busy}
              onClick={onHandover}
              leadingIcon={!busy ? <BellRing className="h-5 w-5" /> : undefined}
            >
              {t("cashier.handOver")}
            </Button>
          ) : (
            <Button
              variant="ghost"
              loading={busy}
              disabled={busy}
              onClick={onCancelHandover}
              leadingIcon={!busy ? <Undo2 className="h-4 w-4" /> : undefined}
            >
              {t("cashier.cancelHandover")}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function RegistrationCard({
  request,
  busy,
  coupons,
  planMap,
  branchId,
  t,
  selectedCoupon,
  selectedPayment,
  onPaymentChange,
  selectedStartDate,
  timeLabel,
  onCouponChange,
  onStartDateChange,
  onActivate,
  onReject,
}: {
  request: RegistrationRequest;
  busy: boolean;
  coupons: CouponRow[];
  planMap: Map<string, PlanRow>;
  branchId: string;
  t: Translate;
  selectedCoupon: string;
  selectedPayment: PaymentMethod | null;
  onPaymentChange: (method: PaymentMethod) => void;
  selectedStartDate: string;
  timeLabel: string;
  onCouponChange: (couponId: string) => void;
  onStartDateChange: (date: string) => void;
  onActivate: () => void;
  onReject: () => void;
}) {
  const fullName = `${request.first_name} ${request.last_name}`.trim();
  void coupons;
  void branchId;
  const allPlans = Array.from(planMap.values());
  const plan = selectedCoupon ? planMap.get(selectedCoupon) : undefined;
  const isAr =
    typeof document !== "undefined" && document.documentElement.lang === "ar";
  const planLabel = (p: PlanRow) =>
    (isAr ? p.name_ar || p.name : p.name_en || p.name) || "—";

  return (
    <Card tone="raised" className="kob-queue-card" data-kind="registration">
      <CardBody>
        <div className="kob-queue-card-top">
          <Badge tone="info">
            <UserPlus className="h-3.5 w-3.5" /> {t("cashier.registration")}
          </Badge>
          <span className="kob-queue-time">{timeLabel}</span>
        </div>

        <div className="kob-queue-headline">
          <span className="kob-queue-headline-icon" aria-hidden>
            <UserPlus className="h-7 w-7" />
          </span>
          <div className="kob-min-w-0">
            <span className="kob-queue-headline-label">
              {t("cashier.newCustomer")}
            </span>
            <h3 className="kob-queue-headline-value">{fullName || "—"}</h3>
            <span className="kob-queue-phone" dir="ltr">
              {request.phone}
            </span>
          </div>
        </div>

        <div className="kob-queue-form">
          {plan ? (
            <div className="kob-queue-details">
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label={t("cashier.requestedPlan")}
                value={planLabel(plan)}
              />
              <DetailRow
                icon={<Clock3 className="h-4 w-4" />}
                label={t("cashier.duration")}
                value={t("cashier.daysCount", { count: plan.duration_days })}
              />
              <DetailRow
                icon={<Coffee className="h-4 w-4" />}
                label={t("cashier.price")}
                value={`${plan.price} ${plan.currency ?? "SAR"}`}
              />
            </div>
          ) : (
            <Field label={t("cashier.plan")}>
              {() => (
                <Select
                  value={selectedCoupon}
                  disabled={busy}
                  onChange={(event) => onCouponChange(event.target.value)}
                >
                  <option value="">{t("cashier.selectPlan")}</option>
                  {allPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {planLabel(p)} ·{" "}
                      {t("cashier.daysCount", { count: p.duration_days })}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <div
            className="kob-pay-group"
            role="radiogroup"
            aria-label={t("cashier.paymentMethod")}
          >
            <span className="kob-queue-extras-title">
              {t("cashier.paymentMethod")}
            </span>
            <div className="kob-pay-options">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  role="radio"
                  aria-checked={selectedPayment === method}
                  className="kob-pay-option"
                  data-selected={selectedPayment === method || undefined}
                  disabled={busy}
                  onClick={() => onPaymentChange(method)}
                >
                  {t(`cashier.payment.${method}`)}
                </button>
              ))}
            </div>
          </div>

          <Field label={t("cashier.startDate")}>
            {() => (
              <DateInput
                value={selectedStartDate}
                disabled={busy}
                onChange={(event) => onStartDateChange(event.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="kob-queue-actions">
          <Button
            variant="danger"
            disabled={busy}
            onClick={onReject}
            leadingIcon={<X className="h-4 w-4" />}
          >
            {t("cashier.reject")}
          </Button>
          <Button
            size="lg"
            loading={busy}
            disabled={busy || !selectedCoupon || !selectedPayment}
            onClick={onActivate}
            leadingIcon={!busy ? <Check className="h-5 w-5" /> : undefined}
          >
            {t("cashier.confirmPaymentActivate")}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="kob-queue-detail">
      <span className="kob-queue-detail-icon" aria-hidden>
        {icon}
      </span>
      <div className="kob-min-w-0 flex-1">
        <span className="kob-queue-detail-label">{label}</span>
        <span
          className={
            mono ? "kob-queue-detail-value font-mono" : "kob-queue-detail-value"
          }
          dir={mono ? "ltr" : undefined}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

/** 05XXXXXXXX from 05…, 5…, 966…, +966… or 00966…; null if it isn't a Saudi mobile. */
function localSaudiPhone(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00966")) digits = digits.slice(5);
  else if (digits.startsWith("966")) digits = digits.slice(3);
  if (digits.startsWith("5")) digits = `0${digits}`;
  return /^05\d{8}$/.test(digits) ? digits : null;
}

/** Days from today to a "yyyy-MM-dd" end date, the end day included. */
function daysUntil(endDate: string) {
  const today = Date.parse(`${todayLocalISO()}T00:00:00Z`);
  const end = Date.parse(`${endDate.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(end)
    ? 0
    : Math.max(Math.round((end - today) / 86_400_000) + 1, 0);
}

function todayLocalISO() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function friendlyCashierError(message: string, lang: string) {
  if (
    /column|relation|schema|PGRST|permission|JWT|row-level|violates|function/i.test(
      message,
    )
  ) {
    return lang === "ar"
      ? "تعذر تحميل الطلبات. حدّث الصفحة، وإذا استمرّت المشكلة راسل الدعم من حساب المقهى."
      : "Orders could not be loaded. Refresh, and contact support if it continues.";
  }
  return message;
}

function translateActivationError(message: string, t: Translate) {
  if (message.includes("invalid_payment_method"))
    return t("cashier.selectPaymentFirst");
  if (message.includes("coupon_not_available"))
    return t("cashier.errors.couponNotAvailable");
  if (message.includes("coupon_wrong_branch"))
    return t("cashier.errors.couponWrongBranch");
  if (message.includes("registration_already_processed"))
    return t("cashier.errors.registrationProcessed");
  return message;
}
