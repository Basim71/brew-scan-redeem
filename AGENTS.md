<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Social sign-in

All social providers sign in through the generated `lovable.auth.signInWithOAuth` module in `src/integrations/lovable/index.ts`, with a same-origin `redirect_uri` — never hand-roll OAuth or call the Supabase auth client directly for a provider. Why: provider enablement lives in backend config, and a client that bypasses the generated module drifts from it and fails with "Unsupported provider".
- Offline mode uses vite-plugin-pwa (generateSW) registered only via src/lib/register-sw.ts; never in preview/dev — avoids stale caches in the editor.

## Offline orders
- Verify customer QR tokens using Web Crypto against immutable registered device keys; refresh branch-scoped key caches while online so unregistered or modified tokens cannot redeem offline.
- Serialize offline synchronization using the subscription row lock and count pending plus approved orders on the served Riyadh date so retries and concurrent cashiers respect plan limits.

- Public pages never read `branches` directly (anon has no access); use `scan_list_public_branches` / `scan_resolve_qr` RPCs. Why: the table holds QR tokens.
- Cashiers create customers only via `cashier_register_customer`; direct inserts require manager rights. Why: validation and duplicate prevention live in the function.
