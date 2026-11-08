export type CustomerToken = {
  v: number;
  sid: string;
  cid?: string;
  name: string;
  plan: string;
  max: number;
  used_today: number;
  day: string;
  nonce: string;
  exp: number; // unix seconds
  sig?: string;
};

export type QueuedOrder = {
  offline_sync_id: string;
  subscription_id: string;
  branch_id: string;
  drink_type_id: string;
  served_at: string;
  method: string;
  selected_options: unknown[];
  customer_note: string | null;
};

export type TokenProblem = "invalid" | "expired" | "otherDay" | "limit" | "reused";

export function parseToken(raw: string): CustomerToken | null {
  const text = raw.trim();
  if (!text) return null;
  const candidates = [text];
  try {
    candidates.push(atob(text.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    /* not base64 */
  }
  for (const c of candidates) {
    try {
      const o = JSON.parse(c);
      if (o && typeof o.sid === "string" && typeof o.nonce === "string" && typeof o.exp === "number") {
        return { ...o, max: Number(o.max ?? 1), used_today: Number(o.used_today ?? 0) };
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

export function checkToken(
  tok: CustomerToken,
  ctx: { now: number; today: string; localUsed: number; usedNonces: string[] },
): TokenProblem | null {
  if (tok.exp * 1000 < ctx.now) return "expired";
  if (tok.day !== ctx.today) return "otherDay";
  if (ctx.usedNonces.includes(tok.nonce)) return "reused";
  if (Math.max(tok.used_today, ctx.localUsed) >= tok.max) return "limit";
  return null;
}

export function todayRiyadh(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(d);
}

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}
