export type CustomerToken = {
  v: number;
  sid: string;
  cid: string;
  kid: string;
  name: string;
  plan: string;
  max: number;
  used_today: number;
  day: string;
  nonce: string;
  exp: number; // unix seconds
  sig: string;
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

export type DeviceKey = { customer_id: string; key_id: string; public_key: string };
export type TokenProblem = "invalid" | "expired" | "otherDay" | "limit" | "reused" | "badSignature" | "unknownKey";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function validToken(o: CustomerToken): boolean {
  return o?.v === 1 && [o.sid, o.cid, o.kid].every((id) => typeof id === "string" && uuid.test(id))
    && typeof o.nonce === "string" && o.nonce.length > 0 && !o.nonce.includes("|")
    && typeof o.sig === "string" && o.sig.length > 0
    && typeof o.name === "string" && typeof o.plan === "string"
    && Number.isSafeInteger(o.max) && o.max > 0
    && Number.isSafeInteger(o.used_today) && o.used_today >= 0
    && Number.isSafeInteger(o.exp) && o.exp > 0
    && typeof o.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.day);
}

export function tokenMessage(tok: CustomerToken): string {
  return ["KOB1", tok.sid, tok.cid, tok.kid, tok.max, tok.used_today, tok.day, tok.nonce, tok.exp].join("|");
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export async function verifyTokenSignature(tok: CustomerToken, keys: DeviceKey[]): Promise<TokenProblem | null> {
  if (!validToken(tok)) return "invalid";
  const entry = keys.find((key) => key.key_id === tok.kid && key.customer_id === tok.cid);
  if (!entry) return "unknownKey";
  try {
    const sig = base64ToBytes(tok.sig);
    if (sig.length !== 64) return "badSignature";
    const key = await crypto.subtle.importKey("spki", base64ToBytes(entry.public_key),
      { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig,
      new TextEncoder().encode(tokenMessage(tok)));
    return ok ? null : "badSignature";
  } catch {
    return "badSignature";
  }
}

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
      if (validToken(o)) return o;
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
  if (!validToken(tok)) return "invalid";
  if (tok.exp * 1000 <= ctx.now) return "expired";
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
