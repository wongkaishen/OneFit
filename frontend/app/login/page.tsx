"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField, Input } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { login, me } from "@/lib/api/auth";
import { setToken, clearToken, roleHome } from "@/lib/auth/session";

export default function LoginPage() {
  // useSearchParams must sit under a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={<main className="min-h-screen bg-cream" />}>
      <LoginForm />
    </Suspense>
  );
}

// Demo accounts for quick sign-in during evaluation (shared password).
const DEMO_ACCOUNTS = [
  { label: "Gym User", email: "gym@onefit.io", password: "OneFit123!" },
  { label: "Specialist", email: "specialist@onefit.io", password: "OneFit123!" },
  { label: "Admin", email: "admin@onefit.io", password: "OneFit123!" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // OAuth/callback bounces a blocked account back here with a reason to show.
  useEffect(() => {
    if (params.get("reason") === "suspended") {
      setError("Your account has been suspended. Contact an administrator.");
    }
  }, [params]);

  const oauth = () => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) { setError("OAuth is not configured."); return; }
    const redirect = `${window.location.origin}/auth/callback`;
    window.location.href = `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const tokens = await login(email, password);
      setToken(tokens.access_token);
      const user = await me();
      if (user.status === "suspended") {
        clearToken();
        setError("Your account has been suspended. Contact an administrator.");
        return;
      }
      if (user.status === "pending") {
        // Keep the session: the pending screen lets them upload credentials.
        router.replace("/pending-approval");
        return;
      }
      router.replace(roleHome(user.role));
    } catch (err) {
      clearToken();
      // GoTrue returns 400 for bad credentials and for unconfirmed emails.
      if (err instanceof ApiError && err.status === 400) {
        if (/confirm/i.test(err.message)) {
          setNotice("Please confirm your email address — check your inbox for the confirmation link.");
        } else {
          setError("Invalid email or password.");
        }
      } else {
        setError(err instanceof ApiError ? err.message : "Sign-in failed. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-10 font-sans">
      <div className="w-full max-w-[400px] animate-fade-in">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center bg-warm-red">
            <span className="h-2.5 w-2.5 bg-cream" />
          </span>
          <span className="font-serif text-[22px] leading-none text-charcoal">onefit</span>
        </div>

        <h1 className="font-serif text-[30px] leading-tight text-charcoal">Welcome back</h1>
        <p className="mt-1.5 text-[13px] text-muted">Sign in to your OneFit account.</p>

        <Card className="mt-7">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <FormField label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </FormField>
          <FormField label="Password">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </FormField>

          {error && <div className="text-[13px] text-coral">{error}</div>}
          {notice && <div className="text-[13px] text-charcoal">{notice}</div>}

          <Button type="submit" variant="dark" disabled={busy} fullWidth>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Button type="button" variant="ghost" onClick={oauth} fullWidth>Continue with Google</Button>

          <div className="pt-1">
            <p className="mb-2 text-center text-[11px] uppercase tracking-label text-muted">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                    setError(null);
                    setNotice(null);
                  }}
                  className="border border-border bg-cream px-2 py-2 text-[12px] font-medium text-charcoal transition-colors hover:border-charcoal hover:bg-white"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </form>
        </Card>

        <p className="mt-6 text-center text-[13px] text-muted">
          New to OneFit?{" "}
          <Link href="/register" className="font-medium text-coral hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
