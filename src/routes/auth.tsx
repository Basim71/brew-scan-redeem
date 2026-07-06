import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Coffee, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Staff Sign In · KOB" }, { name: "description", content: "Sign in to the KOB admin or cashier dashboard." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, role, ready } = useRole();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
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
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6 text-cream-dim hover:text-caramel-bright">
          <Coffee className="w-5 h-5" />
          <span className="font-display text-xl gold-text font-bold tracking-wider">KOB</span>
        </Link>

        <div className="panel-warm p-8">
          <h1 className="font-display text-3xl font-bold text-cream mb-1">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-sm text-cream-dim mb-6">
            {mode === "signin" ? "Sign in to your KOB staff dashboard." : "New admin or cashier account."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)}
                  className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60" />
              </Field>
            )}
            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>
            <Field label="Password">
              <input required type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                className="inset-well w-full px-4 py-3 outline-none focus:ring-2 focus:ring-caramel/60" />
            </Field>

            {err && <div className="text-sm text-[oklch(0.75_0.18_32)] engraved px-3 py-2">{err}</div>}

            <button disabled={busy} className="btn-brass w-full py-3.5 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="hairline-divider my-6" />
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-sm text-cream-dim hover:text-caramel-bright">
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>

        <p className="text-center text-xs text-cream-dim mt-6">
          Customers don't need an account — <Link to="/scan" className="text-caramel-bright underline">go to scan</Link>.
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