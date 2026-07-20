import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "./PlatformProvider";

type PlatformProfileRow = Record<string, unknown>;

type PlatformProfileRpcResult = {
  data: PlatformProfileRow[] | PlatformProfileRow | null;
  error: { message: string } | null;
};

async function readPlatformProfile(): Promise<PlatformProfileRpcResult> {
  const result = await supabase.rpc("get_my_platform_profile");
  return result as unknown as PlatformProfileRpcResult;
}

function hasPlatformProfile(data: PlatformProfileRpcResult["data"]): boolean {
  if (Array.isArray(data)) return data.length > 0;
  return Boolean(data);
}

export function PlatformAuthPage() {
  const navigate = useNavigate();
  const { profile, ready, refresh } = usePlatform();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && profile) {
      void navigate({ to: "/platform", replace: true });
    }
  }, [navigate, profile, ready]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("أدخل البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        setError("بيانات الدخول غير صحيحة.");
        return;
      }

      const profileResult = await readPlatformProfile();
      if (profileResult.error || !hasPlatformProfile(profileResult.data)) {
        await supabase.auth.signOut();
        setError("الحساب غير مخول لإدارة المنصة.");
        return;
      }

      await refresh();
      await navigate({ to: "/platform", replace: true });
    } catch (submitError) {
      console.error("Platform sign-in failed", submitError);
      setError("تعذر تسجيل الدخول الآن. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="platform-auth-page" dir="rtl">
      <section className="platform-auth-card" aria-labelledby="platform-login-title">
        <div className="platform-auth-brand">
          <span aria-hidden="true">
            <ShieldCheck />
          </span>
          <div>
            <strong id="platform-login-title">KOB Platform</strong>
            <small>بوابة الإدارة المركزية</small>
          </div>
        </div>

        <div className="platform-auth-intro">
          <h1>مرحبًا بعودتك</h1>
          <p>سجّل الدخول للوصول إلى الشركات وفريق نجاح العملاء وإعدادات المنصة.</p>
        </div>

        <form onSubmit={handleSubmit} className="platform-auth-form" noValidate>
          <label>
            <span>البريد الإلكتروني</span>
            <div className="platform-auth-field">
              <Mail aria-hidden="true" />
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="name@company.com"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                dir="ltr"
              />
            </div>
          </label>

          <label>
            <span>كلمة المرور</span>
            <div className="platform-auth-field">
              <LockKeyhole aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                dir="ltr"
              />
              <button
                type="button"
                className="platform-auth-password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          {error ? (
            <p className="platform-auth-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="platform-primary-button" disabled={busy} type="submit">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            <span>{busy ? "جارٍ التحقق..." : "دخول المنصة"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
