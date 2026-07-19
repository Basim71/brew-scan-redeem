# KOB Phase 3.2 — Customer Success

Implemented:

- Company Customer Success dashboard and case creation.
- Case categories, priority, session preference and explicit permissions.
- Company case workspace with shared messages.
- Platform case queue, realtime updates, search and status filters.
- Platform case workspace, assignment, workflow transitions and internal notes.
- Immutable case numbering (`CS-YYYY-######`).
- Case status audit events and customer feedback storage.
- Tenant-aware RLS: company members see only their company; internal notes remain platform-only.

Run migration:

`supabase/migrations/20260719120000_customer_success_cases.sql`
