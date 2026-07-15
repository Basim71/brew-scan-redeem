import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/lib/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In · KOB" },
      {
        name: "description",
        content: "KOB staff sign-in.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const {
    session,
    role,
    ready,
    error: roleError,
  } = useRole();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(roleError || "No permission is assigned to this account.");
  }, [navigate, ready, role, roleError, session]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) return;

    setBusy(true);
    setCheckingRole(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    setBusy(false);

    if (signInError) {
      setCheckingRole(false);
      setError(signInError.message);
    }
  }

  const loading = busy || checkingRole || Boolean(session && !ready);

  return (
    <main className="kob-auth-page">
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
              placeholder="Email"
              disabled={loading}
              onChange={(event) => setEmail(event.target.value)}
              className="kob-auth-input"
              aria-label="Email"
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
              placeholder="Password"
              disabled={loading}
              onChange={(event) => setPassword(event.target.value)}
              className="kob-auth-input kob-auth-password-input"
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              disabled={loading}
              className="kob-auth-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </label>

          {error && <div className="kob-auth-error" role="alert">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="kob-auth-submit"
            aria-label="Sign in"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}
          </button>
        </form>
      </section>
    </main>
  );
}
