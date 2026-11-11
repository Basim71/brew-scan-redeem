import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (request && new URL(request.url).pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const DASHBOARD_PREFIXES = ["/admin", "/platform", "/cashier"];
const DASHBOARD_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Dashboards must never be framed (clickjacking). Only in production: the editor preview frames the dev server.
const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const result = await next();
  if (!import.meta.env.PROD || !request) return result;
  const path = new URL(request.url).pathname;
  if (!DASHBOARD_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return result;
  const res = (result as { response?: Response }).response ?? (result as unknown as Response);
  if (res && res.headers && typeof res.headers.set === "function") {
    try {
      res.headers.set("Content-Security-Policy", DASHBOARD_CSP);
      res.headers.set("X-Frame-Options", "DENY");
    } catch {
      /* immutable headers */
    }
  }
  return result;
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [securityHeadersMiddleware, errorMiddleware],
}));
