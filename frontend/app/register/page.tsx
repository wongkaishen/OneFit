"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { FormField, Input, FileInput } from "@/components/ui/Field";
import { ApiError } from "@/lib/api/client";
import { login, register } from "@/lib/api/auth";
import { uploadCredential } from "@/lib/api/specialist";
import { setToken } from "@/lib/auth/session";
import type { RegisterRole } from "@/lib/api/types";

const ROLES: { value: RegisterRole; label: string; blurb: string }[] = [
  { value: "gym_user", label: "Gym User", blurb: "Track workouts, diet, and progress." },
  {
    value: "wellness_specialist",
    label: "Wellness Specialist",
    blurb: "Coach members and manage content.",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RegisterRole>("gym_user");
  const [credential, setCredential] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailTaken(false);
    setBusy(true);
    try {
      await register({ name, email, password, role });
      if (role === "wellness_specialist") {
        // Specialists are created email-confirmed, so we can sign them in right
        // away, upload the credential they picked, and drop them on the pending
        // screen to await approval.
        const tokens = await login(email, password);
        setToken(tokens.access_token);
        if (credential) await uploadCredential(credential);
        router.replace("/pending-approval");
        return;
      }
      setDone(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed. Try again.";
      // Email already in use → point the user to Login instead.
      if (/already|registered|exists/i.test(msg)) {
        setEmailTaken(true);
        setError("That email is already registered.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-6 font-sans">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex h-8 w-8 flex-none items-center justify-center bg-warm-red">
              <span className="h-2.5 w-2.5 bg-cream" />
            </span>
            <span className="font-serif text-[22px] leading-none text-charcoal">onefit</span>
          </div>
          <h1 className="font-serif text-[28px] leading-tight text-charcoal">Account created</h1>
          {role === "wellness_specialist" ? (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              An administrator will review and approve your specialist account before you can sign
              in. You&apos;ll be able to log in once it&apos;s active.
            </p>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Check your inbox to confirm your email address. Once confirmed, you can sign in
              straight away.
            </p>
          )}
          <div className="mt-8">
            <Link href="/login">
              <Button variant="dark">Back to sign in</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-10 font-sans">
      <div className="w-full max-w-[380px]">
        <div className="mb-9 flex items-center gap-[9px]">
          <span className="h-3 w-3 bg-warm-red" />
          <span className="text-[17px] font-medium tracking-tight text-charcoal">onefit</span>
        </div>

        <h1 className="font-serif text-[30px] leading-tight text-charcoal">Create your account</h1>
        <p className="mt-1.5 text-[13px] text-muted">Join OneFit as a member or a specialist.</p>

        <Card className="mt-7">
        <form onSubmit={submit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>I am registering as</Label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const active = role === r.value;
                return (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className="flex flex-col gap-1 border p-3 text-left transition"
                    style={{
                      borderColor: active ? "var(--charcoal)" : "var(--border)",
                      background: active ? "#FFFFFF" : "transparent",
                    }}
                  >
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: active ? "var(--charcoal)" : "var(--subtle)" }}
                    >
                      {r.label}
                    </span>
                    <span className="text-[11px] leading-snug text-muted">{r.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <FormField label="Full name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormField>
          <FormField label="Password">
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>

          {role === "wellness_specialist" && (
            <div className="flex flex-col gap-2">
              <Label>Certification (optional)</Label>
              <FileInput
                accept=".pdf,image/*"
                onChange={(e) => setCredential(e.target.files?.[0] ?? null)}
              />
              <span className="text-[11px] leading-snug text-muted">
                Upload a certificate or licence (PDF or image, max 15 MB) so an admin can verify your
                credentials. You can also add or replace it after signing in.
              </span>
            </div>
          )}

          {error && (
            <div className="text-[13px] text-coral">
              {error}
              {emailTaken && (
                <>
                  {" "}
                  <Link href="/login" className="text-charcoal underline">
                    Log in instead
                  </Link>
                </>
              )}
            </div>
          )}

          <Button type="submit" variant="dark" disabled={busy} fullWidth>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        </Card>

        <p className="mt-6 text-center text-[13px] text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-coral hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
