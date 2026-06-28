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
