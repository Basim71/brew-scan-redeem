import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Coffee,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";

import { DrinkSlider } from "@/components/drinks/DrinkSlider";
import type { Drink, DrinkOrderCustomization } from "@/components/drinks/types";
import { supabase } from "@/integrations/supabase/client";
import {
  LanguageSwitcher,
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
  | "showcase"
  | "register"
  | "registration-sent"
  | "phone"
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
    useState<Step>("branch");

  const [branches, setBranches] =
    useState<Branch[]>([]);

  const [branch, setBranch] =
    useState<Branch | null>(null);

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

  const [deviceKnown, setDeviceKnown] =
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

    if (
      !branch ||
      !deviceToken
    ) {
      setStep(
        "showcase",
      );

      return;
    }

    setBusy(true);

    const {
      data,
      error: stateError,
    } = await supabase.rpc(
      "scan_device_state",
      {
        _device_token:
          deviceToken,

        _branch_id:
          branch.id,
      },
    );

    setBusy(false);

    if (stateError) {
      console.error(
        "scan_device_state:",
        stateError,
      );

      setStep(
        "showcase",
      );

      return;
    }

    const state =
      data as
        | DeviceState
        | null;

    const known =
      Boolean(
        state?.known,
      );

    setDeviceKnown(
      known,
    );

    if (known) {
      setStep("phone");
      return;
    }

    setStep(
      "showcase",
    );
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
      "registration-sent",
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

    setError(
      lang === "ar"
        ? "لا يوجد اشتراك نشط لهذا الرقم."
        : "No active subscription was found for this number.",
    );
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
          customization.note || null,
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
    <main
      dir={dir}
      className="flex min-h-screen flex-col items-center overflow-x-hidden px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-cream-dim transition hover:text-caramel-bright"
          >
            <Coffee className="h-5 w-5" />

            <span className="font-display text-xl font-bold tracking-wider gold-text">
              KOB
            </span>
          </Link>

          <LanguageSwitcher />
        </div>

        {step === "branch" && (
          <section className="panel-warm p-7">
            <h1 className="mb-1 font-display text-2xl font-bold text-cream">
              {t("pickBranch")}
            </h1>

            <p className="mb-5 text-sm text-cream-dim">
              {t("scanHint")}
            </p>

            <div className="space-y-2">
              {branches.map(
                (item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setBranch(
                        item,
                      );

                      setError(
                        null,
                      );

                      setStep(
                        "language",
                      );
                    }}
                    className="btn-ghost-brass flex w-full items-center justify-between px-4 py-4 text-start"
                  >
                    <span className="font-semibold text-cream">
                      {lang ===
                      "ar"
                        ? item.name_ar
                        : item.name_en}
                    </span>
                  </button>
                ),
              )}

              {branches.length ===
                0 && (
                <div className="engraved p-4 text-center text-sm text-cream-dim">
                  {lang === "ar"
                    ? "لا توجد فروع متاحة."
                    : "No branches are available."}
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4">
                <ErrorBox
                  message={error}
                />
              </div>
            )}
          </section>
        )}

        {step === "language" &&
          branch && (
          <section className="panel-warm p-7">
            <BackButton
              onClick={() => {
                setError(null);
                setStep("branch");
              }}
              label={t("back")}
            />

            <BranchBadge
              label={branchLabel}
            />

            <h1 className="mb-6 text-center font-display text-2xl font-bold text-cream">
              {t("pickLang")}
            </h1>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void chooseLanguage(
                    "en",
                  );
                }}
                className="btn-brass py-5 font-display text-xl"
              >
                English
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void chooseLanguage(
                    "ar",
                  );
                }}
                className="btn-brass py-5 font-display text-xl"
              >
                العربية
              </button>
            </div>

            {busy && (
              <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-caramel" />
            )}
          </section>
        )}

        {step === "showcase" &&
          branch && (
          <section className="kob-voyager-page">
            <DrinkSlider
              drinks={drinks}
              language={lang}
              mode="showcase"
            />

            {error && (
              <div className="mx-auto mt-4 w-full max-w-sm">
                <ErrorBox
                  message={error}
                />
              </div>
            )}

            <div className="kob-voyager-page-actions">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setStep(
                    "register",
                  );
                }}
                className="btn-brass kob-voyager-register-button"
              >
                <UserPlus className="h-5 w-5" />

                <span>
                  {lang === "ar"
                    ? "تسجيل"
                    : "Register"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setStep(
                    "phone",
                  );
                }}
                className="kob-voyager-existing-button"
              >
                {lang === "ar"
                  ? "لدي اشتراك بالفعل"
                  : "I already have a subscription"}
              </button>
            </div>
          </section>
        )}

        {step === "register" &&
          branch && (
          <section className="panel-warm p-7">
            <BackButton
              onClick={() => {
                setError(null);
                setInfo(null);
                setStep(
                  "showcase",
                );
              }}
              label={t("back")}
            />

            <BranchBadge
              label={branchLabel}
            />

            <h1 className="mb-1 text-center font-display text-2xl font-bold text-cream">
              {lang === "ar"
                ? "طلب تسجيل جديد"
                : "New Registration"}
            </h1>

            <p className="mb-5 text-center text-sm leading-6 text-cream-dim">
              {lang === "ar"
                ? "أدخل بياناتك وسيصل طلب التسجيل إلى كاشير الفرع."
                : "Enter your details and the request will be sent to the branch cashier."}
            </p>

            <form
              onSubmit={
                submitRegistration
              }
              className="space-y-4"
            >
              <Field
                label={
                  lang === "ar"
                    ? "الاسم الأول"
                    : "First name"
                }
              >
                <input
                  type="text"
                  value={
                    firstName
                  }
                  required
                  maxLength={50}
                  autoComplete="given-name"
                  onChange={(
                    event,
                  ) => {
                    setFirstName(
                      event.target
                        .value,
                    );
                  }}
                  className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60"
                />
              </Field>

              <Field
                label={
                  lang === "ar"
                    ? "الاسم الأخير"
                    : "Last name"
                }
              >
                <input
                  type="text"
                  value={
                    lastName
                  }
                  required
                  maxLength={50}
                  autoComplete="family-name"
                  onChange={(
                    event,
                  ) => {
                    setLastName(
                      event.target
                        .value,
                    );
                  }}
                  className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60"
                />
              </Field>

              <PhoneField
                value={phone}
                language={lang}
                onChange={setPhone}
              />

              {error && (
                <ErrorBox
                  message={error}
                />
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-brass flex w-full items-center justify-center gap-2 py-4"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}

                <span>
                  {lang === "ar"
                    ? "إرسال طلب التسجيل"
                    : "Send Registration Request"}
                </span>
              </button>
            </form>
          </section>
        )}

        {step ===
          "registration-sent" && (
          <section className="panel-warm p-8 text-center">
            <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
              <Clock className="h-9 w-9 animate-pulse text-caramel-bright" />
            </div>

            <h1 className="font-display text-2xl font-bold text-cream">
              {lang === "ar"
                ? "تم إرسال طلب التسجيل"
                : "Registration Sent"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-cream-dim">
              {lang === "ar"
                ? "وصلت بياناتك إلى الكاشير. بعد تفعيل الاشتراك امسح الكود مرة أخرى وأدخل رقم جوالك."
                : "Your details were sent to the cashier. Once your subscription is activated, scan the QR code again and enter your phone number."}
            </p>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfo(null);
                setStep("phone");
              }}
              className="btn-ghost-brass mt-6 px-5 py-3"
            >
              {lang === "ar"
                ? "فحص حالة الاشتراك"
                : "Check Subscription Status"}
            </button>
          </section>
        )}

        {step === "phone" &&
          branch && (
          <section className="panel-warm p-7">
            <BackButton
              onClick={() => {
                setError(null);
                setInfo(null);

                setStep(
                  deviceKnown
                    ? "language"
                    : "showcase",
                );
              }}
              label={t("back")}
            />

            <BranchBadge
              label={branchLabel}
            />

            <h1 className="mb-1 text-center font-display text-2xl font-bold text-cream">
              {t("enterPhone")}
            </h1>

            <p className="mb-5 text-center text-sm text-cream-dim">
              {lang === "ar"
                ? "أدخل رقم الجوال المرتبط باشتراكك."
                : "Enter the phone number connected to your subscription."}
            </p>

            <form
              onSubmit={(
                event,
              ) => {
                event.preventDefault();
                void lookup();
              }}
              className="space-y-4"
            >
              <PhoneField
                value={phone}
                language={lang}
                onChange={setPhone}
                large
              />

              {error && (
                <ErrorBox
                  message={error}
                />
              )}

              {info && (
                <InfoBox
                  message={info}
                />
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-brass flex w-full items-center justify-center gap-2 py-4"
              >
                {busy && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                <span>
                  {t("lookup")}
                </span>
              </button>
            </form>
          </section>
        )}

        {step === "menu" &&
          subscription &&
          branch && (
          <div className="space-y-4">
            <section className="panel-warm p-6">
              <BackButton
                onClick={() => {
                  setError(null);
                  setInfo(null);
                  setStep("phone");
                }}
                label={t("back")}
              />

              <div className="engraved p-4">
                <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-cream-dim">
                  {t("planLabel")}
                </div>

                <div className="font-display text-2xl font-bold text-cream">
                  {subscription.plan
                    ?.name ?? "—"}
                </div>

                {customer?.name && (
                  <div className="mt-1 text-sm text-cream-dim">
                    {customer.name}
                  </div>
                )}

                <div className="hairline-divider my-3" />

                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-cream-dim">
                    {t(
                      "branchLabel",
                    )}
                  </span>

                  <span className="text-end text-cream">
                    {branchLabel}
                  </span>
                </div>

                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-sm text-cream-dim">
                    {t(
                      "remainingLabel",
                    )}
                  </span>

                  <span className="font-display text-3xl font-bold gold-text">
                    {fmtNum(
                      daysLeft,
                    )}

                    <span className="font-sans text-sm text-cream-dim">
                      {" "}
                      /{" "}
                      {fmtNum(
                        totalDays,
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </section>

            <section className="kob-order-slider-section">
              <DrinkSlider
                drinks={drinks}
                language={lang}
                mode="order"
                busy={busy}
                canOrder={
                  canOrder
                }
                onOrder={
                  sendOrder
                }
              />

              {!canOrder && (
                <div className="engraved mx-auto mt-4 max-w-sm p-3 text-center text-sm text-cream-dim">
                  {usedToday > 0
                    ? lang === "ar"
                      ? "تم استخدام طلب اليوم بالفعل."
                      : "Today's order has already been used."
                    : daysLeft <= 0
                      ? lang === "ar"
                        ? "انتهت مدة الاشتراك."
                        : "The subscription has expired."
                      : t(
                          "empty_days",
                        )}
                </div>
              )}

              {error && (
                <div className="mx-auto mt-4 max-w-sm">
                  <ErrorBox
                    message={error}
                  />
                </div>
              )}
            </section>
          </div>
        )}

        {step === "waiting" && (
          <section className="panel-warm p-8 text-center">
            {orderStatus ===
              "pending" && (
              <>
                <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                  <Clock className="h-9 w-9 animate-pulse text-caramel-bright" />
                </div>

                <h1 className="mb-2 font-display text-2xl font-bold text-cream">
                  {t("waiting")}
                </h1>

                <p className="text-sm leading-6 text-cream-dim">
                  {t(
                    "waitingHint",
                  )}
                </p>
              </>
            )}

            {orderStatus ===
              "approved" && (
              <>
                <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                  <Check className="h-10 w-10 text-leaf" />
                </div>

                <h1 className="mb-2 font-display text-2xl font-bold text-cream">
                  {t(
                    "approvedMsg",
                  )}
                </h1>

                <p className="text-sm text-cream-dim">
                  {lang === "ar"
                    ? "يتم الآن تجهيز قهوتك."
                    : "Your coffee is now being prepared."}
                </p>
              </>
            )}

            {orderStatus ===
              "rejected" && (
              <>
                <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                  <XCircle className="h-10 w-10 text-[oklch(0.7_0.18_32)]" />
                </div>

                <h1 className="mb-2 font-display text-2xl font-bold text-cream">
                  {t(
                    "rejectedMsg",
                  )}
                </h1>
              </>
            )}

            {orderStatus !==
              "pending" && (
              <button
                type="button"
                onClick={
                  resetOrderScreen
                }
                className="btn-ghost-brass mt-6 px-5 py-2.5 text-sm"
              >
                {orderStatus ===
                "approved"
                  ? lang === "ar"
                    ? "العودة للاشتراك"
                    : "Back to Subscription"
                  : t("newOrder")}
              </button>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function BranchBadge({
  label,
}: {
  label: string;
}) {
  return (
    <div className="engraved mb-5 px-3 py-2 text-center text-xs uppercase tracking-widest text-cream-dim">
      {label}
    </div>
  );
}

function BackButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-1 text-xs text-cream-dim transition hover:text-caramel-bright"
    >
      <ArrowLeft className="h-3.5 w-3.5" />

      <span>
        {label}
      </span>
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-cream-dim">
        {label}
      </span>

      {children}
    </label>
  );
}

type PhoneFieldProps = {
  value: string;
  language:
    | "ar"
    | "en";
  onChange: (
    value: string,
  ) => void;
  large?: boolean;
};

function PhoneField({
  value,
  language,
  onChange,
  large = false,
}: PhoneFieldProps) {
  const input = (
    <input
      type="tel"
      value={value}
      required
      inputMode="numeric"
      autoComplete="tel"
      maxLength={10}
      placeholder="05XXXXXXXX"
      onChange={(event) => {
        onChange(
          normalizePhone(
            event.target.value,
          ),
        );
      }}
      className={
        large
          ? "inset-well w-full px-4 py-4 text-center font-mono text-lg tracking-widest outline-none focus:ring-2 focus:ring-caramel/60"
          : "inset-well w-full px-4 py-3 text-center font-mono tracking-widest outline-none focus:ring-2 focus:ring-caramel/60"
      }
    />
  );

  if (large) {
    return input;
  }

  return (
    <Field
      label={
        language === "ar"
          ? "رقم الجوال"
          : "Phone number"
      }
    >
      {input}
    </Field>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="engraved p-3 text-center text-sm text-[oklch(0.78_0.16_32)]">
      {message}
    </div>
  );
}

function InfoBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-caramel/25 bg-caramel/10 p-3 text-center text-sm text-cream">
      {message}
    </div>
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
