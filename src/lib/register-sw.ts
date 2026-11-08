const SW_PATH = "/sw.js";

function isRefusedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname.toLowerCase();
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  const first = host.split(".")[0];
  if (/\.(lovable\.app|gpt-eng\.com|gptengineer\.run)$/.test(host)) {
    if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
    if (/^project--.+-dev$/.test(first)) return true;
  }
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterAppSW() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs.filter((r) => r.active?.scriptURL.endsWith(SW_PATH) || r.installing?.scriptURL.endsWith(SW_PATH) || r.waiting?.scriptURL.endsWith(SW_PATH)).map((r) => r.unregister()),
  );
}

/** Single place that registers the offline worker. Call from useEffect only. */
export function registerAppServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (isRefusedContext()) {
    void unregisterAppSW().catch(() => undefined);
    return;
  }
  void navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch(() => undefined);
}
