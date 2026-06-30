"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { mfaEnroll, mfaVerify } from "@/lib/api/auth";
import { listLoginEvents } from "@/lib/api/admin";
import { setToken } from "@/lib/auth/session";
import { shortDate } from "@/lib/format";
import type { LoginEventOut, MfaEnrollOut } from "@/lib/api/types";

export default function AdminSecurityPage() {
  const events = useResource<LoginEventOut[]>(() => listLoginEvents(false, 24), []);
  const [enroll, setEnroll] = useState<MfaEnrollOut | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const startEnroll = async () => {
    setMsg(null);
    try { setEnroll(await mfaEnroll()); }
    catch (e) { setMsg(e instanceof ApiError ? e.message : "Enroll failed"); }
  };
  const verify = async () => {
    if (!enroll || !code.trim()) return;
    try {
      const tokens = await mfaVerify(enroll.factor_id, code.trim());
      setToken(tokens.access_token);
      setMsg("2FA verified and enabled."); setEnroll(null); setCode("");
    } catch (e) { setMsg(e instanceof ApiError ? e.message : "Verification failed"); }
  };

  return (
    <>
      <TopBar title="Security" search="Search" avatarLetter="A" />
      <PageBody>
        <PageHeader eyebrow="Security">Enable two-factor authentication and review login activity.</PageHeader>

          <Label>Two-factor authentication</Label>
          <Card className="mt-3">
            {!enroll ? (
              <Button type="button" variant="dark" onClick={startEnroll}>Set up 2FA</Button>
            ) : (
              <div className="flex flex-col gap-3">
                {enroll.qr_code && <img src={enroll.qr_code} alt="2FA QR" className="h-44 w-44 border border-border" />}
                <div className="text-[12px] text-muted">Secret: {enroll.secret}</div>
                <div className="flex items-end gap-3">
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" className="sm:max-w-[200px]" />
                  <Button type="button" variant="dark" onClick={verify}>Verify</Button>
                </div>
              </div>
            )}
            {msg && <div className="mt-2 text-[13px] text-good">{msg}</div>}
          </Card>

          <div className="mt-9">
            <Label>Recent login activity</Label>
            <div className="mt-3">
            {events.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {(events.data ?? []).length > 0 && (
            <Card padded={false}>
            {(events.data ?? []).map((ev, i) => (
              <div key={ev.event_id}>
                {i > 0 && <Hairline />}
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <div className="font-sans text-[14px] text-charcoal">{ev.email} · {ev.ip ?? "—"}</div>
                    <div className="font-sans text-[11px] text-muted">{shortDate(ev.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {ev.suspicious && <Badge tone="warn">suspicious</Badge>}
                    <Badge tone={ev.success ? "good" : "neutral"}>{ev.success ? "success" : "failed"}</Badge>
                  </div>
                </div>
              </div>
            ))}
            </Card>
            )}
            </div>
          </div>
      </PageBody>
    </>
  );
}
