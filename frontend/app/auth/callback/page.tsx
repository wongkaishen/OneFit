"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
        if (user.status !== "active") { clearToken(); setError("Account not active."); return; }
        router.replace(roleHome(user.role));
      })
      .catch(() => { clearToken(); setError("Sign-in failed."); });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream font-sans">
      <div className="text-[14px] text-charcoal">{error ?? "Signing you in…"}</div>
    </main>
  );
}
