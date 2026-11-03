# Groups and Sharing Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Deliver real group discussions/invitations and usable website/post sharing.
**Architecture:** Separate RLS-protected group data; modular route components; a reusable share dialog; safe authentication return destinations. Integrate with the existing build-patch pipeline rather than committing its unrelated generated changes.
**Tech Stack:** React 18, React Router 7, Vite 6, Supabase Postgres, node:test/jsdom.
**Spec:** docs/superpowers/specs/2026-11-03-groups-and-sharing.md

## Global Constraints
- No fake accounts or activity in production.
- Group discussions require membership; shared links retain sign-in and content permissions.
- User chooses recipients and sends invitations/shares explicitly.
- Reuse the existing Neighborly deployment and production database; additive migration only.

## Review Focus
- Nonmembers, blocked users, suspended accounts, and forged author/recipient IDs cannot bypass RLS.
- Failed saves preserve drafts and do not claim success; leaving a group removes access.
- Expired or changed sessions cannot act as the previous member.
- Signed-out shared links survive registration and confirmation without an open redirect.
- Unsupported sharing/clipboard APIs, cancellation and unavailable posts have clear fallback states.

### Task 1: Sharing and return paths
Files: src/lib/sharing.mjs; src/app/components/ShareButton.tsx; tests/sharing/*; AppRouter.tsx; auth destination build patch.
- [x] Write/run failing tests for stable canonical links, safe return paths, email/text encoding, copy failure and native-share cancellation.
- [x] Implement the share dialog and routing utilities; keep shared content out of message payloads.
- [x] Test the dialog with jsdom and run focused tests.

### Task 2: Group persistence and permissions
Files: supabase/migrations/*_group_discussions_and_invites.sql; tests/groups/permissions.sql.
- [x] Write rollback-only SQL checks for member/outsider/blocked access, author spoofing, invitation acceptance, duplicate invitations and empty content.
- [x] Implement additive tables, indexes, RLS policies and invoker invitation acceptance RPC.
- [x] Exercise migration and permission tests against PostgreSQL transactionally, retaining no test data.

### Task 3: Group pages and invitation UI
Files: src/app/components/groups/*; tests/groups/*; CommunitySidebar.tsx; AppRouter.tsx; scripts/patch-groups-and-sharing.mjs.
- [x] Write/run failing interaction tests for joining, persisted discussion/reply, failed save draft preservation, invitation handling and nonmember gating.
- [x] Implement discussion, replies, membership, member invitation search and notification inbox.
- [x] Integrate group links, website/post Share controls and safe auth return paths using idempotent patches.
- [x] Run full suite/build (59 passing tests, production build passed).
- [ ] Inspect live UI after deployment; local browser preview is unreachable from the cloud browser.

### Task 4: Review and release
- [x] Obtain independent review; fix material findings with regression tests.
- [x] Apply additive migration and inspect deployed RLS/permissions read-only. Fixture permission tests run only in isolated PostgreSQL.
- [ ] Commit/push a branch, open PR, validate preview/CI and merge within the requested implementation scope.
- [ ] Verify production build and routes and report any verification limits.
