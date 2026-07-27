import { Loader2 } from "lucide-react";

export function AuthLoadingScreen({ message }: { message?: string }) {
  return (
    <main className="kob-auth-page" role="status" aria-live="polite">
      <div className="kob-auth-ambient kob-auth-ambient-one" />
      <div className="kob-auth-ambient kob-auth-ambient-two" />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, color: "#f2d9a8" }}>
        <Loader2 className="h-8 w-8 animate-spin" />
        {message ? <p style={{ margin: 0, opacity: 0.85 }}>{message}</p> : null}
      </div>
    </main>
  );
}