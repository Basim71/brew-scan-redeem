// Sends the push notification for an app order the cashier just
// moved forward. The cashier page calls it with { order_id } after
// approving, rejecting, marking ready or handing over.
//
// The caller's own session must be able to read the order (orders
// RLS: admins, or the cashier of that branch). The service role
// then claims whatever the orders trigger queued for it, so calling
// twice never notifies twice.
//
// Secrets: APNS_KEY_ID, APNS_PRIVATE_KEY (the .p8 file's contents),
// optional APNS_TEAM_ID and APNS_BUNDLE_ID.

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID") ?? "";
const APNS_PRIVATE_KEY = Deno.env.get("APNS_PRIVATE_KEY") ?? "";
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID") ?? "9SN67HVB99";
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") ?? "com.coffee.KOB";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Language = "ar" | "en";
type PushEvent = "approved" | "rejected" | "ready" | "handover";

type Claim = {
  order_id: string;
  event: PushEvent;
  drink: Record<Language, string>;
  branch: Record<Language, string>;
  tokens: { token: string; environment: "sandbox" | "production"; language: Language }[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function message(event: PushEvent, drink: string, branch: string, language: Language) {
  if (language === "en") {
    switch (event) {
      case "approved":
        return { title: "Order accepted", body: `Your ${drink} is being prepared at ${branch}.` };
      case "ready":
        return { title: "Your order is ready", body: `${drink} is ready for pickup at ${branch}.` };
      case "handover":
        return { title: "Confirm your pickup", body: `The cashier is handing you your ${drink}. Open the app to confirm.` };
      case "rejected":
        return { title: "Order declined", body: `Your ${drink} wasn't counted against your balance.` };
    }
  }

  switch (event) {
    case "approved":
      return { title: "تم قبول طلبك", body: `جاري تجهيز ${drink} في ${branch}.` };
    case "ready":
      return { title: "طلبك جاهز", body: `${drink} جاهز للاستلام من ${branch}.` };
    case "handover":
      return { title: "أكّد استلام طلبك", body: `الكاشير يسلّمك ${drink}، افتح التطبيق وأكّد الاستلام.` };
    case "rejected":
      return { title: "تم رفض طلبك", body: `ما انحسب ${drink} من رصيدك.` };
  }
}

// APNs provider token ---------------------------------------------------

function base64url(input: ArrayBuffer | string) {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function providerToken() {
  const pem = APNS_PRIVATE_KEY.replace(/\\n/g, "\n")
    .replace(/-----[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (char) => char.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );

  const header = base64url(JSON.stringify({ alg: "ES256", kid: APNS_KEY_ID }));
  const claims = base64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );

  return `${header}.${claims}.${base64url(signature)}`;
}

// Handler -----------------------------------------------------------------

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization) return json({ error: "not_authenticated" }, 401);

  let orderId: unknown;
  try {
    ({ order_id: orderId } = await request.json());
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    return json({ error: "invalid_order_id" }, 400);
  }

  // Can this caller see the order?
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: visible } = await userClient.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (!visible) return json({ error: "forbidden" }, 403);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: claim, error: claimError } = await admin.rpc("order_push_claim", { _order_id: orderId });
  if (claimError) return json({ error: claimError.message }, 500);
  if (!claim) return json({ sent: 0 });

  const { event, drink, branch, tokens } = claim as Claim;
  if (tokens.length === 0) return json({ sent: 0 });

  if (!APNS_KEY_ID || !APNS_PRIVATE_KEY) {
    console.error("order-push: APNS_KEY_ID / APNS_PRIVATE_KEY not set");
    return json({ error: "apns_not_configured" }, 500);
  }

  const jwt = await providerToken();
  let sent = 0;

  await Promise.all(
    tokens.map(async ({ token, environment, language }) => {
      const host = environment === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
      const { title, body } = message(event, drink[language] || drink.ar, branch[language] || branch.ar, language);

      const response = await fetch(`https://${host}/3/device/${token}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": APNS_BUNDLE_ID,
          "apns-push-type": "alert",
          "apns-priority": "10",
          // A newer update for the same order replaces the older one.
          "apns-collapse-id": orderId as string,
        },
        body: JSON.stringify({
          aps: {
            alert: { title, body },
            sound: "default",
            "thread-id": orderId,
            ...(event === "handover" ? { category: "ORDER_HANDOVER" } : {}),
          },
          order_id: orderId,
          event,
        }),
      });

      if (response.ok) {
        sent += 1;
        return;
      }

      const reason = await response.text();
      console.error("order-push: APNs", response.status, reason);

      if (response.status === 410 || reason.includes("BadDeviceToken") || reason.includes("Unregistered")) {
        await admin.rpc("order_push_drop_token", { _token: token });
      }
    }),
  );

  return json({ sent });
});
