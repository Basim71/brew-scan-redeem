import { Loader2 } from "lucide-react";
import { useI18n, type TKey } from "./i18n";

const STATUS_KEY: Record<string, TKey> = {
  pending: "st_pending",
  approved: "st_approved",
  rejected: "st_rejected",
  active: "st_active",
  inactive: "st_inactive",
  available: "st_available",
  sold: "st_sold",
  expired: "st_expired",
  used: "st_used",
  upcoming: "st_upcoming",
  admin: "st_admin",
  cashier: "st_cashier",
};

export function StatusPill({ s }: { s: string }) {
  const { t } = useI18n();
  const map: Record<string, string> = {
    pending: "text-caramel-bright",
    approved: "text-leaf",
    active: "text-leaf",
    approved_today: "text-leaf",
    available: "text-leaf",
    rejected: "text-[oklch(0.72_0.18_32)]",
    inactive: "text-[oklch(0.72_0.18_32)]",
    expired: "text-[oklch(0.72_0.18_32)]",
    sold: "text-cream-dim",
    used: "text-cream-dim",
    upcoming: "text-caramel-bright",
  };
  const key = STATUS_KEY[s];
  const label = key ? t(key) : s;
  return (
    <span className={"engraved px-2 py-1 text-[10px] uppercase tracking-widest " + (map[s] ?? "text-cream-dim")}>
      {label}
    </span>
  );
}

/** @deprecated use useI18n().timeAgo — kept for compatibility */
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