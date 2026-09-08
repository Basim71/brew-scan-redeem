import { Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { lovable } from "@/integrations/lovable/index";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import kobLogo from "@/assets/kob-logo.png.asset.json";

type Props = {
  onSubmit: (email: string, password: string) => Promise<void>;
  busy: boolean;
  error: string | null;
};

export function UnifiedLoginForm({ onSubmit, busy, error }: Props) {
  const { lang, dir } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleError, setAppleError] = useState<string | null>(null);

  async function handleAppleSignIn() {
    if (busy || appleBusy) return;
    setAppleBusy(true);
    setAppleError(null);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      setAppleError(lang === "ar" ? "تعذر تسجيل الدخول عبر Apple." : "Apple sign-in failed.");
      setAppleBusy(false);
      return;
    }
    if (result.redirected) return; // Browser is navigating to Apple
    setAppleBusy(false); // Session set — the page's session-restore effect will route the user
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) return;
    await onSubmit(normalizedEmail, password);
  }

  const labels = {
    tagline: lang === "ar" ? "اشتراكات القهوة اليومية" : "Daily Coffee Subscriptions",
    signInDivider: lang === "ar" ? "تسجيل الدخول" : "Sign In",
    email: lang === "ar" ? "البريد الإلكتروني" : "Email address",
    password: lang === "ar" ? "كلمة المرور" : "Password",
    show: lang === "ar" ? "إظهار كلمة المرور" : "Show password",
    hide: lang === "ar" ? "إخفاء كلمة المرور" : "Hide password",
    submit: lang === "ar" ? "تسجيل الدخول" : "Sign in",
    or: lang === "ar" ? "أو" : "or",
    apple: lang === "ar" ? "المتابعة عبر Apple" : "Continue with Apple",
  };

  return (
    <main className="kob-auth-page" dir={dir}>
      <div className="kob-auth-ambient kob-auth-ambient-one" />
      <div className="kob-auth-ambient kob-auth-ambient-two" />

      <section className="kob-auth-card">
        <div className="kob-auth-brand">
          <div className="kob-auth-logo-plate">
            <img src={kobLogo.url} alt="KOB" className="kob-auth-logo" />
          </div>
          <p className="kob-auth-tagline">{labels.tagline}</p>
          <div className="kob-auth-divider" aria-hidden="true">
            <span />
            <em>{labels.signInDivider}</em>
            <span />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <LanguageSwitcher />
        </div>

        <form onSubmit={handleSubmit} className="kob-auth-form" noValidate>
          <label className="kob-auth-field">
            <Mail className="kob-auth-field-icon" aria-hidden="true" />
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              inputMode="email"
              placeholder={labels.email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              className="kob-auth-input"
              aria-label={labels.email}
              dir="ltr"
            />
          </label>

          <label className="kob-auth-field">
            <LockKeyhole className="kob-auth-field-icon" aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={password}
              autoComplete="current-password"
              placeholder={labels.password}
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              className="kob-auth-input kob-auth-password-input"
              aria-label={labels.password}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword((c) => !c)}
              disabled={busy}
              className="kob-auth-password-toggle"
              aria-label={showPassword ? labels.hide : labels.show}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>

          {error ? (
            <div className="kob-auth-error" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={busy} className="kob-auth-submit" aria-label={labels.submit}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
          </button>
        </form>
      </section>
    </main>
  );
}