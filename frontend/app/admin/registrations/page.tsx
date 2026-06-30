"use client";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listRegistrations, approveRegistration, rejectRegistration, getSpecialistCredential } from "@/lib/api/admin";
import type { UserOut } from "@/lib/api/types";

export default function AdminRegistrationsPage() {
  const { data, error, loading, setData } = useResource<UserOut[]>(listRegistrations, []);

  const decide = async (id: string, kind: "approve" | "reject") => {
    try {
      if (kind === "approve") await approveRegistration(id);
      else {
        const reason = prompt("Reason for rejection (optional):") ?? "";
        await rejectRegistration(id, reason);
      }
      setData((prev) => (prev ?? []).filter((u) => u.user_id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  return (
    <>
      <TopBar title="Specialist approvals" search="Search" avatarLetter="A" />
      <PageBody>
        <PageHeader eyebrow="Specialist approvals">
          Approve or reject wellness specialists awaiting access. Approving activates the account;
          rejecting suspends it. Gym members confirm their own email and don&apos;t need approval.
        </PageHeader>
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && !error && (data ?? []).length === 0 && (
            <EmptyState title="No pending registrations" icon="approvals">Everyone is approved.</EmptyState>
          )}
          {(data ?? []).length > 0 && (
          <Card padded={false}>
          {(data ?? []).map((u, i) => (
            <div key={u.user_id}>
              {i > 0 && <Hairline />}
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-sans text-[14px] text-charcoal">{u.name ?? u.email}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">{u.email} · {u.role}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{u.status}</Badge>
                  {u.role === "wellness_specialist" && (
                    <Button type="button" variant="ghost" onClick={async () => {
                      try {
                        const { url } = await getSpecialistCredential(u.user_id);
                        window.open(url, "_blank");
                      } catch {
                        alert("No credential on file.");
                      }
                    }}>View credential</Button>
                  )}
                  <Button type="button" variant="dark" onClick={() => decide(u.user_id, "approve")}>Approve</Button>
                  <Button type="button" variant="ghost" onClick={() => decide(u.user_id, "reject")}>Reject</Button>
                </div>
              </div>
            </div>
          ))}
          </Card>
          )}
      </PageBody>
    </>
  );
}
