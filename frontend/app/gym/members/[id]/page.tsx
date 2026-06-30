"use client";
import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/shell/Avatar";
import { Label } from "@/components/ui/Label";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { gymGetMember, gymSendFriendRequest, gymReport } from "@/lib/api/gym";
import type { MemberOut } from "@/lib/api/types";

function initial(name: string | null) {
  return (name ?? "?").trim()[0]?.toUpperCase() ?? "?";
}

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, error, loading, setData } = useResource<MemberOut>(() => gymGetMember(id), [id]);
  const [msg, setMsg] = useState<string | null>(null);

  const addFriend = async () => {
    setMsg(null);
    try {
      await gymSendFriendRequest(id);
      setData((prev) => (prev ? { ...prev, friend_state: "pending_out" } : prev));
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Couldn't send the request.");
    }
  };

  const report = async () => {
    const reason = window.prompt("Report this member — why? (optional)");
    if (reason === null) return;
    try {
      await gymReport({ target_type: "user", target_id: id, reason });
      window.alert("Thanks — this member was reported to the admins.");
    } catch (e) {
      window.alert(e instanceof ApiError ? e.message : "Couldn't submit the report.");
    }
  };

  const m = data;

  return (
    <>
      <TopBar title="Profile" search="Search" avatarLetter="G" />
      <PageBody max="narrow">
        <button onClick={() => router.back()} className="mb-4 text-[12px] font-semibold uppercase tracking-label text-subtle hover:text-charcoal">
          ← Back
        </button>

        {loading && <div className="text-[14px] text-muted">Loading…</div>}
        {error && <div className="text-[14px] text-coral">{error}</div>}

        {m && (
          <Card>
            <div className="flex items-center gap-4">
              <Avatar letter={initial(m.name)} size={56} />
              <div>
                <div className="font-serif text-[22px] text-charcoal">{m.name ?? "Member"}</div>
                {m.friend_state === "friends" && <Badge tone="good">Friend</Badge>}
              </div>
            </div>

            {m.goal && (
              <div className="mt-5">
                <Label>Goal</Label>
                <div className="mt-1 font-sans text-[14px] text-charcoal">{m.goal}</div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {m.friend_state === "friends" && (
                <Button type="button" variant="dark"
                  onClick={() => router.push(`/gym/messages?to=${m.user_id}${m.name ? `&name=${encodeURIComponent(m.name)}` : ""}`)}>
                  Message
                </Button>
              )}
              {m.friend_state === "none" && (
                <Button type="button" variant="ghost" onClick={addFriend}>Add friend</Button>
              )}
              {m.friend_state === "pending_out" && <Badge tone="neutral">Request sent</Badge>}
              {m.friend_state === "pending_in" && (
                <Button type="button" variant="ghost" onClick={() => router.push("/gym/members")}>Respond to request</Button>
              )}
              <Button type="button" variant="ghost" onClick={report}>Report</Button>
            </div>
            {msg && <div className="mt-3 text-[13px] text-coral">{msg}</div>}
          </Card>
        )}
      </PageBody>
    </>
  );
}
