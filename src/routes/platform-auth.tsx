import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { usePlatform } from "@/components/platform/PlatformProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/platform-auth")({ component: PlatformAuth });

function PlatformAuth() {
  const navigate = useNavigate();
  const { profile, ready, refresh } = usePlatform();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && profile) {
      navigate({ to: "/platform", replace: true });
    }
  }, [navigate, profile, ready]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("بيانات الدخول غير صحيحة.");
        return;
      }

      await refresh();
      const { data, error: profileError } = await (
        supabase as unknown as {
          rpc: (name: string) => Promise<{ data: unknown; error: { message: string } | null }>;
        }
      ).rpc("get_my_platform_profile");

      const rows = Array.isArray(data) ? data : [];
      if (profileError || rows.length === 0) {
        await supabase.auth.signOut();
        setError("الحساب غير مخول لإدارة المنصة.");
        return;
      }

      navigate({ to: "/platform", replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر تسجيل الدخول الآن.");
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

        <form onSubmit={handleSubmit} className="platform-auth-form">
          <label>
            <span>البريد الإلكتروني</span>
            <div className="platform-auth-field">
              <Mail aria-hidden="true" />
              <input
                type="email"
                autoComplete="email"
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

          {error ? <p className="platform-auth-error">{error}</p> : null}

          <button className="platform-primary-button" disabled={busy} type="submit">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            <span>{busy ? "جارٍ التحقق..." : "دخول المنصة"}</span>
          </button>
        </form>
      </section>
    </main>
  );
}
