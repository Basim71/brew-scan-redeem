# KOB Reorganization — Phase 1

## Safety

No original project files were deleted.

Backups of the replaced layout files are preserved in:

- `src/legacy/routes/admin.tsx.bak`
- `src/legacy/routes/cashier.tsx.bak`
- `src/legacy/routes/auth.tsx.bak`
- `src/legacy/styles.css.bak`

## Implemented

- Extracted role-based access control into `src/components/layouts/RoleGate.tsx`.
- Extracted the shared floating navigation into `src/components/layouts/FloatingIsland.tsx`.
- Added the shared staff workspace shell in `src/components/layouts/AppWorkspace.tsx`.
- Rebuilt the admin layout to use the floating island.
- Rebuilt the cashier layout to use the same isolated workspace and removed its sidebar.
- Kept all existing TanStack route paths unchanged, so `routeTree.gen.ts` does not need manual edits.
- Fixed a malformed CSS comment that caused the login style block to be parsed incorrectly.
- Isolated the login route and forced its card to remain centered independently of staff layouts.
- Changed Sonner notifications from dark to light styling.
- Added an isolated `app-*` CSS namespace for the new layout to reduce interference from legacy selectors.

## Verification

- CSS opening and closing brace counts were checked.
- Existing routes and features were retained.
- A full Vite build could not be executed in the container because dependencies were not installed and package installation exceeded the runtime timeout.

Run locally:

```bash
npm install
npm run build
npm run dev
```
