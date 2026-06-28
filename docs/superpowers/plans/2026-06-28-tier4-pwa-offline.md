# Tier 4 — PWA & Offline Activity Logging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-add the PWA layer that was removed in the `app/` rebuild and implement offline activity logging (A12) — installable app, service-worker caching, and an offline queue that flushes activity logs when connectivity returns.

**Architecture:** Use `@ducanh2912/next-pwa` (the maintained App-Router-compatible next-pwa fork) to generate a service worker at build time (disabled in dev). A web app manifest + icons make the app installable. Offline activity logging is a small `lib/offlineQueue.ts` that persists failed/offline activity-log payloads to `localStorage` and flushes them on the browser `online` event; the activity page shows a pending-sync indicator.

**Tech Stack:** `@ducanh2912/next-pwa`, Workbox (bundled), Next.js 14 App Router, `localStorage` queue.

## Global Constraints

- `next.config.mjs` is **ESM** (`export default`). Wrap it with `withPWA(...)`, keep ESM syntax.
- Service worker must be **disabled in development** (`disable: process.env.NODE_ENV === "development"`) so `npm run dev` is unaffected; it activates only in `npm run build` + `npm run start`.
- Generated SW artifacts (`public/sw.js`, `public/workbox-*.js`) must be git-ignored, not committed.
- Offline queue only applies to **activity logs** (A12 scope). Do not silently queue other mutations.
- Frontend verify is `npm run build` then `npm run start` (SW only exists in a production build). `npm run lint` must stay clean.

---

### Task 1: Install + configure next-pwa

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/next.config.mjs`
- Modify: `frontend/.gitignore`

- [ ] **Step 1: Install the package**

Run: `cd frontend && npm install @ducanh2912/next-pwa`
Expected: added to `dependencies`.

- [ ] **Step 2: Wrap the Next config**

Replace `frontend/next.config.mjs` with:

```js
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: { disableDevLogs: true },
});

/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };

export default withPWA(nextConfig);
```

- [ ] **Step 3: Ignore generated SW artifacts**

Append to `frontend/.gitignore`:

```
# next-pwa generated service worker
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
public/fallback-*.js
```

- [ ] **Step 4: Verify a production build emits the SW**

Run: `cd frontend && npm run build`
Expected: build succeeds; `public/sw.js` is generated (confirm `ls public/sw.js`).

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/next.config.mjs frontend/.gitignore
git commit -m "build(frontend): add next-pwa service worker (prod only)"
```

---

### Task 2: Web app manifest + icons + metadata

**Files:**
- Create: `frontend/public/manifest.webmanifest`
- Create: `frontend/public/icon-192.png`, `frontend/public/icon-512.png`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Create the manifest**

Create `frontend/public/manifest.webmanifest`:

```json
{
  "name": "OneFit",
  "short_name": "OneFit",
  "description": "OneFit digital wellness platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F5F1EA",
  "theme_color": "#E5573F",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Add the icons**

Generate two solid-coral PNG icons (192 and 512). Quick option with ImageMagick:

Run:
```bash
cd frontend/public
magick -size 192x192 xc:'#E5573F' icon-192.png
magick -size 512x512 xc:'#E5573F' icon-512.png
```
If ImageMagick isn't available, drop two PNGs of those sizes in `frontend/public/` by any means.
Expected: both files exist.

- [ ] **Step 3: Link the manifest + theme in metadata**

In `frontend/app/layout.tsx`, extend the `metadata` export and add `themeColor`:

```ts
export const metadata: Metadata = {
  title: "OneFit",
  description: "OneFit — digital wellness platform",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "OneFit", statusBarStyle: "default" },
};

export const viewport = { themeColor: "#E5573F" };
```

(Import `Viewport` type if you want it typed: `import type { Metadata, Viewport } from "next";` and annotate `export const viewport: Viewport`.)

- [ ] **Step 4: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds; no manifest warnings.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/manifest.webmanifest frontend/public/icon-192.png frontend/public/icon-512.png frontend/app/layout.tsx
git commit -m "feat(pwa): web manifest + icons + installable metadata"
```

---

### Task 3: Offline activity-log queue

**Files:**
- Create: `frontend/lib/offlineQueue.ts`

**Interfaces:**
- Produces:
  - `queueActivity(payload: GymActivityIn): void`
  - `pendingCount(): number`
  - `flushQueue(): Promise<number>` (returns how many synced)
  - `onQueueChange(cb: () => void): () => void`

- [ ] **Step 1: Create the queue module**

Create `frontend/lib/offlineQueue.ts`:

```ts
import { logActivity } from "@/lib/api/gym";
import type { GymActivityIn } from "@/lib/api/types";

const KEY = "onefit-offline-activity";
const listeners = new Set<() => void>();

function read(): GymActivityIn[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(items: GymActivityIn[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((cb) => cb());
}

export function queueActivity(payload: GymActivityIn): void {
  write([...read(), payload]);
}

export function pendingCount(): number {
  return read().length;
}

export function onQueueChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

let flushing = false;
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let synced = 0;
  try {
    let items = read();
    while (items.length > 0) {
      const next = items[0];
      try {
        await logActivity(next);       // succeeds only when back online
        synced += 1;
        items = items.slice(1);
        write(items);
      } catch {
        break;                          // still offline — stop, keep the rest
      }
    }
  } finally {
    flushing = false;
  }
  return synced;
}

/** Call once on the client to auto-flush when connectivity returns. */
export function installAutoFlush(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => { void flushQueue(); };
  window.addEventListener("online", handler);
  void flushQueue();                    // attempt on load too
  return () => window.removeEventListener("online", handler);
}
```

- [ ] **Step 2: Lint + commit**

Run: `cd frontend && npm run lint` (expect no new errors).

```bash
git add frontend/lib/offlineQueue.ts
git commit -m "feat(offline): localStorage activity-log queue with auto-flush"
```

---

### Task 4: Wire offline logging into the activity page (A12)

**Files:**
- Modify: `frontend/app/gym/activity/page.tsx`

**Interfaces:**
- Consumes: `queueActivity`, `pendingCount`, `flushQueue`, `installAutoFlush`, `onQueueChange`.

- [ ] **Step 1: Read the submit handler**

Run: `sed -n '24,75p' frontend/app/gym/activity/page.tsx` to see the exact `logActivity({...})` payload built in `submit`.

- [ ] **Step 2: Install auto-flush + a pending counter**

Add imports and, inside the component, an effect + state:

```ts
import { useEffect } from "react";
import { queueActivity, pendingCount, flushQueue, installAutoFlush, onQueueChange } from "@/lib/offlineQueue";
```

```ts
  const [pending, setPending] = useState(0);
  useEffect(() => {
    setPending(pendingCount());
    const off = onQueueChange(() => setPending(pendingCount()));
    const uninstall = installAutoFlush();
    return () => { off(); uninstall(); };
  }, []);
```

- [ ] **Step 3: Queue on offline / failure in `submit`**

In the `submit` handler, wrap the `await logActivity(payload)` so a network failure (or `!navigator.onLine`) enqueues instead of erroring. Replace the `try/catch` around `logActivity` with:

```ts
    const payload = { /* the existing payload object built from the form fields */ };
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
      await logActivity(payload);
      setSaved("Activity logged.");
    } catch {
      queueActivity(payload);
      setSaved("You're offline — saved locally and will sync when you reconnect.");
    } finally {
      setBusy(false);
    }
```

(Keep building `payload` from the existing form state exactly as the current code does; only the try/catch changes.)

- [ ] **Step 4: Show the pending-sync banner + manual sync**

Add near the top of the form area:

```tsx
{pending > 0 && (
  <div className="mb-4 flex items-center justify-between border border-border bg-cream p-3 text-[13px] text-charcoal">
    <span>{pending} activity log(s) waiting to sync.</span>
    <Button type="button" variant="ghost" onClick={() => flushQueue()}>Sync now</Button>
  </div>
)}
```

- [ ] **Step 5: Build to verify**

Run: `cd frontend && npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/gym/activity/page.tsx
git commit -m "feat(gym): offline activity logging with sync-on-reconnect (A12)"
```

---

### Task 5: Verification + docs

**Files:**
- Modify: `docs/feature_verification.md`

- [ ] **Step 1: Production build + serve**

Run: `cd frontend && npm run build && npm run start`
Expected: app serves; DevTools → Application shows a registered service worker + the manifest, and an install prompt is available.

- [ ] **Step 2: Manual offline test**

In DevTools → Network, set "Offline"; log an activity → see "saved locally" + the pending banner. Set back "Online" → the queue auto-flushes and the count drops to 0 (verify the log appears via `/gym/dashboard` or `/specialist` client activity).

- [ ] **Step 3: Update the verification doc**

Flip A12 (Offline Activity Logging) to ✅, and the "Responsive Web Application" / PWA-related platform notes to reflect the installable PWA. Note that full background-sync (Workbox BackgroundSync) is approximated by the online-event flush.

- [ ] **Step 4: Commit**

```bash
git add docs/feature_verification.md
git commit -m "docs: mark offline logging + PWA complete (A12)"
```

---

## Self-Review

**Spec coverage:** A12 offline activity logging (Tasks 3/4); PWA installability (Tasks 1/2). Both covered.

**Placeholder scan:** Task 2 Step 2 (icons) and Task 4 Step 1/3 (bind to the page's existing `payload` build) are the only read-first/asset steps; everything else is exact. The icon generation has a documented fallback.

**Type consistency:** `queueActivity(payload: GymActivityIn)` matches `logActivity(body: GymActivityIn)` — the same payload type flows through the queue and the API wrapper, so a queued item replays identically when flushed.

**Risk note:** `@ducanh2912/next-pwa` must be compatible with Next 14.2.5 (it is). The SW is disabled in dev to avoid caching surprises during `npm run dev`; reviewers should test the SW with `npm run start`, not `npm run dev`.
