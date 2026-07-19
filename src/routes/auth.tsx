import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Building2, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";

import {
  useOrganization,
  type ActiveOrganization,
  type OrganizationRole,
} from "@/components/tenant/OrganizationProvider";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول · KOB" },
      { name: "description", content: "تسجيل دخول موظفي شركات KOB." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type ResolvedOrganizationRow = {
  organization_id: string;
  organization_code: string;
  organization_name_ar: string | null;
  organization_name_en: string | null;
  organization_slug: string | null;
  organization_status: string;
};

function destinationFor(role: OrganizationRole) {
  return role === "cashier" ? "/cashier" : "/admin";
}

function AuthPage() {
  const navigate = useNavigate();
  const { session, organization, role, ready, activateOrganization, clearOrganization } = useOrganization();

  const [email, setEmail] = useState("");
  const [companyIdentifier, setCompanyIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !session || !organization || !role) return;
    navigate({ to: destinationFor(role), replace: true });
  }, [navigate, organization, ready, role, session]);

  async function resolveOrganization(identifier: string): Promise<ActiveOrganization> {
    const db = supabase as any;
    const { data, error: resolveError } = await db.rpc("resolve_login_organization", {
      login_identifier: identifier,
    });

    if (resolveError) throw new Error(resolveError.message);

    const row = (Array.isArray(data) ? data[0] : data) as ResolvedOrganizationRow | undefined;
    if (!row) throw new Error("لم يتم العثور على الشركة. تأكد من كود الشركة.");
    if (row.organization_status !== "active") {
      throw new Error("حساب الشركة موقوف. يرجى التواصل مع إدارة منصة KOB.");
    }

    return {
      id: row.organization_id,
      code: row.organization_code,
      nameAr: row.organization_name_ar,
      nameEn: row.organization_name_en,
      slug: row.organization_slug,
      status: row.organization_status,
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCompany = companyIdentifier.trim();
    if (!normalizedEmail || !normalizedCompany || !password) return;

    setBusy(true);
    setError(null);
    clearOrganization();

    try {
      const targetOrganization = await resolveOrganization(normalizedCompany);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة.");

      try {
        const membership = await activateOrganization(targetOrganization);
        navigate({ to: destinationFor(membership.role), replace: true });
      } catch (membershipError) {
        await supabase.auth.signOut();
        throw membershipError;
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "تعذر تسجيل الدخول.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="kob-auth-page" dir="rtl">
      <div className="kob-auth-ambient kob-auth-ambient-one" />
      <div className="kob-auth-ambient kob-auth-ambient-two" />

      <section className="kob-auth-card">
        <form onSubmit={submit} className="kob-auth-form">
          <label className="kob-auth-field">
            <Mail className="kob-auth-field-icon" aria-hidden="true" />
            <input
              type="email"
              required
              value={email}
              autoComplete="email"
              inputMode="email"
              placeholder="البريد الإلكتروني"
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              className="kob-auth-input"
              aria-label="البريد الإلكتروني"
              dir="ltr"
            />
          </label>

          <label className="kob-auth-field">
            <Building2 className="kob-auth-field-icon" aria-hidden="true" />
            <input
              type="text"
              required
              value={companyIdentifier}
              autoComplete="organization"
              placeholder="كود الشركة"
              disabled={busy}
              onChange={(event) => setCompanyIdentifier(event.target.value)}
              className="kob-auth-input"
              aria-label="كود الشركة"
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
              placeholder="كلمة المرور"
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              className="kob-auth-input kob-auth-password-input"
              aria-label="كلمة المرور"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={busy}
              className="kob-auth-password-toggle"
              aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>

          {error && <div className="kob-auth-error" role="alert">{error}</div>}

          <button type="submit" disabled={busy} className="kob-auth-submit" aria-label="تسجيل الدخول">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
          </button>
        </form>
      </section>
    </main>
  );
}
