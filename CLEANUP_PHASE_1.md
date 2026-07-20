# Cleanup phase 1

Completed:

- Removed accidental root-level `download*` files.
- Removed obsolete backup files under `src/legacy`.
- Removed empty/corrupted placeholder files under old platform/support module folders.
- Removed the unused Shadcn UI component inventory and its mobile-only helper.
- Removed packages that were only referenced by the deleted unused UI inventory.
- Moved historical phase notes into `docs/archive`.
- Moved the platform owner SQL bootstrap script into `database/setup`.
- Added a canonical project structure document.
- Kept active routes, business logic, providers, Supabase integration, and runtime styles unchanged.

Next phase:

- Split large route components into feature modules.
- Consolidate authentication/session boundaries.
- Regenerate and validate the TanStack route tree from route files.
- Removed the stale Bun lock/config files after dependency pruning; the deployment environment should create a fresh lockfile from `package.json`.
