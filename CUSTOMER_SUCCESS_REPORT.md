# Customer Success & Technical Support — Report

## Scope
End-to-end Customer Success flow spanning `/admin/customer-success` (company) and `/platform/customer-success` (KOB platform). No database schema changes — all required tables, RLS policies, and helper functions were already present.

## Database (unchanged, verified)
Existing tables used:
- `customer_success_cases` — case lifecycle (`new → triaged → assigned → waiting_company/platform → scheduled → active → resolved → closed / cancelled`).
- `customer_success_case_messages` — shared + internal notes (RLS keeps internal notes platform-only).
- `customer_success_case_events` — trigger-populated timeline.
- `customer_success_feedback` — 1..5 rating + resolved flag + comment; only after case is resolved/closed.
- `support_requests` — approval flow for support access and training proposals.
- `support_sessions` — session lifecycle with `approval_expires_at`, `started_at`, `ended_at`, `mode`, voice/recording flags.
- `support_session_participants`, `support_messages`, `support_activity_log` — session runtime + audit trail.

RLS policies (unchanged) enforce:
- Company can see only its cases; platform can see all.
- Internal notes visible only to platform users.
- Feedback insertable only by company owner/admin/manager and only after resolved/closed.
- Session inserts restricted to platform users; company can update (approve/cancel).
- Activity log inserts restricted to platform + linked to session.

## Approval Flow
```
Case created (company)
  → Accepted / Assigned (platform)
  → Support access requested (platform → support_requests)
  → Company approval (respondRequest → status=accepted)
  → Session created + started (platform, bound to accepted request)
  → Session ended
  → Case resolved (platform)
  → Feedback (company)
```
- Sessions cannot start without an accepted `support_request`.
- Approval is time-bound via `approval_expires_at` (default 60 min).
- Every session start/end writes to `support_activity_log`.

## Company Experience — `/admin/customer-success`
- Inbox with priority badges, status tabs, search.
- Create case (category, priority, description, session preference, permission grants).
- Detail view (`admin.customer-success.$caseId`):
  - Shared conversation panel with realtime updates.
  - Approval cards for pending `support_requests` (accept / reject with decision timestamp).
  - Live session indicator when platform starts a session.
  - Close / reopen case controls (rules follow existing status guards).
  - Feedback form (rating 1..5 + resolved + comment) after resolution.
  - Sidebar: case metadata, granted permissions, timeline of events.

## Platform Experience — `/platform/customer-success`
- Case queue with priority-colored cards, search + tabs (open, waiting, scheduled, active, closed, all).
- Detail workspace (`platform.customer-success.$caseId`):
  - Actions: accept case, mark waiting-company, request support access, propose training, start / end session, resolve.
  - Internal notes composer (visibility toggle).
  - Live session pill with mode indicator.
  - Sidebar: case management, requests summary with statuses, full event timeline, company feedback summary.
- Request/training modal collects subject, priority, mode, duration, voice/recording flags, and optional scheduled time.
- Training list at `/platform/training` (existing) shows training-type support_requests with upcoming / past / all scopes.

## Voice & Co-browsing
- No remote desktop control implemented.
- Session record carries voice_enabled / recording_enabled flags gated by explicit company approval on the source `support_request`.
- Session lifecycle produces explicit start / end indicators (live pill) and audit-log entries.
- Company OS / device is never exposed; sessions scope to KOB app context only.

## Security
- Every server call goes through Supabase RLS (no admin key on client).
- `PlatformGate` + `ROLE_MATRIX` restrict `/platform/*` routes.
- Company routes protected by `RoleGate` on `/admin`.
- Internal notes protected by `customer_success_messages_select` policy — client uses the same query on both sides; company simply doesn't receive internal rows.
- Session insert requires platform role AND references company user id, matching an accepted support_request.
- All session state transitions call `logSupportActivity` → `support_activity_log`.

## Files

### Created
- `CUSTOMER_SUCCESS_REPORT.md`

### Rewritten
- `src/routes/admin.customer-success.$caseId.tsx` — full company workspace (timeline, approvals, session pill, feedback, close/reopen).
- `src/routes/platform.customer-success.$caseId.tsx` — full platform workspace (actions bar, request/training modal, session lifecycle, internal notes, sidebar with requests + timeline + feedback).

### Modified
- `src/features/customer-success/api.ts` — added `listCaseMessages`, `listCaseEvents`, `getCaseFeedback`, `submitCaseFeedback`, `listSupportRequestsForOrganization`, `createSupportRequest`, `updateSupportRequest`, `listSessionsForOrganization`, `createSupportSession`, `startSupportSession`, `endSupportSession`, `logSupportActivity`.
- `src/features/customer-success/types.ts` — added `CaseEvent`, `CaseMessage`, `CaseFeedback`, `SupportRequest`, `SupportSession`, `supportRequestStatusLabels`, `caseCategoryLabels`.
- `src/styles.css` — approvals, timeline, live pill, feedback form, request-list, muted helper.

### Untouched but re-verified
- `src/routes/admin.customer-success.tsx` (list + create form still valid).
- `src/routes/platform.customer-success.tsx` (queue + tabs still valid).
- `src/routes/platform.training.tsx` + `src/services/platform/training.service.ts` (training list).
- `src/routes/platform.support.tsx` / `platform.support.$caseId.tsx` (redirect shims).

## Validation
- `tsgo --noEmit`: exit 0 (clean).
- Preview: `GET /` → 200.
- Realtime channels subscribed on both sides for cases, messages, events, requests, sessions.
- Manual flow validated top-to-bottom against RLS: company creates case → platform requests access → company approves → platform starts session → ends session → resolves → company submits feedback.
- No schema migration required.