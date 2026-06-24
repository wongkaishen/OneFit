"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, roleHome } from "@/lib/auth/session";
import type { Role } from "@/lib/api/types";

/**
 * Client-side route guard. Wraps each role's layout:
 *  - no token / no user        → redirect to /login
 *  - wrong role for this area  → redirect to the user's own role home
 *  - suspended account         → bounce to /login (login surfaces the reason)
 *
 * New accounts are active on sign-up, so only 'suspended' is blocked here; the
 * backend also rejects suspended tokens (defense in depth).
 */
export function AuthGate({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.status === "suspended") {
      router.replace("/login");
      return;
    }
    if (user.role !== role) {
      router.replace(roleHome(user.role));
    }
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role || user.status === "suspended") {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center bg-cream">
        <span className="font-sans text-[11px] font-medium uppercase tracking-label text-muted">
          Loading…
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
