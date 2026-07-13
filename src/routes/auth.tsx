import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Coffee, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff Sign In · KOB" },
      {
        name: "description",
        content: "Sign in to the KOB admin or cashier dashboard.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, ready, error: roleError } = useRole();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!session) {
      setCheckingRole(false);
      return;
    }

    if (role === "admin") {
      setCheckingRole(false);
      navigate({ to: "/admin", replace: true });
      return;
    }

    if (role === "cashier") {
      setCheckingRole(false);
      navigate({ to: "/cashier", replace: true });
      return;
    }

    setCheckingRole(false);

    setErr(
      roleError
        ? `Role read error: ${roleError}`
        : "تم تسجيل الدخول، لكن لم يتم العثور على صلاحية لهذا الحساب. تأكد من وجود role في جدول user_roles أو من سياسات RLS.",
    );
  }, [ready, session, role, roleError, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);
    setCheckingRole(true);
    setErr(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;
    } catch (e: any) {
      setCheckingRole(false);
      setErr(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const isLoading = busy || checkingRole || (!!session && !ready);

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#140704] text-cream">
      <AuthBackground />

      {/* Top Bar */}
      <header className="relative z-20 w-full">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link
            to="/"
            className="group flex items-center gap-3 text-cream-dim transition hover:text-caramel-bright"
          >
            <div className="panel-warm flex h-11 w-11 items-center justify-center rounded-full transition group-hover:scale-105">
              <Coffee className="h-5 w-5 text-caramel-bright" />
            </div>

            <div>
              <div className="font-display text-2xl font-bold tracking-wide gold-text">
                KOB
              </div>
              <div className="hidden text-[9px] uppercase tracking-[0.25em] text-cream-dim sm:block">
                Coffee Coupon Co.
              </div>
            </div>
          </Link>

          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Layout */}
      <section className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 pb-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        {/* Left Visual Section */}
        <div className="hidden lg:flex min-h-[640px] flex-col justify-center">
          <div className="max-w-xl">
            <div className="engraved mb-7 inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-cream-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-caramel" />
              Staff Access
            </div>

            <h1 className="mb-6 font-display text-6xl font-bold leading-[0.98] xl:text-7xl">
              <span className="text-cream">Manage daily</span>
              <br />
              <span className="gold-text">coffee coupons.</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-cream-dim">
              A premium control space for admins and cashiers to approve daily
              cups, manage subscriptions, and keep every branch organized.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-2 gap-4">
              <FeatureCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="Protected"
                body="Staff-only access with role permissions."
              />
              <FeatureCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Premium"
                body="Designed for a luxury coffee workflow."
              />
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="flex min-h-[calc(100vh-120px)] w-full items-center justify-center py-8 lg:min-h-[640px]">
          <div className="w-full max-w-[520px] 2xl:max-w-[560px]">
            <div className="panel-warm relative overflow-hidden rounded-[2rem] p-6 shadow-2xl sm:p-8 lg:p-10">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-caramel/70 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-caramel/10 blur-[70px]" />

              <div className="mb-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl engraved">
                  <Coffee className="h-7 w-7 text-caramel-bright" />
                </div>

                <h1 className="mb-2 font-display text-4xl font-bold leading-tight text-cream sm:text-5xl">
                  {t("welcomeBack")}
                </h1>

                <p className="text-base leading-relaxed text-cream-dim">
                  {t("signInSubtitle")}
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <Field label={t("email")}>
                  <input
                    required
                    type="email"
                    value={email}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    className="inset-well h-14 w-full px-5 text-base outline-none transition focus:ring-2 focus:ring-caramel/60"
                  />
                </Field>

                <Field label={t("password")}>
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="inset-well h-14 w-full px-5 text-base outline-none transition focus:ring-2 focus:ring-caramel/60"
                  />
                </Field>

                {err && (
                  <div className="engraved rounded-2xl px-4 py-3 text-sm leading-relaxed text-[oklch(0.75_0.18_32)]">
                    {err}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-brass flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
                  {isLoading ? "جاري التحقق..." : t("signIn")}
                </button>
              </form>

              <div className="hairline-divider my-8" />

              <p className="text-center text-xs leading-relaxed text-cream-dim sm:text-sm">
                {t("staffOnlyNotice")}
              </p>
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-cream-dim sm:text-sm">
              {t("customersHint").replace(t("goToScan") + ".", "")}
              <Link to="/scan" className="text-caramel-bright underline">
                {t("goToScan")}
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(245,166,71,0.12),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(191,104,33,0.16),transparent_36%),linear-gradient(180deg,#1b0904_0%,#0b0302_100%)]" />

      <div className="absolute -left-36 top-32 h-[520px] w-[520px] rounded-full bg-caramel/10 blur-[130px]" />
      <div className="absolute -right-36 bottom-20 h-[520px] w-[520px] rounded-full bg-amber-900/20 blur-[130px]" />

      <div className="absolute left-1/2 top-24 h-px w-[80vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-caramel/20 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="panel-warm rounded-3xl p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full engraved text-caramel-bright">
        {icon}
      </div>
      <div className="mb-1 font-display text-xl font-bold text-cream">
        {title}
      </div>
      <p className="text-sm leading-relaxed text-cream-dim">{body}</p>
    </div>
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
      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-cream-dim">
        {label}
      </div>
      {children}
    </label>
  );
}
