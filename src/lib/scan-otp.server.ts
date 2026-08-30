/**
 * Server-only logic for customer phone verification on /scan.
 * A 6-digit code is emailed to the customer; only a hash is stored.
 */
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 15 * 60 * 1000;

export type RequestOtpResult =
  | { status: "sent"; maskedEmail: string }
  | { status: "needs_email" }
  | { status: "not_registered" }
  | { status: "rate_limited" }
  | { status: "email_not_configured" };

export type VerifyOtpResult =
  | { status: "verified"; token: string; expiresAt: string }
  | { status: "invalid" }
  | { status: "expired" };

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizePhone(raw: string) {
  return (raw ?? "").replace(/\D/g, "").slice(0, 10);
}

export function isValidPhone(phone: string) {
  return /^05\d{8}$/.test(phone);
}

export function normalizeEmail(raw: string | null | undefined) {
  const value = (raw ?? "").trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "•••";
  const head = local.slice(0, 1);
  const tail = local.length > 2 ? local.slice(-1) : "";
  return `${head}${"•".repeat(Math.max(2, local.length - 2))}${tail}@${domain}`;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Generates the code, stores its hash and emails it. */
export async function requestOtp(input: {
  phone: string;
  branchId: string | null;
  email?: string | null;
  deviceToken?: string | null;
  lang: "ar" | "en";
}): Promise<RequestOtpResult> {
  const phone = normalizePhone(input.phone);
  if (!isValidPhone(phone)) return { status: "not_registered" };

  const db = await admin();

  const { data: customer } = await db
    .from("customers")
    .select("id,name,email")
    .eq("phone", phone)
    .maybeSingle();

  const providedEmail = normalizeEmail(input.email);
  let email: string | null = null;
  let customerId: string | null = null;

  if (customer) {
    customerId = customer.id;
    email = normalizeEmail(customer.email) ?? providedEmail;
    if (!email) return { status: "needs_email" };
  } else {
    // Not a customer yet (registration flow) — an email must be supplied.
    if (!providedEmail) return { status: "not_registered" };
    email = providedEmail;
  }

  const since = new Date(Date.now() - SEND_WINDOW_MS).toISOString();
  const { count } = await db
    .from("customer_otp_codes")
    .select("id", { count: "exact", head: true })
    .eq("phone", phone)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_SENDS_PER_WINDOW) return { status: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const { error: insertError } = await db.from("customer_otp_codes").insert({
    phone,
    email,
    branch_id: input.branchId,
    customer_id: customerId,
    code_hash: sha256(code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    device_token: input.deviceToken ?? null,
  });
  if (insertError) throw insertError;

  const sent = await dispatchOtpEmail({
    email,
    code,
    lang: input.lang,
    name: customer?.name ?? null,
  });
  if (!sent) return { status: "email_not_configured" };

  return { status: "sent", maskedEmail: maskEmail(email) };
}

/** Verifies the code and mints a short-lived verified scan session. */
export async function verifyOtp(input: {
  phone: string;
  branchId: string | null;
  code: string;
}): Promise<VerifyOtpResult> {
  const phone = normalizePhone(input.phone);
  const code = (input.code ?? "").replace(/\D/g, "");
  if (!isValidPhone(phone) || code.length !== 6) return { status: "invalid" };

  const db = await admin();

  const { data: row } = await db
    .from("customer_otp_codes")
    .select("id,code_hash,attempts,expires_at,consumed_at,email,customer_id")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return { status: "invalid" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { status: "expired" };
  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) return { status: "expired" };

  const expected = Buffer.from(row.code_hash, "hex");
  const actual = Buffer.from(sha256(code), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await db
      .from("customer_otp_codes")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    return { status: "invalid" };
  }

  await db
    .from("customer_otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id);

  // Persist the email for existing customers that had none.
  if (row.customer_id && row.email) {
    await db
      .from("customers")
      .update({ email: row.email })
      .eq("id", row.customer_id)
      .is("email", null);
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const { error: sessionError } = await db.from("customer_scan_sessions").insert({
    token_hash: sha256(token),
    phone,
    branch_id: input.branchId,
    customer_id: row.customer_id,
    expires_at: expiresAt,
  });
  if (sessionError) throw sessionError;

  return { status: "verified", token, expiresAt };
}

/**
 * Sends the verification email through the project's email infrastructure.
 * Returns false when email sending is not configured yet.
 */
async function dispatchOtpEmail(input: {
  email: string;
  code: string;
  lang: "ar" | "en";
  name: string | null;
}): Promise<boolean> {
  const { sendOtpEmail } = await import("./scan-otp-email.server");
  return sendOtpEmail(input);
}
