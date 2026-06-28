# OneFit — Feature/Function Verification Against Codebase

Verifies `onefit_functions_and_features.md` against the actual implementation
(backend FastAPI routers + Supabase migrations/ORM, and frontend Next.js routes).

**Date:** 2026-06-29
**Legend:** ✅ Implemented · 🟡 Partial · ❌ Missing · ⚙️ Deferred by design (AI/501) · ➖ Non-functional / deploy-only (not in code)

Evidence paths are relative to repo root.

---

## A. Gym User

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Gym User Registration | ✅ | `POST /auth/register`, `app/register/page.tsx`. Email verification handled by Supabase GoTrue. |
| 2 | Gym User Login | ✅ | `POST /auth/login`, `app/login/page.tsx`, `lib/auth/session.ts`. |
| 3 | Manage Profile | ✅ | `GET/PUT /gym/profile`, `app/gym/profile/page.tsx`. |
| 4 | Create Personalized Workout Plan (AI) | ✅ | Manual plan + AI generation via `POST /ai/workout-plan` (key-gated; returns 501 without `OPENAI_API_KEY`). `app/gym/plans/page.tsx` "Generate with AI" button calls OpenAI generate + accept flow. **Caveat:** the generator sends only the goal string; the user's `FitnessProfile` is not yet loaded into the prompt, so personalisation is limited to what the user types. |
| 5 | Accept Workout Plan | ✅ | Accept/reject AI proposal UI added (`app/gym/plans/page.tsx`); `POST /gym/plans/ai-accept` persists plan + exercises with `generated_by='openai'`. |
| 6 | Edit Workout Plan | ✅ | `PATCH /gym/plans/{id}`, plans page edit UI (`app/gym/plans/page.tsx`). |
| 7 | Discard Workout Plan | ✅ | `DELETE /gym/plans/{id}`, plans page discard action (`app/gym/plans/page.tsx`). |
| 8 | Request AI Review for Edited Plan | ⚙️ | AI subsystem deferred (501). |
| 9 | Log Daily Activity | ✅ | `POST /gym/activity`, `app/gym/activity/page.tsx`. |
| 10 | Manual Workout Entry | ✅ | Activity log fields (type/duration/etc.) in the same flow. |
| 11 | Wearable Device Sync | ❌ | Not implemented anywhere. |
| 12 | Offline Activity Logging | ✅ | `lib/offlineQueue.ts` — queues failed/offline activity logs in `localStorage`; auto-flushes on `online` event. Activity page shows pending-sync banner + manual "Sync now" button. Service worker (next-pwa/Workbox) caches app shell for offline navigation. |
| 13 | Calculate Calories Burned | ✅ | `services/calories.py` estimator wired into `POST /gym/activity`; MET-based auto-estimation on log submit. |
| 14 | Weekly Consistency Metrics | ✅ | `services/metrics.py` + dashboard endpoint fields (`active_days_this_week`, `current_streak`, `weekly_goal`) rendered in `app/gym/dashboard/page.tsx`. |
| 15 | Add Calories per Day (quick) | ✅ | `POST /gym/diet` accepts calories-only (macros optional). |
| 16 | Log Dietary Intake | ✅ | `POST /gym/diet`, `app/gym/diet/page.tsx`. |
| 17 | Quick Add Calories | ✅ | Same flow as #15 (calories-only path). |
| 18 | Nutrition API Food Search | ✅ | `GET /ai/nutrition/search` (key-gated OpenAI); "Look up" button in `app/gym/diet/page.tsx` pre-fills form. Returns 501 without `OPENAI_API_KEY`. |
| 19 | Daily Calorie Counter | ✅ | `GET /gym/dashboard`, dashboard page. |
| 20 | Macro Tracking | ✅ | protein/carbs/fat captured in diet log + types. |
| 21 | Calorie Progress Ring Chart | ✅ | `CalorieRing` component in `app/gym/dashboard/page.tsx`. |
| 22 | View Recommended Meal Plan | ✅ | `GET /gym/meal-plans`, `app/gym/meal-plans/page.tsx` (specialist-published plans). |
| 23 | Update Progress | ✅ | `POST /gym/progress`, `app/gym/progress/page.tsx`. |
| 24 | Progress Photo Upload | ✅ | `POST /gym/progress/photo` (multipart) stores file in `onefit-public` bucket via `services/storage.py`; `photo_url` returned and rendered in `app/gym/progress/page.tsx`. Tasks 4/9. |
| 25 | Progress Trend Graphs | ✅ | `BarChart` component wired onto `app/gym/progress/page.tsx` rendering weight trend over last entries. |
| 26 | AI Recalculate Workout/Diet Targets | 🟡 | Endpoint `POST /ai/recalculate-targets` (key-gated) + `recalcTargets()` wrapper in `lib/api/ai.ts` exist, but **no UI control calls them** — no button or form in any gym page invokes `recalcTargets()`. |
| 27 | Achievement Badge / Milestone | ✅ | `services/milestones.py`, `GET /gym/milestones`, rendered on progress page. |
| 28 | Share Progress | ✅ | In-app community sharing: "Share to community" button on `/gym/progress` deep-links to `/gym/community?share=<text>` pre-filling the post box (`gymCreatePost`). Native share-sheet fallback retained. External social (Instagram/WhatsApp) is intentionally out of scope. |
| 29 | Generate Share Graphic | ✅ | "Download graphic" button on `/gym/progress` calls `renderShareGraphic()` in `frontend/lib/shareGraphic.ts` which draws a branded 1080×1080 PNG on an offscreen `<canvas>` (cream bg, coral bar, OneFit wordmark, latest weight + trend labels) and triggers download. No backend or external service. |
| 30 | Schedule Workout / Calendar | ✅ | `GET/POST /gym/sessions`, `app/gym/calendar/page.tsx`. |
| 31 | Workout Conflict Detection | ✅ | 409 response names the next free slot via `services/scheduling.py` `suggest_alternative_slot`. |
| 32 | Workout Reminder | ✅ | Reminder notification created on session create (`POST /gym/sessions`) via `services/notification.py`. |
| 33 | Receive Notification | ✅ | `notifications` subsystem + `NotificationsPage`. |
| 34 | Notification Centre / Read Status | ✅ | `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`. |
| 35 | Receive Specialist Feedback | ✅ | `GET /gym/feedback`; specialist `POST /specialist/feedback` notifies the user. |

---

## B. Wellness Specialist

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Wellness Specialist Registration | ✅ | `POST /auth/register` with `role=wellness_specialist`; seeds `wellness_specialists` row. |
| 2 | Credential Upload | ✅ | `POST /specialist/credential` (multipart) stores file in `onefit-credentials` bucket; upload control added to `app/specialist/content/page.tsx`. Tasks 8/11. **Caveat:** the backend upload endpoint and admin signed-URL view are fully wired, but because newly-registered specialists are `pending` and blocked at login (B3 gate), the credential-upload UI (behind AuthGate on the content page) is unreachable until after admin approval — upload-before-approval is a known follow-up. |
| 3 | Pending Admin Approval | ✅ | Task 5: new specialists' `profiles.status` is set to `pending` on signup (`_provision_subtype`). The login flow blocks `pending` accounts — `app/login/page.tsx` clears the token and shows "awaiting admin approval", so a pending specialist cannot enter the app. Admin approves via `GET /admin/registrations` + `POST .../approve` (→ `active`) or rejects via `.../reject` (→ `suspended`). Gate enforced at login. |
| 4 | Wellness Specialist Login | ✅ | Shared login + role routing to `/specialist/clients`. |
| 5 | View Assigned Gym Users | ✅ | `GET /specialist/clients`, `app/specialist/clients/page.tsx`. |
| 6 | Review User Progress Reports | ✅ | `GET /specialist/clients/{id}/activity|diet|progress`, client detail page. |
| 7 | Monitor Overall Health Trends | ✅ | `GET /specialist/health-trends`, `app/specialist/reports/page.tsx`. |
| 8 | Assign Customized Wellness Tasks | ✅ | `POST /specialist/tasks`, `GET /specialist/tasks`; `app/specialist/tasks/page.tsx` lists tasks and provides assign form. Tasks 6/7. |
| 9 | Send Task Notification | ✅ | `assign_task` calls `notify(...)` to the target user. |
| 10 | Manage Educational Content | ✅ | `GET/POST/PATCH /specialist/content`, `app/specialist/content/page.tsx`. |
| 11 | Upload Educational Material | ✅ | `POST /specialist/content/media` (multipart) stores file in `onefit-public` bucket; upload input in `app/specialist/content/page.tsx` form. Tasks 5/10. |
| 12 | Edit Educational Content | ✅ | `PATCH /specialist/content/{id}`. |
| 13 | Remove Educational Content | ✅ | `DELETE /specialist/content/{id}` hard-delete endpoint added (Task 6); `app/specialist/content/page.tsx` includes delete action. |
| 14 | Provide Professional Feedback | ✅ | `POST /specialist/feedback`. |
| 15 | Consultation Support | ✅ | `POST/GET /messages`, `GET /messages/threads`, `GET /messages/{partner_id}`; `app/gym/messages`, `app/specialist/messages`; "Message client" action on client detail. Active specialist_clients relationship enforced (403 otherwise). |
| 16 | Feedback-Based Plan Recalculation | 🟡 | Endpoint `POST /ai/recalculate-targets` (key-gated) + `recalcTargets()` wrapper in `lib/api/ai.ts` exist, but **no UI control calls them** — no specialist page invokes `recalcTargets()`. |
| 17 | Monitor Community Groups | ✅ | `GET /specialist/community/groups` + `GET .../groups/{id}/posts`; `app/specialist/community/page.tsx` lists all owned groups and their posts (B17). |
| 18 | Moderate Community Posts | ✅ | `POST /specialist/community/posts/{id}/moderate` (remove/warn/escalate); moderation buttons wired in `app/specialist/community/page.tsx` (B18). |
| 19 | Post Community Updates | ✅ | `POST /specialist/community/groups` (create group) + `POST .../groups/{id}/posts` (post update); both wired in `app/specialist/community/page.tsx` (B19). |
| 20 | Review Health Trends to Improve Program | ✅ | `GET /specialist/health-trends`, reports page. |
| 21 | Trend-Based Recommendation | ✅ | `POST /specialist/health-trends` returns `recommendation` string from `services/recommendations.py`; `app/specialist/reports/page.tsx` "Generate trend report" button shows recommendation in highlighted block. Tasks 3/14. |
| 22 | Feedback Draft Auto-Save | ✅ | `app/specialist/clients/[id]/page.tsx` persists feedback text to `localStorage` keyed by `onefit-feedback-draft-{id}` on every keystroke; cleared on submit. Task 9. |

---

## C. Admin

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Admin Registration | 🟡 | By design admins are **seeded in Supabase** and cannot self-register (`_ensure_admin_row`). No registration UI. |
| 2 | Admin Login | ✅ | Shared login + routing to `/admin/dashboard`. |
| 3 | Admin Two-Factor Authentication | ✅ | TOTP enroll (`POST /auth/mfa/enroll`) + verify (`POST /auth/mfa/verify`) via GoTrue MFA; `/admin/security` page with QR setup + code input. **Note:** AAL2 login enforcement (forcing MFA before access) is a Supabase Auth dashboard policy — enable "Require MFA for Admin" in the Supabase dashboard. Code delivers enrollment + verification. |
| 4 | View All Users | ✅ | `GET /admin/users`, `app/admin/users/page.tsx`. |
| 5 | Manage Users | ✅ | `PATCH /admin/users/{id}/status` and `/role`. |
| 6 | Approve Member Registration | ✅ | `GET /admin/registrations`, `POST .../approve` and `.../reject`; `app/admin/registrations/page.tsx` approve/reject UI. Task 10. |
| 7 | Approve Specialist Registration | ✅ | Same approval endpoints (role-aware); specialists listed by role filter. Task 10. |
| 8 | Suspend Membership | ✅ | `status = suspended`. |
| 9 | Reinstate Suspended Membership | ✅ | `status = active`. |
| 10 | Assign User Roles | ✅ | `PATCH /admin/users/{id}/role`. |
| 11 | Monitor User Activity | ✅ | `GET /admin/users/{id}/activity` returns per-user activity log; `app/admin/users/page.tsx` renders it. Tasks 4/6/13. |
| 12 | Remove Inactive Programs | ✅ | `GET /admin/programs`, `POST /admin/programs/{id}/remove`; `app/admin/programs/page.tsx`. Tasks 6/11. |
| 13 | Send Announcements to Members | ✅ | `GET/POST /admin/announcements`, `app/admin/announcements/page.tsx`. |
| 14 | Notify Members of Program Updates | ✅ | `POST /admin/notifications` sends targeted notifications; `app/admin/notifications/page.tsx` compose + send UI. Tasks 6/12. |
| 15 | Audit Log Tracking | ✅ | `audit_logs` table + `services/audit.py` + `GET /admin/audit-log`. |
| 16 | Suspicious Login Monitoring | ✅ | `public.login_events` table (migration `0014_login_events.sql`); `POST /auth/login` records every attempt (IP + user-agent, success/failure); `GET /admin/login-events` returns events with `suspicious` flag (≥5 failures/email in window); rendered on `/admin/security`. |

---

## D. Platform / System

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Role-Based Access Control | ✅ | `core/security.py` `require_role`, `components/shell/AuthGate.tsx`. |
| 2 | Supabase Authentication | ✅ | Email/password via GoTrue wired; Google OAuth button on `/login` redirects to GoTrue `/auth/v1/authorize?provider=google`; `/auth/callback` route handles token hash, stores it, and routes to `roleHome`. **Dashboard prerequisite:** enable Google provider in Supabase Auth dashboard + set `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`. |
| 3 | Supabase PostgreSQL Database | ✅ | Migrations `0001–0011`, async SQLAlchemy. |
| 4 | Supabase Row-Level Security | ✅ | `0002_rls.sql`, `0010_meal_plans_rls.sql`. |
| 5 | Cloud Storage | ✅ | Migration `0012_storage.sql` creates `onefit-public` + `onefit-credentials` buckets; `services/storage.py` (`upload_object`, `public_url`, `signed_url`); progress photo, content media, and specialist credential upload endpoints all wired. Tasks 2/3/4/5/6/8/9/10/11. |
| 6 | FastAPI Backend | ✅ | `backend/app/main.py`. |
| 7 | Next.js Frontend | ✅ | `frontend/app` (App Router). |
| 8 | Vercel Hosting | ➖ | Deployment concern; not verifiable from repo. |
| 9 | AI Plan Generation | ✅ | `POST /ai/workout-plan` — key-gated OpenAI; 501 without key. `app/gym/plans/page.tsx`. |
| 10 | AI Feedback Generation / Summary | ✅ | `POST /ai/feedback-summary` — key-gated; "AI draft" button in `app/specialist/clients/[id]/page.tsx`. |
| 11 | AI Plan Recalculation | 🟡 | `POST /ai/recalculate-targets` endpoint + `recalcTargets()` wrapper exist (key-gated), **no UI control wired yet** — no page calls `recalcTargets()`. |
| 12 | Nutrition Lookup Integration | ✅ | `GET /ai/nutrition/search` — key-gated OpenAI; pre-fills diet form. |
| 13 | Pose / Model Inference | ⚙️ | Deferred (mentioned in SDS only; out of scope for this project). |
| 14 | Notification Service | ✅ | `services/notification.py`. |
| 15 | Email Service | 🟡 | Email verification handled by Supabase; **no custom email flow** in app. |
| 16 | Responsive Web Application | 🟡 | Tailwind + fixed-sidebar shell; not explicitly mobile-responsive (sidebar is fixed, not breakpoint-based). **PWA installable:** `manifest.webmanifest` + coral icons + `@ducanh2912/next-pwa` service worker (prod-only). Full background-sync (Workbox BackgroundSync) approximated by the `online`-event flush in `offlineQueue.ts`. |
| 17 | Password Hashing | ✅ | Delegated to Supabase Auth (bcrypt); app never stores raw passwords. |
| 18 | HTTPS Secure Transmission | ➖ | Deployment/transport concern. |
| 19 | Dashboard Performance (<3s) | ➖ | Non-functional requirement; not code-verifiable. |
| 20 | Login Performance (<2s) | ➖ | Non-functional. |
| 21 | AI Plan Performance (<5s) | ➖ | Non-functional + AI deferred. |
| 22 | Daily Calorie UI Performance (<1s) | ➖ | Non-functional. |
| 23 | 99% Uptime Target | ➖ | Operational. |
| 24 | Daily Database Backup | ➖ | Supabase operational setting. |
| 25 | Accessibility Support | 🟡 | Design tokens (fonts/contrast) defined; no formal a11y audit. |

---

## Summary — what's missing or incomplete

**Clearly missing (❌):**
- Wearable Device Sync, Offline Activity Logging.
- Specialist: Consultation Support.
- Admin: Two-Factor Authentication, Suspicious Login Monitoring.

**Partial (🟡) — backend exists but no UI, or feature is half-wired:**
- Share Progress: external social (Instagram/WhatsApp) intentionally out of scope; in-app community sharing ✅.
- Supabase Auth OAuth providers not configured.

**Deferred by design (⚙️) — return 501, frontend shows "AI coming soon":**
- All AI features: plan generation, AI review/recalculation, AI feedback summaries, nutrition API search, pose/model inference.

**Not code-verifiable (➖):** hosting, HTTPS, all performance/uptime/backup NFRs.

---

## Questions to confirm

1. **AI features** are intentionally 501 stubs per CLAUDE.md ("501 is a feature"). Should the report treat them as *missing* or *intentionally deferred*? (Currently marked ⚙️ deferred.)
2. **Workout plan Edit/Discard** (A6/A7) — these are genuinely absent. Do you want them added, or were they meant to be AI-only flows?
3. **Specialist Tasks & Community** (B8/B17/B18) — backend is built but there are no frontend pages. Should I count these as done (API contract exists) or flag for UI work?
4. Should "Pending Admin Approval" stay active-on-signup (current behavior) or actually block login until approved?
