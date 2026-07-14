import { createFileRoute, Link } from "@tanstack/react-router";
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

import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

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
  customer_id?: string;
  plan_id?: string;
  branch_id?: string;
  start_date: string;
  end_date: string;
  status: string;
  plan: Plan | null;
};

type Customer = {
  id: string;
  name: string;
};

type Drink = {
  id: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  image_url: string | null;
};

type DeviceState = {
  known: boolean;
  pending: boolean;
};

type RegistrationStatus = {
  found: boolean;
  status: "pending" | "approved" | "rejected" | null;
};

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan · KOB" },
      {
        name: "description",
        content:
          "Scan a KOB branch, view available drinks, register, and order coffee.",
      },
    ],
  }),
  component: ScanPage,
});

const DEVICE_TOKEN_KEY = "kob_device_token";

function ScanPage() {
  const { t, lang, setLang, dir, fmtNum } = useI18n();

  const [step, setStep] = useState<Step>("branch");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sub, setSub] = useState<Subscription | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [usedToday, setUsedToday] = useState(0);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [deviceToken, setDeviceToken] = useState("");
  const [deviceKnown, setDeviceKnown] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");

  const branchLabel = useMemo(() => {
    if (!branch) return "";
    return lang === "ar" ? branch.name_ar : branch.name_en;
  }, [branch, lang]);

  useEffect(() => {
    setDeviceToken(getOrCreateDeviceToken());
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
  }, [branch]);

  useEffect(() => {
    if (!orderId) return;

    const intervalId = window.setInterval(async () => {
      const { data } = await supabase.rpc("scan_order_status", {
        _order_id: orderId,
      });

      if (data && data !== orderStatus) {
        setOrderStatus(data as "pending" | "approved" | "rejected");
      }
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [orderId, orderStatus]);

  async function loadBranches() {
    const { data, error } = await supabase
      .from("branches")
      .select("id,name_en,name_ar")
      .eq("is_active", true)
      .order("name_en");

    if (error) {
      console.error("Failed to load branches:", error);
      return;
    }

    const list = (data ?? []) as Branch[];
    setBranches(list);

    const url = new URL(window.location.href);
    const branchId = url.searchParams.get("branch");

    if (!branchId) return;

    const matchedBranch = list.find((item) => item.id === branchId);

    if (matchedBranch) {
      setBranch(matchedBranch);
      setStep("language");
    }
  }

  async function loadDrinks() {
    const { data, error } = await supabase
      .from("drink_types")
      .select("id,name_en,name_ar,is_active,image_url")
      .eq("is_active", true)
      .order("name_en");

    if (error) {
      console.error("Failed to load drinks:", error);
      setDrinks([]);
      setErr(
        lang === "ar"
          ? "تعذر تحميل المشروبات."
          : "Unable to load drinks.",
      );
      return;
    }

    setDrinks((data ?? []) as Drink[]);
  }

  async function chooseLanguage(selectedLanguage: "ar" | "en") {
    setLang(selectedLanguage);
    setErr(null);
    setInfo(null);

    if (!branch || !deviceToken) {
      setStep("showcase");
      return;
    }

    setBusy(true);

    const { data, error } = await supabase.rpc("scan_device_state", {
      _device_token: deviceToken,
      _branch_id: branch.id,
    });

    setBusy(false);

    if (error) {
      console.error("scan_device_state:", error);
      setStep("showcase");
      return;
    }

    const payload = data as DeviceState | null;
    const known = Boolean(payload?.known);
    setDeviceKnown(known);
    setStep(known ? "phone" : "showcase");
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!branch) return;

    const normalizedPhone = normalizePhone(phone);

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setErr(
        lang === "ar"
          ? "يرجى إدخال الاسم الأول والأخير."
          : "Please enter your first and last name.",
      );
      return;
    }

    if (!/^05\d{8}$/.test(normalizedPhone)) {
      setErr(
        lang === "ar"
          ? "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام."
          : "Phone number must start with 05 and contain 10 digits.",
      );
      return;
    }

    setBusy(true);
    setErr(null);

    const { error } = await supabase.rpc("scan_register_request", {
      _first_name: firstName.trim(),
      _last_name: lastName.trim(),
      _phone: normalizedPhone,
      _branch_id: branch.id,
      _device_token: deviceToken,
      _preferred_language: lang,
      _user_agent: navigator.userAgent,
    });

    setBusy(false);

    if (error) {
      console.error("scan_register_request:", error);
      setErr(translateRegistrationError(error.message, lang));
      return;
    }

    setPhone(normalizedPhone);
    setDeviceKnown(true);
    setStep("registration-sent");
  }

  async function lookup() {
    if (!branch) return;

    const normalizedPhone = normalizePhone(phone);

    if (!/^05\d{8}$/.test(normalizedPhone)) {
      setErr(
        lang === "ar"
          ? "أدخل رقم جوال صحيح يبدأ بـ 05."
          : "Enter a valid phone number starting with 05.",
      );
      return;
    }

    setBusy(true);
    setErr(null);
    setInfo(null);

    const { data, error } = await supabase.rpc("scan_lookup", {
      _phone: normalizedPhone,
      _branch_id: branch.id,
    });

    const payload = data as
      | {
          found: boolean;
          customer?: Customer;
          subscription?: Subscription;
          used_today?: number;
        }
      | null;

    if (!error && payload?.found) {
      setPhone(normalizedPhone);
      setCustomer(payload.customer ?? null);
      setSub(payload.subscription ?? null);
      setUsedToday(payload.used_today ?? 0);
      setBusy(false);
      setStep("menu");
      return;
    }

    const { data: registrationData } = await supabase.rpc(
      "scan_registration_status",
      {
        _phone: normalizedPhone,
        _branch_id: branch.id,
        _device_token: deviceToken,
      },
    );

    setBusy(false);

    const registration = registrationData as RegistrationStatus | null;

    if (registration?.status === "pending") {
      setInfo(
        lang === "ar"
          ? "طلب تسجيلك بانتظار موافقة الكاشير."
          : "Your registration request is waiting for cashier approval.",
      );
      return;
    }

    if (registration?.status === "rejected") {
      setErr(
        lang === "ar"
          ? "تم رفض طلب التسجيل. يرجى التواصل مع الكاشير."
          : "Your registration request was rejected. Please contact the cashier.",
      );
      return;
    }

    setErr(
      lang === "ar"
        ? "لا يوجد اشتراك نشط لهذا الرقم."
        : "No active subscription was found for this number.",
    );
  }

  async function sendOrder(drink: Drink) {
    if (!sub || !branch || !customer) return;

    setBusy(true);
    setErr(null);

    const { data, error } = await supabase.rpc("scan_submit_order", {
      _phone: phone.trim(),
      _branch_id: branch.id,
      _drink_type_id: drink.id,
    });

    setBusy(false);

    if (error || !data) {
      setErr(error?.message ?? "Failed");
      return;
    }

    setOrderId(data as string);
    setOrderStatus("pending");
    setStep("waiting");
  }

  const totalDays = sub?.plan?.duration_days ?? 0;
  const daysLeft = Math.max(
    0,
    totalDays -
      (sub
        ? daysBetween(
            sub.start_date,
            new Date().toISOString().slice(0, 10),
          )
        : 0),
  );

  const canOrder = Boolean(sub) && sub?.status === "active" && usedToday === 0;

  return (
    <main dir={dir} className="flex min-h-screen flex-col items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-cream-dim hover:text-caramel-bright"
          >
            <Coffee className="h-5 w-5" />
            <span className="font-display text-xl font-bold tracking-wider gold-text">
              KOB
            </span>
          </Link>

          <LanguageSwitcher />
        </div>

        {step === "branch" && (
          <div className="panel-warm p-7">
            <h1 className="mb-1 font-display text-2xl font-bold text-cream">
              {t("pickBranch")}
            </h1>
            <p className="mb-5 text-sm text-cream-dim">{t("scanHint")}</p>

            <div className="space-y-2">
              {branches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setBranch(item);
                    setStep("language");
                  }}
                  className="btn-ghost-brass flex w-full items-center justify-between px-4 py-4 text-start"
                >
                  <span className="font-semibold text-cream">
                    {lang === "ar" ? item.name_ar : item.name_en}
                  </span>
                </button>
              ))}

              {branches.length === 0 && (
                <div className="engraved p-4 text-center text-sm text-cream-dim">
                  {t("empty_branches")}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "language" && branch && (
          <div className="panel-warm p-7">
            <BackBtn onClick={() => setStep("branch")} label={t("back")} />
            <BranchBadge label={branchLabel} />

            <h1 className="mb-6 text-center font-display text-2xl font-bold text-cream">
              {t("pickLang")}
            </h1>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void chooseLanguage("en")}
                className="btn-brass py-5 font-display text-xl"
              >
                English
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void chooseLanguage("ar")}
                className="btn-brass py-5 font-display text-xl"
              >
                العربية
              </button>
            </div>

            {busy && (
              <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-caramel" />
            )}
          </div>
        )}

        {step === "showcase" && branch && (
          <div className="space-y-4">
            <div className="panel-warm p-6">
              <BackBtn onClick={() => setStep("language")} label={t("back")} />
              <BranchBadge label={branchLabel} />

              <h1 className="text-center font-display text-2xl font-bold text-cream">
                {lang === "ar" ? "المشروبات المتوفرة" : "Available Drinks"}
              </h1>

              <p className="mt-2 text-center text-sm text-cream-dim">
                {lang === "ar"
                  ? "تستطيع مشاهدة المشروبات، لكن الطلب يتطلب اشتراكًا فعالًا."
                  : "You can view the drinks, but ordering requires an active subscription."}
              </p>
            </div>

            <div className="panel p-6">
              <DrinkGrid drinks={drinks} lang={lang} mode="showcase" />

              <button
                type="button"
                onClick={() => {
                  setErr(null);
                  setStep("register");
                }}
                className="btn-brass mt-5 flex w-full items-center justify-center gap-2 py-4"
              >
                <UserPlus className="h-5 w-5" />
                <span>{lang === "ar" ? "تسجيل" : "Register"}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep("phone")}
                className="btn-ghost-brass mt-3 w-full py-3 text-sm"
              >
                {lang === "ar"
                  ? "لدي اشتراك بالفعل"
                  : "I already have a subscription"}
              </button>
            </div>
          </div>
        )}

        {step === "register" && branch && (
          <div className="panel-warm p-7">
            <BackBtn onClick={() => setStep("showcase")} label={t("back")} />
            <BranchBadge label={branchLabel} />

            <h1 className="mb-1 text-center font-display text-2xl font-bold text-cream">
              {lang === "ar" ? "طلب تسجيل جديد" : "New Registration"}
            </h1>

            <p className="mb-5 text-center text-sm text-cream-dim">
              {lang === "ar"
                ? "أدخل بياناتك وسيصل الطلب إلى كاشير الفرع."
                : "Enter your details and the request will be sent to the branch cashier."}
            </p>

            <form onSubmit={submitRegistration} className="space-y-4">
              <Field label={lang === "ar" ? "الاسم الأول" : "First name"}>
                <input
                  value={firstName}
                  required
                  maxLength={50}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60"
                />
              </Field>

              <Field label={lang === "ar" ? "الاسم الأخير" : "Last name"}>
                <input
                  value={lastName}
                  required
                  maxLength={50}
                  onChange={(event) => setLastName(event.target.value)}
                  className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60"
                />
              </Field>

              <Field label={lang === "ar" ? "رقم الجوال" : "Phone number"}>
                <input
                  value={phone}
                  required
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="05XXXXXXXX"
                  onChange={(event) => setPhone(normalizePhone(event.target.value))}
                  className="inset-well w-full px-4 py-3 text-center font-mono tracking-widest outline-none focus:ring-2 focus:ring-caramel/60"
                />
              </Field>

              {err && <ErrorBox message={err} />}

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
                    : "Send registration request"}
                </span>
              </button>
            </form>
          </div>
        )}

        {step === "registration-sent" && (
          <div className="panel-warm p-8 text-center">
            <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
              <Clock className="h-9 w-9 animate-pulse text-caramel-bright" />
            </div>

            <h1 className="font-display text-2xl font-bold text-cream">
              {lang === "ar" ? "تم إرسال طلب التسجيل" : "Registration Sent"}
            </h1>

            <p className="mt-3 text-sm leading-7 text-cream-dim">
              {lang === "ar"
                ? "وصلت بياناتك إلى الكاشير. بعد تفعيل الاشتراك امسح الكود مرة أخرى وأدخل رقم جوالك."
                : "Your details were sent to the cashier. Once activated, scan the QR code again and enter your phone number."}
            </p>

            <button
              type="button"
              onClick={() => setStep("phone")}
              className="btn-ghost-brass mt-6 px-5 py-3"
            >
              {lang === "ar" ? "فحص حالة الاشتراك" : "Check subscription status"}
            </button>
          </div>
        )}

        {step === "phone" && branch && (
          <div className="panel-warm p-7">
            <BackBtn
              onClick={() => setStep(deviceKnown ? "language" : "showcase")}
              label={t("back")}
            />
            <BranchBadge label={branchLabel} />

            <h1 className="mb-1 text-center font-display text-2xl font-bold text-cream">
              {t("enterPhone")}
            </h1>

            <p className="mb-5 text-center text-sm text-cream-dim">
              {lang === "ar"
                ? "أدخل رقم الجوال المرتبط باشتراكك."
                : "Enter the phone number connected to your subscription."}
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void lookup();
              }}
              className="space-y-4"
            >
              <input
                value={phone}
                required
                inputMode="numeric"
                maxLength={10}
                placeholder="05XXXXXXXX"
                onChange={(event) => setPhone(normalizePhone(event.target.value))}
                className="inset-well w-full px-4 py-4 text-center font-mono text-lg tracking-widest outline-none focus:ring-2 focus:ring-caramel/60"
              />

              {err && <ErrorBox message={err} />}
              {info && <InfoBox message={info} />}

              <button
                type="submit"
                disabled={busy}
                className="btn-brass flex w-full items-center justify-center gap-2 py-4"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("lookup")}
              </button>
            </form>
          </div>
        )}

        {step === "menu" && sub && branch && (
          <>
            <div className="panel-warm mb-4 p-6">
              <BackBtn onClick={() => setStep("phone")} label={t("back")} />

              <div className="engraved p-4">
                <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-cream-dim">
                  {t("planLabel")}
                </div>

                <div className="font-display text-2xl font-bold text-cream">
                  {sub.plan?.name ?? "—"}
                </div>

                <div className="hairline-divider my-3" />

                <div className="flex justify-between text-sm">
                  <span className="text-cream-dim">{t("branchLabel")}</span>
                  <span className="text-cream">{branchLabel}</span>
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-sm text-cream-dim">
                    {t("remainingLabel")}
                  </span>

                  <span className="font-display text-3xl font-bold gold-text">
                    {fmtNum(daysLeft)}
                    <span className="font-sans text-sm text-cream-dim">
                      {" "}/ {fmtNum(totalDays)}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <h2 className="mb-4 font-display text-xl font-bold text-cream">
                {t("pickCoffee")}
              </h2>

              <DrinkGrid
                drinks={drinks}
                lang={lang}
                mode="order"
                busy={busy}
                canOrder={canOrder}
                onOrder={sendOrder}
              />

              {!canOrder && (
                <div className="engraved mt-4 p-3 text-center text-sm text-cream-dim">
                  {t("empty_days")}
                </div>
              )}

              {err && (
                <div className="mt-4">
                  <ErrorBox message={err} />
                </div>
              )}
            </div>
          </>
        )}

        {step === "waiting" && (
          <div className="panel-warm p-8 text-center">
            {orderStatus === "pending" && (
              <>
                <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                  <Clock className="h-9 w-9 animate-pulse text-caramel-bright" />
                </div>
                <h1 className="mb-2 font-display text-2xl font-bold text-cream">
                  {t("waiting")}
                </h1>
                <p className="text-sm text-cream-dim">{t("waitingHint")}</p>
              </>
            )}

            {orderStatus === "approved" && (
              <>
                <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                  <Check className="h-10 w-10 text-leaf" />
                </div>
                <h1 className="mb-2 font-display text-2xl font-bold text-cream">
                  {t("approvedMsg")}
                </h1>
              </>
            )}

            {orderStatus === "rejected" && (
              <>
                <div className="engraved mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full">
                  <XCircle className="h-10 w-10 text-[oklch(0.7_0.18_32)]" />
                </div>
                <h1 className="mb-2 font-display text-2xl font-bold text-cream">
                  {t("rejectedMsg")}
                </h1>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setOrderId(null);
                setOrderStatus("pending");
                setStep("menu");
              }}
              className="btn-ghost-brass mt-6 px-5 py-2.5 text-sm"
            >
              {t("newOrder")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function DrinkGrid({
  drinks,
  lang,
  mode,
  busy = false,
  canOrder = false,
  onOrder,
}: {
  drinks: Drink[];
  lang: "ar" | "en";
  mode: "showcase" | "order";
  busy?: boolean;
  canOrder?: boolean;
  onOrder?: (drink: Drink) => void | Promise<void>;
}) {
  if (drinks.length === 0) {
    return (
      <div className="engraved p-6 text-center text-sm text-cream-dim">
        {lang === "ar"
          ? "لا توجد مشروبات متاحة حاليًا."
          : "No drinks are currently available."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {drinks.map((drink) => {
        const content = (
          <>
            <div className="aspect-square overflow-hidden bg-black/20">
              {drink.image_url ? (
                <img
                  src={drink.image_url}
                  alt={lang === "ar" ? drink.name_ar : drink.name_en}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Coffee className="h-10 w-10 text-caramel-bright" />
                </div>
              )}
            </div>

            <div className="p-3 font-display text-base font-semibold text-cream sm:text-lg">
              {lang === "ar" ? drink.name_ar : drink.name_en}
            </div>
          </>
        );

        if (mode === "showcase") {
          return (
            <article
              key={drink.id}
              className="engraved group overflow-hidden text-center"
            >
              {content}
            </article>
          );
        }

        return (
          <button
            key={drink.id}
            type="button"
            disabled={busy || !canOrder}
            onClick={() => void onOrder?.(drink)}
            className="engraved group overflow-hidden text-center transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

function BranchBadge({ label }: { label: string }) {
  return (
    <div className="engraved mb-5 px-3 py-2 text-center text-xs uppercase tracking-widest text-cream-dim">
      {label}
    </div>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-1 text-xs text-cream-dim hover:text-caramel-bright"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.2em] text-cream-dim">
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="engraved p-3 text-center text-sm text-[oklch(0.78_0.16_32)]">
      {message}
    </div>
  );
}

function InfoBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-caramel/25 bg-caramel/10 p-3 text-center text-sm text-cream">
      {message}
    </div>
  );
}

function getOrCreateDeviceToken() {
  const existing = window.localStorage.getItem(DEVICE_TOKEN_KEY);
  if (existing) return existing;

  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(DEVICE_TOKEN_KEY, token);
  return token;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function translateRegistrationError(message: string, language: "ar" | "en") {
  if (message.includes("invalid_phone")) {
    return language === "ar"
      ? "رقم الجوال غير صحيح."
      : "The phone number is invalid.";
  }

  if (message.includes("invalid_name")) {
    return language === "ar"
      ? "الاسم الأول أو الأخير غير صحيح."
      : "The first or last name is invalid.";
  }

  return language === "ar"
    ? "تعذر إرسال طلب التسجيل."
    : "Unable to send the registration request.";
}

function daysBetween(startDate: string, currentDate: string) {
  const milliseconds =
    new Date(currentDate).getTime() - new Date(startDate).getTime();

  return Math.max(0, Math.floor(milliseconds / 86400000));
}
