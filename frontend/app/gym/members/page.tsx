"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/shell/Avatar";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import {
  gymListMembers, gymListFriends, gymListFriendRequests,
  gymSendFriendRequest, gymAcceptFriendRequest, gymDeclineFriendRequest, gymRemoveFriend,
} from "@/lib/api/gym";
import type { MemberOut, FriendOut, FriendRequests, FriendState } from "@/lib/api/types";

const TABS = ["Directory", "Friends", "Requests"] as const;
type Tab = (typeof TABS)[number];

function initial(name: string | null) {
  return (name ?? "?").trim()[0]?.toUpperCase() ?? "?";
}

export default function GymMembersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Directory");
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const members = useResource<MemberOut[]>(() => gymListMembers(query), [query]);
  const friends = useResource<FriendOut[]>(gymListFriends, []);
  const requests = useResource<FriendRequests>(gymListFriendRequests, []);

  const incomingCount = requests.data?.incoming.length ?? 0;

  const goMessage = (id: string, name: string | null) =>
    router.push(`/gym/messages?to=${id}${name ? `&name=${encodeURIComponent(name)}` : ""}`);

  const refresh = () => {
    void gymListMembers(query).then(members.setData).catch(() => {});
    void gymListFriends().then(friends.setData).catch(() => {});
    void gymListFriendRequests().then(requests.setData).catch(() => {});
  };

  const addFriend = async (m: MemberOut) => {
    setErr(null);
    try {
      await gymSendFriendRequest(m.user_id);
      members.setData((prev) =>
        (prev ?? []).map((x) => (x.user_id === m.user_id ? { ...x, friend_state: "pending_out" as FriendState } : x)),
      );
      void gymListFriendRequests().then(requests.setData).catch(() => {});
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't send the request.");
    }
  };

  const accept = async (friendshipId: string) => {
    setErr(null);
    try {
      await gymAcceptFriendRequest(friendshipId);
      refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't accept the request.");
    }
  };
  const decline = async (friendshipId: string) => {
    setErr(null);
    try {
      await gymDeclineFriendRequest(friendshipId);
      void gymListFriendRequests().then(requests.setData).catch(() => {});
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't decline the request.");
    }
  };
  const unfriend = async (userId: string) => {
    if (!window.confirm("Remove this friend?")) return;
    setErr(null);
    try {
      await gymRemoveFriend(userId);
      refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't remove the friend.");
    }
  };

  const memberAction = (m: MemberOut) => {
    switch (m.friend_state) {
      case "friends":
        return <Button type="button" variant="dark" size="sm" onClick={() => goMessage(m.user_id, m.name)}>Message</Button>;
      case "pending_out":
        return <Badge tone="neutral">Requested</Badge>;
      case "pending_in":
        return <Button type="button" variant="ghost" size="sm" onClick={() => setTab("Requests")}>Respond</Button>;
      default:
        return <Button type="button" variant="ghost" size="sm" onClick={() => addFriend(m)}>Add friend</Button>;
    }
  };

  return (
    <>
      <TopBar title="Members" search="Search" avatarLetter="G" />
      <PageBody max="form">
        <PageHeader eyebrow="Members">Find other members, add friends, and start a conversation.</PageHeader>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
              {t}{t === "Requests" && incomingCount > 0 ? ` (${incomingCount})` : ""}
            </Chip>
          ))}
        </div>

        {err && <div className="mt-3 text-[13px] text-coral">{err}</div>}

        {tab === "Directory" && (
          <div className="mt-5">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members by name…" />
            {members.loading && <div className="mt-5 text-[14px] text-muted">Loading…</div>}
            {members.error && <div className="mt-5 text-[14px] text-coral">{members.error}</div>}
            {!members.loading && (members.data ?? []).length === 0 && (
              <div className="mt-6"><EmptyState title="No members found" icon="users">Try a different search.</EmptyState></div>
            )}
            <div className="mt-4 space-y-2">
              {(members.data ?? []).map((m) => (
                <Card key={m.user_id}>
                  <div className="flex items-center gap-3">
                    <button onClick={() => router.push(`/gym/members/${m.user_id}`)} className="flex items-center gap-3 text-left">
                      <Avatar letter={initial(m.name)} />
                      <span>
                        <span className="block font-sans text-[14px] text-charcoal">{m.name ?? "Member"}</span>
                        {m.goal && <span className="block font-sans text-[12px] text-muted">{m.goal}</span>}
                      </span>
                    </button>
                    <span className="ml-auto">{memberAction(m)}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {tab === "Friends" && (
          <div className="mt-5 space-y-2">
            {friends.loading && <div className="text-[14px] text-muted">Loading…</div>}
            {!friends.loading && (friends.data ?? []).length === 0 && (
              <EmptyState title="No friends yet" icon="community">Add members from the Directory to connect.</EmptyState>
            )}
            {(friends.data ?? []).map((f) => (
              <Card key={f.user_id}>
                <div className="flex items-center gap-3">
                  <Avatar letter={initial(f.name)} />
                  <span className="font-sans text-[14px] text-charcoal">{f.name ?? "Member"}</span>
                  <span className="ml-auto flex gap-2">
                    <Button type="button" variant="dark" size="sm" onClick={() => goMessage(f.user_id, f.name)}>Message</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => unfriend(f.user_id)}>Remove</Button>
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}

        {tab === "Requests" && (
          <div className="mt-5 space-y-5">
            <div>
              <div className="mb-2 font-sans text-[12px] font-semibold uppercase tracking-label text-muted">Incoming</div>
              {(requests.data?.incoming ?? []).length === 0 && (
                <div className="text-[13px] text-muted">No incoming requests.</div>
              )}
              <div className="space-y-2">
                {(requests.data?.incoming ?? []).map((r) => (
                  <Card key={r.friendship_id}>
                    <div className="flex items-center gap-3">
                      <Avatar letter={initial(r.other_name)} />
                      <span className="font-sans text-[14px] text-charcoal">{r.other_name ?? "Member"}</span>
                      <span className="ml-auto flex gap-2">
                        <Button type="button" variant="dark" size="sm" onClick={() => accept(r.friendship_id)}>Accept</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => decline(r.friendship_id)}>Decline</Button>
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 font-sans text-[12px] font-semibold uppercase tracking-label text-muted">Outgoing</div>
              {(requests.data?.outgoing ?? []).length === 0 && (
                <div className="text-[13px] text-muted">No outgoing requests.</div>
              )}
              <div className="space-y-2">
                {(requests.data?.outgoing ?? []).map((r) => (
                  <Card key={r.friendship_id}>
                    <div className="flex items-center gap-3">
                      <Avatar letter={initial(r.other_name)} />
                      <span className="font-sans text-[14px] text-charcoal">{r.other_name ?? "Member"}</span>
                      <Badge tone="neutral">Pending</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </PageBody>
    </>
  );
}
