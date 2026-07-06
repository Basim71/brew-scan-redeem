import { Loader2 } from "lucide-react";

export function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "text-caramel-bright",
    approved: "text-leaf",
    active: "text-leaf",
    rejected: "text-[oklch(0.72_0.18_32)]",
    inactive: "text-[oklch(0.72_0.18_32)]",
  };
  return (
    <span className={"engraved px-2 py-1 text-[10px] uppercase tracking-widest " + (map[s] ?? "text-cream-dim")}>
      {s}
    </span>
  );
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.round(s / 60) + "m ago";
  if (s < 86400) return Math.round(s / 3600) + "h ago";
  return Math.round(s / 86400) + "d ago";
}

export function FullScreenLoader() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-caramel" />
    </main>
  );
}