"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
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
      <TopBar title="Pending registrations" search="Search" avatarLetter="A" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Approve or reject members and specialists awaiting access. Approving activates the account; rejecting suspends it.</PageIntro>
          <Hairline className="mt-2" />
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && !error && (data ?? []).length === 0 && (
            <EmptyState title="No pending registrations">Everyone is approved.</EmptyState>
          )}
          {(data ?? []).map((u) => (
            <div key={u.user_id}>
              <div className="flex items-center justify-between py-4">
                <div>
                  <div className="font-sans text-[14px] text-charcoal">{u.name ?? u.email}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">{u.email} · {u.role}</div>
                </div>
                <div className="flex items-center gap-2">
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
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
