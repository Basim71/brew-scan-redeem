import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Coffee,
  Mail,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";

import {
  Alert,
  Button,
  Input as KobInput,
  OtpInput as KobOtpInput,
  PhoneInput as KobPhoneInput,
} from "@/components/kob";
import { DrinkSlider } from "@/features/drinks/DrinkSlider";
import type { Drink, DrinkOrderCustomization } from "@/features/drinks/types";
import { supabase } from "@/integrations/supabase/client";
import { requestScanOtp, verifyScanOtp } from "@/lib/scan-otp.functions";
import {
  useI18n,
} from "@/lib/i18n";



export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      {
        title: "Scan · KOB",
      },
      {
        name: "description",
        content:
          "Scan a KOB branch, register, access your subscription, and order coffee.",
      },
    ],
  }),

  component: ScanPage,
});

type Step =
  | "branch"
  | "language"
  | "plans"
  | "register"
  | "registration-sent"
  | "phone"
  | "otp"
  | "menu"
  | "waiting";


type Branch = {
  id: string;
  name_en: string;
  name_ar: string;
};

type Plan = {
  id: string;
  name: string;
  duration_days: number;
};

type PublicPlan = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  duration_days: number;
  price: number;
  currency: string | null;
};

type Subscription = {
  id: string;
  customer_id?: string | null;
  plan_id?: string | null;
  branch_id?: string | null;
  start_date: string;
  end_date: string;
  status: string;
  plan: Plan | null;
};

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
};

type DeviceState = {
  known: boolean;
  pending: boolean;
};

type RegistrationStatus = {
  found: boolean;

  status:
    | "pending"
    | "approved"
    | "rejected"
    | null;
};

type LookupPayload = {
  found: boolean;
  customer?: Customer | null;
  subscription?: Subscription | null;
  used_today?: number;
};

type OrderStatus =
  | "pending"
  | "approved"
  | "rejected";

const DEVICE_TOKEN_KEY =
  "kob_device_token";

function ScanPage() {
  const {
    t,
    lang,
    setLang,
    dir,
    fmtNum,
  } = useI18n();

  const [step, setStep] =
    useState<Step>("language");

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [branch, setBranch] =
    useState<Branch | null>(null);

  const [plans, setPlans] =
    useState<PublicPlan[]>([]);

  const [selectedPlanId, setSelectedPlanId] =
    useState<string | null>(null);

  const [drinks, setDrinks] =
    useState<Drink[]>([]);

  const [phone, setPhone] =
    useState("");

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [subscription, setSubscription] =
    useState<Subscription | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [usedToday, setUsedToday] =
    useState(0);

  const [deviceToken, setDeviceToken] =
    useState("");

  const [, setDeviceKnown] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [info, setInfo] =
    useState<string | null>(null);

  const [orderId, setOrderId] =
    useState<string | null>(null);

  const [orderStatus, setOrderStatus] =
    useState<OrderStatus>("pending");

  const [branding, setBranding] =
    useState<{
      name_ar: string | null;
      name_en: string | null;
      logo_url: string | null;
    } | null>(null);

  useEffect(() => {
    const branchId = branch?.id;
    if (!branchId) {
      setBranding(null);
      return;
    }
    let cancelled = false;
    void supabase
      .rpc("scan_branding" as never, {
        _branch_id: branchId,
      } as never)
      .then(({ data }) => {
        if (cancelled) return;
        const row = data as
          | {
              organization_name_ar?: string | null;
              organization_name_en?: string | null;
              logo_url?: string | null;
            }
          | null;
        setBranding(
          row
            ? {
                name_ar: row.organization_name_ar ?? null,
                name_en: row.organization_name_en ?? null,
                logo_url: row.logo_url ?? null,
              }
            : null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [branch?.id]);

  const brandName =
    (lang === "ar"
      ? branding?.name_ar || branding?.name_en
      : branding?.name_en || branding?.name_ar) || "KOB";

  const branchLabel = useMemo(() => {
    if (!branch) {
      return "";
    }

    return lang === "ar"
      ? branch.name_ar
      : branch.name_en;
  }, [
    branch,
    lang,
  ]);

  const totalDays =
    subscription?.plan?.duration_days ??
    0;

  const elapsedDays = subscription
    ? daysBetween(
        subscription.start_date,
        todayLocalISO(),
      )
    : 0;

  const daysLeft =
    subscription
      ? Math.max(
          0,
          totalDays -
            elapsedDays,
        )
      : 0;

  const daysUsed = subscription
    ? Math.min(
        totalDays,
        Math.max(0, elapsedDays),
      )
    : 0;

  const usedPct =
    totalDays > 0
      ? Math.min(
          100,
          Math.round(
            (daysUsed / totalDays) * 100,
          ),
        )
      : 0;

  const canOrder =
    Boolean(subscription) &&
    subscription?.status ===
      "active" &&
    usedToday === 0 &&
    daysLeft > 0;

  useEffect(() => {
    setDeviceToken(
      getOrCreateDeviceToken(),
    );
  }, []);

  useEffect(() => {
    void loadBranches();
  }, []);

  useEffect(() => {
    if (!branch) {
      setDrinks([]);
      return;
    }

    void loadDrinks();
  }, [
    branch,
    lang,
  ]);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    const intervalId =
      window.setInterval(
        async () => {
          const {
            data,
            error:
              statusError,
          } =
            await supabase.rpc(
              "scan_order_status",
              {
                _order_id:
                  orderId,
              },
            );

          if (statusError) {
            console.error(
              "scan_order_status:",
              statusError,
            );

            return;
          }

          if (
            data ===
              "pending" ||
            data ===
              "approved" ||
            data ===
              "rejected"
          ) {
            setOrderStatus(
              data,
            );

            if (
              data ===
              "approved"
            ) {
              setUsedToday(1);
            }
          }
        },
        2000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [orderId]);

  async function loadBranches() {
    setError(null);

    const {
      data,
      error: branchesError,
    } = await supabase
      .from("branches")
      .select(
        "id,name_en,name_ar",
      )
      .order("name_en");

    if (branchesError) {
      console.error(
        "Failed to load branches:",
        branchesError,
      );

      setBranches([]);

      setError(
        lang === "ar"
          ? "تعذر تحميل الفروع."
          : "Unable to load branches.",
      );

      return;
    }

    const branchList =
      (data ?? []) as Branch[];

    setBranches(
      branchList,
    );

    const currentUrl =
      new URL(
        window.location.href,
      );

    const branchId =
      currentUrl.searchParams.get(
        "branch",
      );

    if (!branchId) {
      return;
    }

    const matchedBranch =
      branchList.find(
        (item) =>
          item.id ===
          branchId,
      );

    if (!matchedBranch) {
      return;
    }

    setBranch(
      matchedBranch,
    );

    setStep(
      "language",
    );
  }

  async function loadDrinks() {
    setError(null);

    const {
      data,
      error: drinksError,
    } = await supabase
      .from("drink_types")
      .select(
        `
          id,
          name_en,
          name_ar,
          is_active,
          image_url,
          calories,
          allergens,
          option_groups:drink_option_groups(
            id,
            drink_type_id,
            name_en,
            name_ar,
            selection_type,
            is_required,
            sort_order,
            options:drink_options(
              id,
              group_id,
              name_en,
              name_ar,
              is_active,
              sort_order
            )
          )
        `,
      )
      .eq("is_active", true)
      .order("name_en");

    if (drinksError) {
      console.error(
        "Failed to load drinks:",
        drinksError,
      );

      setDrinks([]);

      setError(
        lang === "ar"
          ? "تعذر تحميل المشروبات."
          : "Unable to load drinks.",
      );

      return;
    }

    setDrinks(
      (data ?? []) as Drink[],
    );
  }

  async function chooseLanguage(
    selectedLanguage:
      | "ar"
      | "en",
  ) {
    setLang(
      selectedLanguage,
    );

    setError(null);
    setInfo(null);

    const resolvedBranch =
      branch ??
      (branches.length === 1
        ? branches[0]
        : null);

    if (!resolvedBranch) {
      setStep("branch");
      return;
    }

    if (!branch) {
      setBranch(resolvedBranch);
    }

    await continueWithBranch(resolvedBranch);
  }

  async function continueWithBranch(target: Branch) {
    setError(null);
    setInfo(null);

    if (deviceToken) {
      setBusy(true);

      const { data, error: stateError } = await supabase.rpc("scan_device_state", {
        _device_token: deviceToken,
        _branch_id: target.id,
      });

      setBusy(false);

      if (stateError) {
        console.error("scan_device_state:", stateError);
      } else {
        const state = data as DeviceState | null;
        setDeviceKnown(Boolean(state?.known));
      }
    }

    setStep("phone");
  }

  async function submitRegistration(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!branch) {
      return;
    }

    const normalizedPhone =
      normalizePhone(phone);

    if (
      firstName.trim().length <
        2 ||
      lastName.trim().length <
        2
    ) {
      setError(
        lang === "ar"
          ? "يرجى إدخال الاسم الأول والأخير."
          : "Please enter your first and last name.",
      );

      return;
    }

    if (
      !isValidSaudiPhone(
        normalizedPhone,
      )
    ) {
      setError(
        lang === "ar"
          ? "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام."
          : "Phone number must start with 05 and contain 10 digits.",
      );

      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    const {
      error:
        registrationError,
    } = await supabase.rpc(
      "scan_register_request",
      {
        _first_name:
          firstName.trim(),

        _last_name:
          lastName.trim(),

        _phone:
          normalizedPhone,

        _branch_id:
          branch.id,

        _device_token:
          deviceToken,

        _preferred_language:
          lang,

        _user_agent:
          navigator.userAgent,
      },
    );

    setBusy(false);

    if (registrationError) {
      console.error(
        "scan_register_request:",
        registrationError,
      );

      setError(
        translateRegistrationError(
          registrationError.message,
          lang,
        ),
      );

      return;
    }

    setPhone(
      normalizedPhone,
    );

    setDeviceKnown(true);

    setStep(
      "plans",
    );

    void loadPlans();
  }

  async function loadPlans() {
    const { data, error: plansError } = await supabase
      .from("plans")
      .select(
        "id,name_ar,name_en,description_ar,description_en,duration_days,price,currency,is_active,is_hidden,display_order",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (plansError) {
      console.error("Failed to load plans:", plansError);
      setPlans([]);
      return;
    }

    setPlans(
      ((data ?? []) as (PublicPlan & { is_hidden?: boolean })[]).filter(
        (plan) => !plan.is_hidden,
      ),
    );
  }

  async function lookup() {
    if (!branch) {
      return;
    }

    const normalizedPhone =
      normalizePhone(phone);

    if (
      !isValidSaudiPhone(
        normalizedPhone,
      )
    ) {
      setError(
        lang === "ar"
          ? "أدخل رقم جوال صحيح يبدأ بـ 05."
          : "Enter a valid phone number starting with 05.",
      );

      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    const {
      data,
      error: lookupError,
    } = await supabase.rpc(
      "scan_lookup",
      {
        _phone:
          normalizedPhone,

        _branch_id:
          branch.id,
      },
    );

    const payload =
      data as
        | LookupPayload
        | null;

    if (
      !lookupError &&
      payload?.found &&
      payload.subscription
    ) {
      setPhone(
        normalizedPhone,
      );

      setCustomer(
        payload.customer ??
          null,
      );

      setSubscription(
        payload.subscription,
      );

      setUsedToday(
        payload.used_today ??
          0,
      );

      setBusy(false);

      setStep(
        "menu",
      );

      return;
    }

    if (lookupError) {
      console.error(
        "scan_lookup:",
        lookupError,
      );
    }

    const {
      data:
        registrationData,
      error:
        registrationStatusError,
    } = await supabase.rpc(
      "scan_registration_status",
      {
        _phone:
          normalizedPhone,

        _branch_id:
          branch.id,

        _device_token:
          deviceToken,
      },
    );

    setBusy(false);

    if (
      registrationStatusError
    ) {
      console.error(
        "scan_registration_status:",
        registrationStatusError,
      );
    }

    const registration =
      registrationData as
        | RegistrationStatus
        | null;

    if (
      registration?.status ===
      "pending"
    ) {
      setInfo(
        lang === "ar"
          ? "طلب تسجيلك بانتظار موافقة الكاشير."
          : "Your registration request is waiting for cashier approval.",
      );

      return;
    }

    if (
      registration?.status ===
      "rejected"
    ) {
      setError(
        lang === "ar"
          ? "تم رفض طلب التسجيل. يرجى التواصل مع الكاشير."
          : "Your registration request was rejected. Please contact the cashier.",
      );

      return;
    }

    setPhone(normalizedPhone);
    setError(null);
    setInfo(
      lang === "ar"
        ? "لا يوجد اشتراك لهذا الرقم، أكمل التسجيل."
        : "No subscription for this number — complete your registration.",
    );
    setStep("register");
  }

  async function sendOrder(
    drink: Drink,
    customization: DrinkOrderCustomization,
  ) {
    if (
      !subscription ||
      !branch
    ) {
      return;
    }

    if (!canOrder) {
      setError(
        lang === "ar"
          ? "لا يمكنك إرسال طلب جديد الآن."
          : "You cannot place another order right now.",
      );

      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);

    const {
      data,
      error: orderError,
    } = await supabase.rpc(
      "scan_submit_order",
      {
        _phone:
          normalizePhone(
            phone,
          ),

        _branch_id:
          branch.id,

        _drink_type_id:
          drink.id,

        _selected_option_ids:
          customization.selectedOptionIds,

        _customer_note:
          customization.note || undefined,
      },
    );

    setBusy(false);

    if (
      orderError ||
      !data
    ) {
      console.error(
        "scan_submit_order:",
        orderError,
      );

      setError(
        translateOrderError(
          orderError?.message ??
            "",
          lang,
        ),
      );

      return;
    }

    setOrderId(
      data as string,
    );

    setOrderStatus(
      "pending",
    );

    setStep(
      "waiting",
    );
  }

  function resetOrderScreen() {
    setOrderId(null);
    setOrderStatus(
      "pending",
    );
    setError(null);
    setInfo(null);
    setStep("menu");
  }

  return (
    <main dir={dir} className="kob-scan">
      <div className="kob-scan-shell">
        {step === "branch" && (

          <section className="kob-scan-card">
            <h1 className="kob-scan-title">{t("pickBranch")}</h1>
            <p className="kob-scan-sub">{t("scanHint")}</p>

            <div className="kob-scan-body">
              {branches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="kob-scan-branch"
                  onClick={() => {
                    setBranch(item);
                    setError(null);
                    void continueWithBranch(item);
                  }}
                >
                  <span>{lang === "ar" ? item.name_ar : item.name_en}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              ))}

              {branches.length === 0 && (
                <div className="kob-scan-well text-center text-sm">
                  {lang === "ar" ? "لا توجد فروع متاحة." : "No branches are available."}
                </div>
              )}

              {error && <Alert tone="danger">{error}</Alert>}
            </div>
          </section>
        )}

        {step === "language" && (
          <section className="kob-scan-card" data-center="true">
            <div className="kob-scan-brandmark">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt={brandName} />
              ) : (
                <span className="kob-scan-brand-fallback" aria-hidden>
                  <Coffee className="h-6 w-6" />
                </span>
              )}
              <span className="kob-scan-brandmark-name">{brandName}</span>
            </div>

            {branch && <BranchBadge label={branchLabel} />}

            <h1 className="kob-scan-title">{t("pickLang")}</h1>

            <div className="kob-scan-body kob-scan-lang-grid">
              <Button
                size="lg"
                loading={busy}
                onClick={() => {
                  void chooseLanguage("en");
                }}
              >
                English
              </Button>

              <Button
                size="lg"
                loading={busy}
                onClick={() => {
                  void chooseLanguage("ar");
                }}
              >
                العربية
              </Button>
            </div>
          </section>
        )}

        {step === "plans" && (
          <section className="kob-scan-card">
            <BranchBadge label={branchLabel} />

            <div className="text-center">
              <h1 className="kob-scan-title">
                {lang === "ar" ? "اختر الباقة" : "Choose your plan"}
              </h1>
              <p className="kob-scan-sub">
                {lang === "ar"
                  ? "اختر الباقة المناسبة وسيقوم الكاشير بتفعيلها لك."
                  : "Pick the plan you want and the cashier will activate it for you."}
              </p>
            </div>

            <div className="kob-scan-body">
              {plans.map((plan) => {
                const planName =
                  (lang === "ar" ? plan.name_ar || plan.name_en : plan.name_en || plan.name_ar) ??
                  "—";
                const planDesc =
                  lang === "ar"
                    ? plan.description_ar || plan.description_en
                    : plan.description_en || plan.description_ar;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    className="kob-scan-branch"
                    data-selected={plan.id === selectedPlanId || undefined}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setStep("registration-sent");
                    }}
                  >
                    <span className="flex flex-col items-start gap-1 text-start">
                      <strong>{planName}</strong>
                      <small>
                        {fmtNum(plan.duration_days)} {lang === "ar" ? "يوم" : "days"} ·{" "}
                        {fmtNum(plan.price)} {plan.currency ?? "SAR"}
                      </small>
                      {planDesc && <small>{planDesc}</small>}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              })}

              {plans.length === 0 && (
                <div className="kob-scan-well text-center text-sm">
                  {lang === "ar" ? "لا توجد باقات متاحة حاليًا." : "No plans are available yet."}
                </div>
              )}

              {error && <Alert tone="danger">{error}</Alert>}
            </div>
          </section>
        )}

        {step === "register" && branch && (
          <section className="kob-scan-card">
            <BackButton
              onClick={() => {
                setError(null);
                setInfo(null);
                setStep("phone");
              }}
              label={t("back")}
            />

            <BranchBadge label={branchLabel} />

            <div className="text-center">
              <h1 className="kob-scan-title">
                {lang === "ar" ? "طلب تسجيل جديد" : "New Registration"}
              </h1>
              <p className="kob-scan-sub">
                {lang === "ar"
                  ? "أدخل بياناتك وسيصل طلب التسجيل إلى كاشير الفرع."
                  : "Enter your details and the request will be sent to the branch cashier."}
              </p>
            </div>

            <form onSubmit={submitRegistration} className="kob-scan-body">
              <KobInput
                label={lang === "ar" ? "الاسم الأول" : "First name"}
                type="text"
                value={firstName}
                required
                maxLength={50}
                autoComplete="given-name"
                onChange={(event) => {
                  setFirstName(event.target.value);
                }}
              />

              <KobInput
                label={lang === "ar" ? "الاسم الأخير" : "Last name"}
                type="text"
                value={lastName}
                required
                maxLength={50}
                autoComplete="family-name"
                onChange={(event) => {
                  setLastName(event.target.value);
                }}
              />

              <KobPhoneInput
                label={lang === "ar" ? "رقم الجوال" : "Phone number"}
                value={phone}
                onValueChange={setPhone}
              />

              {info && <Alert tone="info">{info}</Alert>}

              {error && <Alert tone="danger">{error}</Alert>}

              <Button
                type="submit"
                block
                size="lg"
                loading={busy}
                leadingIcon={<UserPlus className="h-4 w-4" />}
              >
                {lang === "ar" ? "إرسال طلب التسجيل" : "Send Registration Request"}
              </Button>
            </form>
          </section>
        )}

        {step === "registration-sent" && (
          <section className="kob-scan-card" data-center="true">
            <div className="kob-scan-icon-badge">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>

            <h1 className="kob-scan-title">
              {lang === "ar" ? "تم إرسال طلب التسجيل" : "Registration Sent"}
            </h1>

            <p className="kob-scan-sub">
              {lang === "ar"
                ? "وصلت بياناتك إلى الكاشير. بعد تفعيل الاشتراك امسح الكود مرة أخرى وأدخل رقم جوالك."
                : "Your details were sent to the cashier. Once your subscription is activated, scan the QR code again and enter your phone number."}
            </p>

            <div className="kob-scan-actions">
              <Button
                variant="secondary"
                block
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setStep("phone");
                }}
              >
                {lang === "ar" ? "فحص حالة الاشتراك" : "Check Subscription Status"}
              </Button>
            </div>
          </section>
        )}

        {step === "phone" && branch && (
          <section className="kob-scan-card">
            <BackButton
              onClick={() => {
                setError(null);
                setInfo(null);
                setStep(branches.length > 1 ? "branch" : "language");
              }}
              label={t("back")}
            />

            <BranchBadge label={branchLabel} />

            <div className="text-center">
              <h1 className="kob-scan-title">{t("enterPhone")}</h1>
              <p className="kob-scan-sub">
                {lang === "ar"
                  ? "أدخل رقم الجوال المرتبط باشتراكك."
                  : "Enter the phone number connected to your subscription."}
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void lookup();
              }}
              className="kob-scan-body"
            >
              <KobPhoneInput value={phone} onValueChange={setPhone} />

              {error && <Alert tone="danger">{error}</Alert>}

              {info && <Alert tone="info">{info}</Alert>}

              <Button type="submit" block size="lg" loading={busy}>
                {t("lookup")}
              </Button>
            </form>
          </section>
        )}

        {step === "menu" && subscription && branch && (
          <div className="flex flex-col gap-4">
            <section className="kob-scan-card">
              <BackButton
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setStep("phone");
                }}
                label={t("back")}
              />

              <div className="kob-mcard">
                <div className="kob-mcard-sheen" aria-hidden="true" />

                <div className="kob-mcard-head">
                  <div>
                    <div className="kob-mcard-label">{t("planLabel")}</div>
                    <div className="kob-mcard-plan">{subscription.plan?.name ?? "—"}</div>
                  </div>
                  <div className="kob-mcard-seal" aria-hidden="true">
                    KOB
                  </div>
                </div>

                {customer?.name && <div className="kob-mcard-holder">{customer.name}</div>}

                <div className="kob-mcard-chip" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>

                <div className="kob-mcard-counter">
                  <span className="kob-mcard-label">
                    {lang === "ar" ? "الأيام المستخدمة" : "Days used"}
                  </span>
                  <span className="kob-mcard-days">
                    {fmtNum(daysUsed)}
                    <small> / {fmtNum(totalDays)}</small>
                  </span>
                </div>

                <div className="kob-mcard-track" role="presentation">
                  <div className="kob-mcard-fill" style={{ width: `${usedPct}%` }} />
                </div>

                <div className="kob-mcard-foot">
                  <div>
                    <div className="kob-mcard-label">{t("branchLabel")}</div>
                    <strong>{branchLabel}</strong>
                  </div>
                  <div className="text-end">
                    <div className="kob-mcard-label">{t("remainingLabel")}</div>
                    <strong>
                      {fmtNum(daysLeft)} {lang === "ar" ? "يوم" : "days"}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="kob-order-slider-section">
              <DrinkSlider
                drinks={drinks}
                language={lang}
                mode="order"
                busy={busy}
                canOrder={canOrder}
                onOrder={sendOrder}
              />

              {!canOrder && (
                <div className="kob-scan-note">
                  {usedToday > 0
                    ? lang === "ar"
                      ? "تم استخدام طلب اليوم بالفعل."
                      : "Today's order has already been used."
                    : daysLeft <= 0
                      ? lang === "ar"
                        ? "انتهت مدة الاشتراك."
                        : "The subscription has expired."
                      : t("empty_days")}
                </div>
              )}

              {error && (
                <div className="mx-auto mt-4 max-w-sm">
                  <Alert tone="danger">{error}</Alert>
                </div>
              )}
            </section>
          </div>
        )}

        {step === "waiting" && (
          <section className="kob-scan-card" data-center="true">
            {orderStatus === "pending" && (
              <>
                <div className="kob-scan-icon-badge">
                  <Clock className="h-8 w-8 animate-pulse" />
                </div>

                <h1 className="kob-scan-title">{t("waiting")}</h1>
                <p className="kob-scan-sub">{t("waitingHint")}</p>
              </>
            )}

            {orderStatus === "approved" && (
              <>
                <div className="kob-scan-icon-badge" data-tone="ok">
                  <Check className="h-9 w-9" />
                </div>

                <h1 className="kob-scan-title">{t("approvedMsg")}</h1>
                <p className="kob-scan-sub">
                  {lang === "ar" ? "يتم الآن تجهيز قهوتك." : "Your coffee is now being prepared."}
                </p>
              </>
            )}

            {orderStatus === "rejected" && (
              <>
                <div className="kob-scan-icon-badge" data-tone="error">
                  <XCircle className="h-9 w-9" />
                </div>

                <h1 className="kob-scan-title">{t("rejectedMsg")}</h1>
              </>
            )}

            {orderStatus !== "pending" && (
              <div className="kob-scan-actions">
                <Button variant="secondary" block onClick={resetOrderScreen}>
                  {orderStatus === "approved"
                    ? lang === "ar"
                      ? "العودة للاشتراك"
                      : "Back to Subscription"
                    : t("newOrder")}
                </Button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function BranchBadge({ label }: { label: string }) {
  return <span className="kob-scan-eyebrow">{label}</span>;
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mb-3 -ms-2"
      leadingIcon={<ArrowLeft className="h-3.5 w-3.5" />}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function getOrCreateDeviceToken() {
  const existingToken =
    window.localStorage.getItem(
      DEVICE_TOKEN_KEY,
    );

  if (existingToken) {
    return existingToken;
  }

  const generatedToken =
    typeof crypto !==
      "undefined" &&
    typeof crypto.randomUUID ===
      "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  window.localStorage.setItem(
    DEVICE_TOKEN_KEY,
    generatedToken,
  );

  return generatedToken;
}

function normalizePhone(
  value: string,
) {
  return value
    .replace(/\D/g, "")
    .slice(0, 10);
}

function isValidSaudiPhone(
  value: string,
) {
  return /^05\d{8}$/.test(
    value,
  );
}

function translateRegistrationError(
  message: string,
  language:
    | "ar"
    | "en",
) {
  if (
    message.includes(
      "invalid_phone",
    )
  ) {
    return language === "ar"
      ? "رقم الجوال غير صحيح."
      : "The phone number is invalid.";
  }

  if (
    message.includes(
      "invalid_name",
    )
  ) {
    return language === "ar"
      ? "الاسم الأول أو الأخير غير صحيح."
      : "The first or last name is invalid.";
  }

  if (
    message.includes(
      "invalid_request",
    )
  ) {
    return language === "ar"
      ? "بيانات الطلب غير مكتملة."
      : "The registration request is incomplete.";
  }

  return language === "ar"
    ? "تعذر إرسال طلب التسجيل."
    : "Unable to send the registration request.";
}

function translateOrderError(
  message: string,
  language:
    | "ar"
    | "en",
) {
  if (
    message.includes(
      "already_used",
    ) ||
    message.includes(
      "already ordered",
    )
  ) {
    return language === "ar"
      ? "تم استخدام طلب اليوم بالفعل."
      : "Today's order has already been used.";
  }

  if (
    message.includes(
      "subscription",
    )
  ) {
    return language === "ar"
      ? "لا يوجد اشتراك فعال يسمح بإرسال الطلب."
      : "No active subscription allows this order.";
  }

  if (
    message.includes(
      "drink",
    )
  ) {
    return language === "ar"
      ? "المشروب غير متاح حاليًا."
      : "The selected drink is currently unavailable.";
  }

  return language === "ar"
    ? "تعذر إرسال طلب القهوة."
    : "Unable to submit the coffee order.";
}

function daysBetween(
  startDate: string,
  currentDate: string,
) {
  const start =
    new Date(
      `${startDate}T00:00:00`,
    );

  const current =
    new Date(
      `${currentDate}T00:00:00`,
    );

  const milliseconds =
    current.getTime() -
    start.getTime();

  return Math.max(
    0,
    Math.floor(
      milliseconds /
        86400000,
    ),
  );
}

function todayLocalISO() {
  const currentDate =
    new Date();

  const timezoneOffset =
    currentDate.getTimezoneOffset();

  return new Date(
    currentDate.getTime() -
      timezoneOffset *
        60000,
  )
    .toISOString()
    .slice(0, 10);
}
