"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { ApiError } from "@/lib/api/client";
import { login, me } from "@/lib/api/auth";
import { setToken, clearToken, roleHome } from "@/lib/auth/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const tokens = await login(email, password);
      setToken(tokens.access_token);
      const user = await me();
      if (user.status === "pending") {
        clearToken();
        setNotice("Your account is awaiting admin approval.");
        return;
      }
      if (user.status === "suspended") {
        clearToken();
        setError("Your account has been suspended. Contact an administrator.");
        return;
      }
      router.replace(roleHome(user.role));
    } catch (err) {
      clearToken();
      // GoTrue returns 400 for bad credentials.
      if (err instanceof ApiError && err.status === 400) {
        setError("Invalid email or password.");
      } else {
        setError(err instanceof ApiError ? err.message : "Sign-in failed. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 font-sans">
      <div className="w-full max-w-[380px]">
        <div className="mb-9 flex items-center gap-[9px]">
          <span className="h-3 w-3 bg-warm-red" />
          <span className="text-[17px] font-medium tracking-tight text-charcoal">onefit</span>
        </div>

        <h1 className="font-serif text-[28px] leading-tight text-charcoal">Welcome back</h1>
        <p className="mt-1 text-[13px] text-muted">Sign in to your OneFit account.</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Email</Label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Password</Label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-[42px] border border-border bg-white px-3 text-[14px] text-charcoal outline-none focus:border-charcoal"
            />
          </div>

          {error && <div className="text-[13px] text-coral">{error}</div>}
          {notice && <div className="text-[13px] text-charcoal">{notice}</div>}

          <Button type="submit" variant="dark" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-[13px] text-muted">
          New to OneFit?{" "}
          <Link href="/register" className="text-charcoal underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
