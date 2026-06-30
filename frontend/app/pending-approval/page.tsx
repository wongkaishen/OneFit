"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { FileInput } from "@/components/ui/Field";
import { useSession, roleHome, clearToken } from "@/lib/auth/session";
import { uploadCredential } from "@/lib/api/specialist";

/**
 * Standalone "Awaiting approval" screen for pending wellness specialists.
 *
 * It lives OUTSIDE every role layout's AuthGate so a `pending` specialist — who
 * AuthGate would otherwise bounce — can land here, upload the certification that
 * proves their credibility, and wait for an admin to approve them. It guards
 * itself via useSession: no user → /login; non-pending → their role home.
 */
export default function PendingApprovalPage() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    // Anyone who isn't a pending specialist belongs in their normal app area.
    if (user.status !== "pending") { router.replace(roleHome(user.role)); }
  }, [loading, user, router]);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      await uploadCredential(file);
      setUploaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credential upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => { clearToken(); router.replace("/login"); };

  if (loading || !user || user.status !== "pending") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream font-sans">
        <span className="text-[11px] font-medium uppercase tracking-label text-muted">Loading…</span>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-6 py-10 font-sans">
      <div className="w-full max-w-[440px] animate-fade-in">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-none items-center justify-center bg-warm-red">
            <span className="h-2.5 w-2.5 bg-cream" />
          </span>
          <span className="font-serif text-[22px] leading-none text-charcoal">onefit</span>
        </div>

        <h1 className="font-serif text-[30px] leading-tight text-charcoal">Awaiting approval</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          Thanks for registering as a wellness specialist{user.name ? `, ${user.name}` : ""}. An admin
          reviews your credentials before your account is activated.
        </p>

        <Card className="mt-7">
          <Label>Upload your certification</Label>
          <p className="mt-2 text-[13px] text-muted">
            Upload a certificate or licence (PDF or image, max 15 MB) so the admin can verify your
            credibility. You can re-upload to replace it.
          </p>
          <div className="mt-4">
            <FileInput
              accept=".pdf,image/*"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </div>
          {busy && <div className="mt-3 text-[13px] text-charcoal">Uploading…</div>}
          {uploaded && !busy && (
            <div className="mt-3 text-[13px] text-good">
              Credential received. We&apos;ll notify you once an admin approves your account.
            </div>
          )}
          {error && <div className="mt-3 text-[13px] text-coral">{error}</div>}
        </Card>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-[13px] text-muted">Signed in as {user.email}</span>
          <Button type="button" variant="ghost" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    </main>
  );
}
