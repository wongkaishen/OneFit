# OneFit Frontend — Ground-up UI/UX Rebuild

Date: 2026-06-29
Direction chosen by you: **bold, obvious refresh** while **keeping the sharp editorial corners**; palette stays cream / charcoal / coral.

## Approach

A literal "scaffold a new Next.js app and re-wire every page from scratch" would have broken the working Supabase auth, the typed API client, the offline queue, and the AI endpoints documented in `CLAUDE.md`. Instead I rebuilt the **entire design layer** — tokens, app shell, every shared component, and the page layouts — on top of the existing, working data/auth logic. Same ground-up new look, no functional demolition.

Verification: `tsc --noEmit` passes clean; pages were clicked through live in Chrome across Gym, Specialist, and Admin at desktop and reduced widths.

## New foundation

- **Tokens (`tailwind.config.ts`)** — added `paper`, `cream-deep`, `coral-soft`, `good-soft`, `border-strong`; shadow scale (`card`, `raised`, `pop`); a `fade-in` animation.
- **Globals (`app/globals.css`)** — antialiasing, thin on-brand scrollbars, native date/time picker theming, `accent-color`, reduced-motion support, and `.of-surface` / `.of-eyebrow` utilities.

## New / rebuilt shell

- **Sidebar** — monoline icons per item (new `Icon.tsx`), a **solid charcoal active state** with a coral marker, a "Menu" group label, the new square logo mark, and a role footer. Off-canvas drawer with dimmed backdrop on mobile; inline rail on desktop.
- **TopBar** — sticky, serif page title, bordered search, hamburger on mobile.
- **Page primitives (`Page.tsx`)** — `PageBody` (centered max-width + padding + entrance animation), `PageHeader` (eyebrow + lead + actions), `Section`.

## New / upgraded components

`Card` + `CardHeader` (depth via shadow), `Button` (depth, `soft`/`lg` variants, focus ring, `fullWidth`), `Field` set (`FormField`, `Input`, `Select` with custom chevron, `Textarea`, styled `FileInput`), `Badge` (soft-filled tones), `Chip` (hover/focus), `Stat` (serif metric), `EmptyState` (icon + dashed card + action), `Skeleton`/`SkeletonCard`, `Icon`.

## Pages rebuilt on the new system

**Entry:** Login, Register (carded, new mark, styled inputs).

**Gym (all 12):** Dashboard (calorie card + skeletons + stat cards + quick-action cards), Plans, Activity, Diet, Progress, Meal Plans (carded master/detail), Feedback, Calendar (responsive form + carded list), Community, Messages, Notifications, Profile.

**Shared:** Messaging (responsive two-pane → single-pane on mobile, chat bubbles, avatars, unread badges), NotificationsPage (carded list + modal), MealPlanCard.

**Specialist / Admin hubs:** Specialist Clients (carded, scrollable table, empty state), Admin Dashboard (Stat cards + carded activity feed).

## Specialist + Admin sub-pages — now fully card-converted

Every remaining page has been rebuilt on `PageBody` / `PageHeader` / `Card` with the new field
components, carded tables (horizontally scrollable where wide), and icon empty states:

Specialist: Tasks, Plans, Content, Announce, Community, Reports, and the client detail page.
Admin: Users, Specialist approvals, Announcements, Programs, Security.

The whole app — every role, every screen — now runs on the one design system. `tsc --noEmit`
passes clean and `next lint` is clean apart from two pre-existing `<img>` advisories (QR code,
progress photo).

## Note on the dev-only hydration warning

A recoverable React hydration warning appears app-wide (even on the minimal login page) and switches the root to client rendering. Its signature — present on a page with no dynamic content — points to a **browser extension** (e.g. the password manager seen autofilling the login form) modifying the DOM before hydration, not the rebuild; every page renders correctly. `suppressHydrationWarning` was added to `<html>`/`<body>` as the standard mitigation.

## Suggested next steps

1. Replace any remaining bare `Loading…` text with `Skeleton` for a more polished load.
2. Confirm production PWA behaviour with `npm run build && npm run start` (service worker is disabled in dev).
