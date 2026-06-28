# OneFit — Feature/Function Verification Against Codebase

Verifies `onefit_functions_and_features.md` against the actual implementation
(backend FastAPI routers + Supabase migrations/ORM, and frontend Next.js routes).

**Date:** 2026-06-28
**Legend:** ✅ Implemented · 🟡 Partial · ❌ Missing · ⚙️ Deferred by design (AI/501) · ➖ Non-functional / deploy-only (not in code)

Evidence paths are relative to repo root.

---

## A. Gym User

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Gym User Registration | ✅ | `POST /auth/register`, `app/register/page.tsx`. Email verification handled by Supabase GoTrue. |
| 2 | Gym User Login | ✅ | `POST /auth/login`, `app/login/page.tsx`, `lib/auth/session.ts`. |
| 3 | Manage Profile | ✅ | `GET/PUT /gym/profile`, `app/gym/profile/page.tsx`. |
| 4 | Create Personalized Workout Plan (AI) | 🟡 | Manual plan create only (`POST /gym/plans`, `app/gym/plans`). The **AI generation** is ⚙️ `POST /ai/workout-plan` returns 501. |
| 5 | Accept Workout Plan | 🟡 | Saving a manual plan = accept. No accept/reject flow over an AI-proposed plan (AI deferred). |
| 6 | Edit Workout Plan | ❌ | No `PUT/PATCH /gym/plans/{id}`. Plans can be created but not edited. |
| 7 | Discard Workout Plan | ❌ | No `DELETE /gym/plans/{id}`. No discard endpoint or UI. |
| 8 | Request AI Review for Edited Plan | ⚙️ | AI subsystem deferred (501). |
| 9 | Log Daily Activity | ✅ | `POST /gym/activity`, `app/gym/activity/page.tsx`. |
| 10 | Manual Workout Entry | ✅ | Activity log fields (type/duration/etc.) in the same flow. |
| 11 | Wearable Device Sync | ❌ | Not implemented anywhere. |
| 12 | Offline Activity Logging | ❌ | Not implemented — the PWA layer was removed in the `app/` rebuild. |
| 13 | Calculate Calories Burned | 🟡 | `calories_burned` is stored and summed on the dashboard, but it is **entered manually**; there is no estimation engine. |
| 14 | Weekly Consistency Metrics | ❌ | No weekly/consistency/streak computation in the dashboard endpoint or UI. |
| 15 | Add Calories per Day (quick) | ✅ | `POST /gym/diet` accepts calories-only (macros optional). |
| 16 | Log Dietary Intake | ✅ | `POST /gym/diet`, `app/gym/diet/page.tsx`. |
| 17 | Quick Add Calories | ✅ | Same flow as #15 (calories-only path). |
| 18 | Nutrition API Food Search | ⚙️ | `GET /ai/nutrition/search` returns 501. |
| 19 | Daily Calorie Counter | ✅ | `GET /gym/dashboard`, dashboard page. |
| 20 | Macro Tracking | ✅ | protein/carbs/fat captured in diet log + types. |
| 21 | Calorie Progress Ring Chart | ✅ | `CalorieRing` component in `app/gym/dashboard/page.tsx`. |
| 22 | View Recommended Meal Plan | ✅ | `GET /gym/meal-plans`, `app/gym/meal-plans/page.tsx` (specialist-published plans). |
| 23 | Update Progress | ✅ | `POST /gym/progress`, `app/gym/progress/page.tsx`. |
| 24 | Progress Photo Upload | 🟡 | `progress_entries.photo_url` column exists, but there is **no upload UI and no Storage wiring**; only weight/body-fat are captured. |
| 25 | Progress Trend Graphs | 🟡 | A text trend summary is built; **no visual chart** on the progress page (a `BarChart` primitive exists but is not used here). |
| 26 | AI Recalculate Workout/Diet Targets | ⚙️ | AI deferred (501). |
| 27 | Achievement Badge / Milestone | ✅ | `services/milestones.py`, `GET /gym/milestones`, rendered on progress page. |
| 28 | Share Progress | 🟡 | Native share-sheet/clipboard fallback only. **No OneFit Community / Instagram / WhatsApp** integration. |
| 29 | Generate Share Graphic | ❌ | Shares plain text; no formatted graphic with logo. |
| 30 | Schedule Workout / Calendar | ✅ | `GET/POST /gym/sessions`, `app/gym/calendar/page.tsx`. |
| 31 | Workout Conflict Detection | 🟡 | Backend rejects a clashing slot with **409**, but does **not suggest an alternative slot**. |
| 32 | Workout Reminder | ❌ | No reminder notification is created when a session is scheduled. |
| 33 | Receive Notification | ✅ | `notifications` subsystem + `NotificationsPage`. |
| 34 | Notification Centre / Read Status | ✅ | `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all`. |
| 35 | Receive Specialist Feedback | ✅ | `GET /gym/feedback`; specialist `POST /specialist/feedback` notifies the user. |

---

## B. Wellness Specialist

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Wellness Specialist Registration | ✅ | `POST /auth/register` with `role=wellness_specialist`; seeds `wellness_specialists` row. |
| 2 | Credential Upload | ❌ | No credential/file upload; `specialization` is seeded with a placeholder. |
| 3 | Pending Admin Approval | 🟡 | `approval_status` defaults to `pending` and `/admin/registrations` approve/reject exists, **but** accounts are set `active` on signup (per CLAUDE.md), so the gate is not fully enforced. |
| 4 | Wellness Specialist Login | ✅ | Shared login + role routing to `/specialist/clients`. |
| 5 | View Assigned Gym Users | ✅ | `GET /specialist/clients`, `app/specialist/clients/page.tsx`. |
| 6 | Review User Progress Reports | ✅ | `GET /specialist/clients/{id}/activity|diet|progress`, client detail page. |
| 7 | Monitor Overall Health Trends | ✅ | `GET /specialist/health-trends`, `app/specialist/reports/page.tsx`. |
| 8 | Assign Customized Wellness Tasks | 🟡 | Backend `POST /specialist/tasks` exists, **but no frontend page** for it. |
| 9 | Send Task Notification | ✅ | `assign_task` calls `notify(...)` to the target user. |
| 10 | Manage Educational Content | ✅ | `GET/POST/PATCH /specialist/content`, `app/specialist/content/page.tsx`. |
| 11 | Upload Educational Material | 🟡 | Text content supported; **no media/file upload**. |
| 12 | Edit Educational Content | ✅ | `PATCH /specialist/content/{id}`. |
| 13 | Remove Educational Content | 🟡 | Done via status → `Archived`; **no hard DELETE** endpoint. |
| 14 | Provide Professional Feedback | ✅ | `POST /specialist/feedback`. |
| 15 | Consultation Support | ❌ | No consultation/messaging feature. |
| 16 | Feedback-Based Plan Recalculation | ⚙️ | The auto-recalculation is AI-deferred; feedback is stored/notified but does not recalc a plan. |
| 17 | Monitor Community Groups | 🟡 | Backend `GET /specialist/community/groups` + posts exist, **no frontend page**. |
| 18 | Moderate Community Posts | 🟡 | Backend `POST /specialist/community/posts/{id}/moderate`, **no frontend page**. |
| 19 | Post Community Updates | 🟡 | `app/specialist/announce` posts an **announcement**; no community-post create endpoint. |
| 20 | Review Health Trends to Improve Program | ✅ | `GET /specialist/health-trends`, reports page. |
| 21 | Trend-Based Recommendation | 🟡 | `POST /specialist/health-trends` records a trend; no automated recommendation action. |
| 22 | Feedback Draft Auto-Save | ❌ | No local draft auto-save. |

---

## C. Admin

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Admin Registration | 🟡 | By design admins are **seeded in Supabase** and cannot self-register (`_ensure_admin_row`). No registration UI. |
| 2 | Admin Login | ✅ | Shared login + routing to `/admin/dashboard`. |
| 3 | Admin Two-Factor Authentication | ❌ | No 2FA. |
| 4 | View All Users | ✅ | `GET /admin/users`, `app/admin/users/page.tsx`. |
| 5 | Manage Users | ✅ | `PATCH /admin/users/{id}/status` and `/role`. |
| 6 | Approve Member Registration | ✅ | `GET /admin/registrations`, `POST .../approve`. |
| 7 | Approve Specialist Registration | ✅ | Same approval endpoints (role-aware). |
| 8 | Suspend Membership | ✅ | `status = suspended`. |
| 9 | Reinstate Suspended Membership | ✅ | `status = active`. |
| 10 | Assign User Roles | ✅ | `PATCH /admin/users/{id}/role`. |
| 11 | Monitor User Activity | 🟡 | `GET /admin/stats` + `/audit-log` give aggregate/admin-action views; **no per-user activity monitor**. |
| 12 | Remove Inactive Programs | ✅ | `GET /admin/programs`, `POST /admin/programs/{id}/remove`. |
| 13 | Send Announcements to Members | ✅ | `GET/POST /admin/announcements`, `app/admin/announcements/page.tsx`. |
| 14 | Notify Members of Program Updates | 🟡 | Backend `POST /admin/notifications` exists; the admin **notifications page is an inbox only** (no compose UI). |
| 15 | Audit Log Tracking | ✅ | `audit_logs` table + `services/audit.py` + `GET /admin/audit-log`. |
| 16 | Suspicious Login Monitoring | ❌ | Not implemented. |

---

## D. Platform / System

| # | Feature | Status | Evidence / Notes |
|---|---|---|---|
| 1 | Role-Based Access Control | ✅ | `core/security.py` `require_role`, `components/shell/AuthGate.tsx`. |
| 2 | Supabase Authentication | 🟡 | Email/password via GoTrue is wired; **OAuth providers not configured** in code. |
| 3 | Supabase PostgreSQL Database | ✅ | Migrations `0001–0011`, async SQLAlchemy. |
| 4 | Supabase Row-Level Security | ✅ | `0002_rls.sql`, `0010_meal_plans_rls.sql`. |
| 5 | Cloud Storage | ❌ | `photo_url` columns exist but no Storage bucket integration/upload code. |
| 6 | FastAPI Backend | ✅ | `backend/app/main.py`. |
| 7 | Next.js Frontend | ✅ | `frontend/app` (App Router). |
| 8 | Vercel Hosting | ➖ | Deployment concern; not verifiable from repo. |
| 9 | AI Plan Generation | ⚙️ | `POST /ai/workout-plan` → 501. |
| 10 | AI Feedback Generation / Summary | ⚙️ | Deferred (no endpoint; roadmap seam only). |
| 11 | AI Plan Recalculation | ⚙️ | Deferred. |
| 12 | Nutrition Lookup Integration | ⚙️ | `GET /ai/nutrition/search` → 501. |
| 13 | Pose / Model Inference | ⚙️ | Deferred (mentioned in SDS only). |
| 14 | Notification Service | ✅ | `services/notification.py`. |
| 15 | Email Service | 🟡 | Email verification handled by Supabase; **no custom email flow** in app. |
| 16 | Responsive Web Application | 🟡 | Tailwind + fixed-sidebar shell; not explicitly mobile-responsive (sidebar is fixed, not breakpoint-based). |
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
- Edit / Discard Workout Plan (no update/delete plan endpoints).
- Wearable Device Sync, Offline Activity Logging.
- Weekly Consistency Metrics.
- Generate Share Graphic; Workout Reminder notifications.
- Specialist: Credential Upload, Consultation Support, Feedback Draft Auto-Save.
- Admin: Two-Factor Authentication, Suspicious Login Monitoring.
- Cloud Storage integration.

**Partial (🟡) — backend exists but no UI, or feature is half-wired:**
- Specialist Wellness Tasks, Community monitoring/moderation (backend only, no pages).
- Progress Photo Upload & Progress Trend chart (schema/data present, UI missing).
- Calories Burned (manual, not estimated); Conflict Detection (rejects but no suggestion).
- Share Progress (no social targets); Admin "Notify of Program Updates" (no compose UI).
- Pending Admin Approval gate (not fully enforced — accounts active on signup).

**Deferred by design (⚙️) — return 501, frontend shows "AI coming soon":**
- All AI features: plan generation, AI review/recalculation, AI feedback summaries, nutrition API search, pose/model inference.

**Not code-verifiable (➖):** hosting, HTTPS, all performance/uptime/backup NFRs.

---

## Questions to confirm

1. **AI features** are intentionally 501 stubs per CLAUDE.md ("501 is a feature"). Should the report treat them as *missing* or *intentionally deferred*? (Currently marked ⚙️ deferred.)
2. **Workout plan Edit/Discard** (A6/A7) — these are genuinely absent. Do you want them added, or were they meant to be AI-only flows?
3. **Specialist Tasks & Community** (B8/B17/B18) — backend is built but there are no frontend pages. Should I count these as done (API contract exists) or flag for UI work?
4. Should "Pending Admin Approval" stay active-on-signup (current behavior) or actually block login until approved?
