"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { me } from "@/lib/api/auth";
import { setToken, clearToken, roleHome } from "@/lib/auth/session";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // GoTrue returns the session in the URL hash: #access_token=…&refresh_token=…
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const token = new URLSearchParams(hash).get("access_token");
    if (!token) { setError("No access token returned."); return; }
    setToken(token);
    me()
      .then((user) => {
        if (user.status === "suspended") {
          // (Defensive — the backend normally 403s suspended in the catch below.)
          clearToken();
          router.replace("/login?reason=suspended");
          return;
        }
        if (user.status === "pending") {
          // Keep the session so the pending screen can take a credential upload.
          router.replace("/pending-approval");
          return;
        }
        router.replace(roleHome(user.role));
      })
      .catch((e: unknown) => {
        clearToken();
        // The backend rejects a suspended account with 403 "Account suspended";
        // surface that on the login page rather than a generic failure.
        if (e instanceof ApiError && e.status === 403 && /suspend/i.test(e.message)) {
          router.replace("/login?reason=suspended");
          return;
        }
        setError("Sign-in failed.");
      });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream font-sans">
      <div className="text-[14px] text-charcoal">{error ?? "Signing you in…"}</div>
    </main>
  );
}
