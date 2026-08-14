import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Coffee,
  Inbox,
  Phone,
  Search,
  Tag,
  User,
  UserPlus,
  X,
} from "lucide-react";


import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/use-auth";
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


export const Route = createFileRoute("/cashier/")({
  component: CashierQueuePage,
});

type QueueFilter = "all" | "orders" | "registrations";

type OrderRow = {
  id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  order_date?: string | null;
  selected_options: Array<{
    group_name_en: string;
    group_name_ar: string;
    option_name_en: string;
    option_name_ar: string;
  }>;
  customer_note: string | null;
  drink: { name_en: string; name_ar: string } | null;
  customer: { name: string; phone: string } | null;
  subscription: {
    id: string;
    end_date: string;
    plan: { name: string; duration_days: number } | null;
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
};

type CouponRow = {
  id: string;
  code: string;
  plan_id: string;
  branch_id: string | null;
  status: string;
};

type PlanRow = { id: string; name: string; duration_days: number };

type QueueItem =
  | { kind: "order"; id: string; createdAt: string; data: OrderRow }
  | { kind: "registration"; id: string; createdAt: string; data: RegistrationRequest };

type LookupResult = {
  found?: boolean;
  customer?: { name?: string | null; phone?: string | null } | null;
  subscription?: {
    plan_name?: string | null;
    end_date?: string | null;
    remaining_days?: number | null;
    status?: string | null;
  } | null;
  used_today?: number | null;
};

function CashierQueuePage() {
  const navigate = useNavigate();
  const { branchId } = useRole();
  const { t, fmtNum, fmtDate, timeAgo, lang } = useI18n();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedCoupons, setSelectedCoupons] = useState<Record<string, string>>({});
  const [selectedStartDates, setSelectedStartDates] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [searchPhone, setSearchPhone] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<LookupResult | null>(null);

  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const loadQueue = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [ordersResult, registrationsResult, couponsResult, plansResult] = await Promise.all([
      supabase
        .from("orders")
        .select(
          `id, status, created_at, order_date, selected_options, customer_note,
           drink:drink_types(name_en, name_ar),
           customer:customers(name, phone),
           subscription:subscriptions(id, end_date, plan:plans(name, duration_days))`,
        )
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("registration_requests")
        .select("id, first_name, last_name, phone, branch_id, preferred_language, status, created_at")
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("coupons")
        .select("id, code, plan_id, branch_id, status")
        .eq("status", "available")
        .or(`branch_id.eq.${branchId},branch_id.is.null`)
        .order("created_at", { ascending: false }),
      supabase.from("plans").select("id, name, duration_days").order("name"),
    ]);

    const firstError =
      ordersResult.error ?? registrationsResult.error ?? couponsResult.error ?? plansResult.error;
    if (firstError) setError(firstError.message);

    setOrders((ordersResult.data ?? []) as unknown as OrderRow[]);
    setRegistrations((registrationsResult.data ?? []) as RegistrationRequest[]);
    setCoupons((couponsResult.data ?? []) as CouponRow[]);
    setPlans((plansResult.data ?? []) as PlanRow[]);
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!branchId) return;
    const intervalId = window.setInterval(() => {
      void loadQueue();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [branchId, loadQueue]);

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === "pending"), [orders]);
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
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filter === "orders") return merged.filter((item) => item.kind === "order");
    if (filter === "registrations") return merged.filter((item) => item.kind === "registration");
    return merged;
  }, [filter, pendingOrders, pendingRegistrations]);

  async function decideOrder(orderId: string, status: "approved" | "rejected") {
    setBusyId(orderId);
    setError(null);
    setSuccess(null);

    const timestamp = new Date().toISOString();
    const updateData =
      status === "approved" ? { status, approved_at: timestamp } : { status, rejected_at: timestamp };

    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("status", "pending");

    setBusyId(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(t(status === "approved" ? "cashier.orderApproved" : "cashier.orderRejected"));
    setOrders((current) => current.filter((order) => order.id !== orderId));
  }

  async function activateRegistration(request: RegistrationRequest) {
    const couponId = selectedCoupons[request.id];
    const startDate = selectedStartDates[request.id] ?? todayLocalISO();

    if (!couponId) {
      setError(t("cashier.selectCouponFirst"));
      return;
    }

    setBusyId(request.id);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc("cashier_activate_registration", {
      _request_id: request.id,
      _coupon_id: couponId,
      _start_date: startDate,
    });

    setBusyId(null);

    if (rpcError) {
      setError(translateActivationError(rpcError.message, t));
      return;
    }

    setRegistrations((current) => current.filter((r) => r.id !== request.id));
    setSelectedCoupons((current) => {
      const next = { ...current };
      delete next[request.id];
      return next;
    });
    setSelectedStartDates((current) => {
      const next = { ...current };
      delete next[request.id];
      return next;
    });
    setSuccess(t("cashier.registrationActivated"));
    await loadQueue();
  }

  async function rejectRegistration(requestId: string) {
    if (!window.confirm(t("cashier.confirmRejectRegistration"))) return;

    setBusyId(requestId);
    setError(null);
    setSuccess(null);

    const { error: rpcError } = await supabase.rpc("cashier_reject_registration", {
      _request_id: requestId,
    });

    setBusyId(null);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setRegistrations((current) => current.filter((r) => r.id !== requestId));
    setSuccess(t("cashier.registrationRejected"));
  }

  async function lookupCustomer() {
    if (!branchId) return;
    const phone = searchPhone.trim();

    if (!/^05\d{8}$/.test(phone)) {
      setSearchError(t("cashier.invalidPhone"));
      setSearchResult(null);
      return;
    }

    setSearchBusy(true);
    setSearchError(null);
    setSearchResult(null);

    const { data, error: lookupError } = await supabase.rpc("scan_lookup", {
      _phone: phone,
      _branch_id: branchId,
    });

    setSearchBusy(false);

    if (lookupError) {
      setSearchError(lookupError.message);
      return;
    }

    const payload = (data ?? null) as LookupResult | null;

    if (!payload?.found || !payload.subscription) {
      setSearchError(t("cashier.noSubscriptionFound"));
      return;
    }

    setSearchResult(payload);
  }

  if (!branchId) {
    return (
      <Card tone="raised" className="mx-auto max-w-md text-center">
        <CardBody>
          <EmptyState
            icon={<Inbox className="h-8 w-8" />}
            title={t("no_branch_h")}
            description={t("no_branch_b")}
            action={
              <Button
                variant="ghost"
                onClick={() => {
                  void supabase.auth.signOut().then(() => navigate({ to: "/auth" }));
                }}
              >
                {t("signOut")}
              </Button>
            }
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="kob-queue-page">


      <StatGrid>
        <StatCard
          label={t("cashier.coffeeOrders")}
          value={fmtNum(pendingOrders.length)}
          hint={t("cashier.awaitingApproval")}
          icon={<Coffee className="h-5 w-5" />}
          tone="gold"
        />
        <StatCard
          label={t("cashier.registrations")}
          value={fmtNum(pendingRegistrations.length)}
          hint={t("cashier.awaitingActivation")}
          icon={<UserPlus className="h-5 w-5" />}
          tone="info"
        />
        <StatCard
          label={t("cashier.totalPending")}
          value={fmtNum(pendingOrders.length + pendingRegistrations.length)}
          hint={t("cashier.liveEveryFiveSeconds")}
          icon={<Inbox className="h-5 w-5" />}
        />
      </StatGrid>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <Card tone="raised">
        <CardHeader
          title={t("cashier.lookupTitle")}
          description={t("cashier.lookupDescription")}
          icon={<Search className="h-4 w-4" />}
        />
        <CardBody>
          <form
            className="kob-queue-lookup"
            onSubmit={(event) => {
              event.preventDefault();
              void lookupCustomer();
            }}
          >
            <PhoneInput
              label={t("cashier.customerPhone")}
              value={searchPhone}
              onValueChange={(next) => {
                setSearchPhone(next);
                setSearchError(null);
              }}
            />
            <Button type="submit" loading={searchBusy} leadingIcon={<Search className="h-4 w-4" />}>
              {t("common.actions.search")}
            </Button>
          </form>

          {searchError ? <Alert tone="warning">{searchError}</Alert> : null}

          {searchResult?.subscription ? (
            <div className="kob-queue-details">
              <DetailRow
                icon={<User className="h-4 w-4" />}
                label={t("cashier.customer")}
                value={searchResult.customer?.name || "—"}
              />
              <DetailRow
                icon={<Tag className="h-4 w-4" />}
                label={t("cashier.plan")}
                value={searchResult.subscription.plan_name || "—"}
              />
              <DetailRow
                icon={<Clock3 className="h-4 w-4" />}
                label={t("cashier.remainingDays")}
                value={
                  searchResult.subscription.remaining_days != null
                    ? fmtNum(searchResult.subscription.remaining_days)
                    : "—"
                }
              />
              <DetailRow
                icon={<Coffee className="h-4 w-4" />}
                label={t("cashier.usedToday")}
                value={fmtNum(searchResult.used_today ?? 0)}
              />
              {searchResult.subscription.end_date ? (
                <DetailRow
                  icon={<Clock3 className="h-4 w-4" />}
                  label={t("cashier.endDate")}
                  value={fmtDate(searchResult.subscription.end_date)}
                />
              ) : null}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card tone="raised">
        <CardHeader
          title={t("cashier.pendingRequests")}
          description={t("cashier.requestsCount", { count: fmtNum(queueItems.length) })}
          icon={<Inbox className="h-4 w-4" />}
          action={
            <Tabs
              ariaLabel={t("cashier.filterLabel")}
              value={filter}
              onChange={(id) => setFilter(id as QueueFilter)}
              items={[
                {
                  id: "all",
                  label: t("cashier.filterAll"),
                  badge: fmtNum(pendingOrders.length + pendingRegistrations.length),
                },
                { id: "orders", label: t("cashier.filterOrders"), badge: fmtNum(pendingOrders.length) },
                {
                  id: "registrations",
                  label: t("cashier.filterRegistrations"),
                  badge: fmtNum(pendingRegistrations.length),
                },
              ]}
            />
          }
        />
        <CardBody>
          {loading && queueItems.length === 0 ? (
            <LoadingState label={t("cashier.loadingRequests")} />
          ) : queueItems.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-8 w-8" />}
              title={t("cashier.emptyTitle")}
              description={t("cashier.emptyDescription")}
            />
          ) : (
            <div className="kob-queue-grid">
              {queueItems.map((item) =>
                item.kind === "order" ? (
                  <CoffeeOrderCard
                    key={`order-${item.id}`}
                    order={item.data}
                    busy={busyId === item.id}
                    isAr={lang === "ar"}
                    t={t}
                    timeLabel={timeAgo(item.createdAt)}
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
                    branchId={branchId}
                    t={t}
                    selectedCoupon={selectedCoupons[item.id] ?? ""}
                    selectedStartDate={selectedStartDates[item.id] ?? todayLocalISO()}
                    timeLabel={timeAgo(item.createdAt)}
                    onCouponChange={(couponId) => {
                      setSelectedCoupons((current) => ({ ...current, [item.id]: couponId }));
                    }}
                    onStartDateChange={(date) => {
                      setSelectedStartDates((current) => ({ ...current, [item.id]: date }));
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
        </CardBody>
      </Card>
    </div>
  );
}

type Translate = (key: string, vars?: Record<string, string | number>) => string;

function CoffeeOrderCard({
  order,
  busy,
  isAr,
  t,
  timeLabel,
  onApprove,
  onReject,
}: {
  order: OrderRow;
  busy: boolean;
  isAr: boolean;
  t: Translate;
  timeLabel: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const drinkName = isAr ? order.drink?.name_ar : order.drink?.name_en;

  return (
    <Card tone="raised" className="kob-queue-card" data-kind="order">
      <CardBody>
        <div className="kob-queue-card-top">
          <Badge tone="gold">
            <Coffee className="h-3.5 w-3.5" /> {t("cashier.coffeeOrder")}
          </Badge>
          <span className="kob-queue-time">{timeLabel}</span>
        </div>

        <div className="kob-queue-headline">
          <span className="kob-queue-headline-icon" aria-hidden>
            <Coffee className="h-7 w-7" />
          </span>
          <div className="kob-min-w-0">
            <span className="kob-queue-headline-label">{t("cashier.drink")}</span>
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
          <DetailRow
            icon={<Tag className="h-4 w-4" />}
            label={t("cashier.plan")}
            value={order.subscription?.plan?.name || "—"}
          />
        </div>

        {order.selected_options?.length || order.customer_note ? (
          <div className="kob-queue-extras">
            {order.selected_options?.length ? (
              <div>
                <span className="kob-queue-extras-title">{t("cashier.options")}</span>
                <ul>
                  {order.selected_options.map((option, index) => (
                    <li key={`${option.option_name_en}-${index}`}>
                      <b>{isAr ? option.group_name_ar : option.group_name_en}:</b>{" "}
                      {isAr ? option.option_name_ar : option.option_name_en}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {order.customer_note ? (
              <div className="kob-queue-note">
                <span className="kob-queue-extras-title">{t("cashier.customerNote")}</span>
                <p>{order.customer_note}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="kob-queue-actions">
          <Button variant="danger" disabled={busy} onClick={onReject} leadingIcon={<X className="h-4 w-4" />}>
            {t("cashier.reject")}
          </Button>
          <Button
            size="lg"
            loading={busy}
            disabled={busy}
            onClick={onApprove}
            leadingIcon={!busy ? <Check className="h-5 w-5" /> : undefined}
          >
            {t("cashier.approveOrder")}
          </Button>
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
  selectedStartDate: string;
  timeLabel: string;
  onCouponChange: (couponId: string) => void;
  onStartDateChange: (date: string) => void;
  onActivate: () => void;
  onReject: () => void;
}) {
  const fullName = `${request.first_name} ${request.last_name}`.trim();
  const availableCoupons = coupons.filter(
    (coupon) => !coupon.branch_id || coupon.branch_id === branchId,
  );

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
            <span className="kob-queue-headline-label">{t("cashier.newCustomer")}</span>
            <h3 className="kob-queue-headline-value">{fullName || "—"}</h3>
            <span className="kob-queue-phone" dir="ltr">
              {request.phone}
            </span>
          </div>
        </div>

        <div className="kob-queue-form">
          <Field label={t("cashier.couponAndPlan")}>
            {() => (
              <Select
                value={selectedCoupon}
                disabled={busy}
                onChange={(event) => onCouponChange(event.target.value)}
              >
                <option value="">{t("cashier.selectCoupon")}</option>
                {availableCoupons.map((coupon) => {
                  const plan = planMap.get(coupon.plan_id);
                  return (
                    <option key={coupon.id} value={coupon.id}>
                      {coupon.code} · {plan?.name ?? "—"} ·{" "}
                      {t("cashier.daysCount", { count: plan?.duration_days ?? 0 })}
                    </option>
                  );
                })}
              </Select>
            )}
          </Field>

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

        {availableCoupons.length === 0 ? (
          <Alert tone="warning">{t("cashier.noCouponsForBranch")}</Alert>
        ) : null}

        <div className="kob-queue-actions">
          <Button variant="danger" disabled={busy} onClick={onReject} leadingIcon={<X className="h-4 w-4" />}>
            {t("cashier.reject")}
          </Button>
          <Button
            size="lg"
            loading={busy}
            disabled={busy || !selectedCoupon}
            onClick={onActivate}
            leadingIcon={!busy ? <Check className="h-5 w-5" /> : undefined}
          >
            {t("cashier.activateSubscription")}
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
        <span className={mono ? "kob-queue-detail-value font-mono" : "kob-queue-detail-value"} dir={mono ? "ltr" : undefined}>
          {value}
        </span>
      </div>
    </div>
  );
}

function todayLocalISO() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function translateActivationError(message: string, t: Translate) {
  if (message.includes("coupon_not_available")) return t("cashier.errors.couponNotAvailable");
  if (message.includes("coupon_wrong_branch")) return t("cashier.errors.couponWrongBranch");
  if (message.includes("registration_already_processed"))
    return t("cashier.errors.registrationProcessed");
  return message;
}
