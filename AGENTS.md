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
