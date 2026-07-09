import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coffee, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";
import { useI18n, LanguageSwitcher } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Staff Sign In · KOB" }, { name: "description", content: "Sign in to the KOB admin or cashier dashboard." }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, ready } = useRole();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !session) return;
    if (role === "admin") navigate({ to: "/admin" });
    else if (role === "cashier") navigate({ to: "/cashier" });
    else navigate({ to: "/" });
  }, [ready, session, role, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 text-cream-dim hover:text-caramel-bright">
            <Coffee className="w-5 h-5" />
            <span className="font-display text-xl gold-text font-bold tracking-wider">KOB</span>
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="panel-warm p-8">
          <h1 className="font-display text-3xl font-bold text-cream mb-1">
            {t("welcomeBack")}
          </h1>
          <p className="text-sm text-cream-dim mb-6">
            {t("signInSubtitle")}
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Field label={t("email")}>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>
            <Field label={t("password")}>
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>

            {err && <div className="text-sm text-[oklch(0.75_0.18_32)] engraved px-3 py-2">{err}</div>}

            <button disabled={busy} className="btn-brass w-full py-3.5 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("signIn")}
            </button>
          </form>

          <div className="hairline-divider my-6" />
          <p className="text-center text-xs text-cream-dim leading-relaxed">
            {t("staffOnlyNotice")}
          </p>
        </div>

        <p className="text-center text-xs text-cream-dim mt-6">
          {t("customersHint").replace(t("goToScan") + ".", "")}
          <Link to="/scan" className="text-caramel-bright underline">{t("goToScan")}</Link>.
        </p>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-[0.2em] text-cream-dim mb-1.5">{label}</div>
      {children}
    </label>
  );
}