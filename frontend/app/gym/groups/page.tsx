"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import {
  gymListGroups, gymJoinGroup, gymLeaveGroup,
  gymListPosts, gymCreatePost, gymListGroupChat, gymSendGroupChat,
} from "@/lib/api/gym";
import { relativeTime } from "@/lib/format";
import type { GroupSummary, CommunityPost, GroupChatMessage } from "@/lib/api/types";
import { getToken } from "@/lib/auth/session";

const CHAT_POLL_MS = 4000;

export default function GymGroupsPage() {
  const groups = useResource<GroupSummary[]>(gymListGroups, []);
  const [active, setActive] = useState<GroupSummary | null>(null);
  const [view, setView] = useState<"posts" | "chat">("posts");
  const [err, setErr] = useState<string | null>(null);

  // Posts
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postText, setPostText] = useState("");

  // Chat
  const [chat, setChat] = useState<GroupChatMessage[]>([]);
  const [chatText, setChatText] = useState("");

  const updateGroup = (id: string, patch: Partial<GroupSummary>) => {
    groups.setData((prev) => (prev ?? []).map((g) => (g.group_id === id ? { ...g, ...patch } : g)));
    setActive((a) => (a && a.group_id === id ? { ...a, ...patch } : a));
  };

  // Load posts when a group / view changes.
  useEffect(() => {
    if (!active || view !== "posts") return;
    gymListPosts(active.group_id).then(setPosts).catch(() => setPosts([]));
  }, [active, view]);

  // Load + poll chat while the chat view of a joined group is open.
  useEffect(() => {
    if (!active || view !== "chat" || !active.is_member) return;
    let alive = true;
    const load = () => gymListGroupChat(active.group_id).then((m) => alive && setChat(m)).catch(() => {});
    load();
    const t = setInterval(load, CHAT_POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [active, view]);

  const join = async (g: GroupSummary) => {
    setErr(null);
    try {
      await gymJoinGroup(g.group_id);
      updateGroup(g.group_id, { is_member: true, member_count: g.member_count + 1 });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't join the group.");
    }
  };
  const leave = async (g: GroupSummary) => {
    setErr(null);
    try {
      await gymLeaveGroup(g.group_id);
      updateGroup(g.group_id, { is_member: false, member_count: Math.max(0, g.member_count - 1) });
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't leave the group.");
    }
  };

  const post = async () => {
    if (!active || !postText.trim()) return;
    setErr(null);
    try {
      const p = await gymCreatePost(active.group_id, postText.trim());
      setPosts((prev) => [p, ...prev]); setPostText("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't post.");
    }
  };
  const sendChat = async () => {
    if (!active || !chatText.trim()) return;
    setErr(null);
    try {
      const m = await gymSendGroupChat(active.group_id, chatText.trim());
      setChat((prev) => [...prev, m]); setChatText("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Couldn't send the message.");
    }
  };

  // Decode my user id from the JWT to align chat bubbles.
  const myId = (() => {
    try {
      const t = getToken();
      return t ? (JSON.parse(atob(t.split(".")[1])).sub as string) : null;
    } catch { return null; }
  })();

  return (
    <>
      <TopBar title="Groups" search="Search" avatarLetter="G" />
      <PageBody max="form">
        <PageHeader eyebrow="Groups">Join wellness groups to post and chat with other members.</PageHeader>

        {err && <div className="mb-3 text-[13px] text-coral">{err}</div>}

        <div className="flex flex-wrap gap-2">
          {(groups.data ?? []).map((g) => (
            <Chip key={g.group_id} active={active?.group_id === g.group_id}
              onClick={() => { setActive(g); setView("posts"); }}>
              {g.name}{g.is_member ? " ✓" : ""}
            </Chip>
          ))}
        </div>

        {groups.loading && <div className="mt-5 text-[14px] text-muted">Loading…</div>}
        {!groups.loading && (groups.data ?? []).length === 0 && (
          <div className="mt-6"><EmptyState title="No groups yet" icon="community">Your specialist hasn’t created any groups yet.</EmptyState></div>
        )}

        {active && (
          <div className="mt-6">
            <Card className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-serif text-[18px] text-charcoal">{active.name}</div>
                  {active.description && <div className="font-sans text-[13px] text-muted">{active.description}</div>}
                  <div className="mt-1 font-sans text-[12px] text-muted">{active.member_count} member{active.member_count === 1 ? "" : "s"}</div>
                </div>
                {active.is_member
                  ? <Button type="button" variant="ghost" size="sm" onClick={() => leave(active)}>Leave</Button>
                  : <Button type="button" variant="dark" size="sm" onClick={() => join(active)}>Join</Button>}
              </div>
            </Card>

            <div className="mb-4 flex gap-2">
              <Chip active={view === "posts"} onClick={() => setView("posts")}>Posts</Chip>
              <Chip active={view === "chat"} onClick={() => setView("chat")}>Chat</Chip>
            </div>

            {!active.is_member && (
              <div className="mb-4 border border-border bg-cream px-4 py-3 font-sans text-[13px] text-subtle">
                Join this group to post and use the chat.
              </div>
            )}

            {view === "posts" && (
              <div>
                {active.is_member && (
                  <Card className="mb-4">
                    <div className="flex items-end gap-3">
                      <Input value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Post an update…" />
                      <Button type="button" variant="dark" onClick={post}>Post</Button>
                    </div>
                  </Card>
                )}
                {posts.length === 0 && <EmptyState title="No posts yet" icon="community">Be the first to post here.</EmptyState>}
                <div className="space-y-2">
                  {posts.map((p) => (
                    <Card key={p.post_id}>
                      <div className="font-sans text-[14px] text-charcoal">{p.content}</div>
                      {p.created_at && <div className="mt-1 font-sans text-[12px] text-muted">{relativeTime(p.created_at)}</div>}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {view === "chat" && active.is_member && (
              <Card padded={false}>
                <div className="max-h-[420px] min-h-[200px] space-y-2 overflow-auto p-4">
                  {chat.length === 0 && (
                    <div className="py-10 text-center font-sans text-[13px] text-muted">No messages yet — say hello.</div>
                  )}
                  {chat.map((m) => {
                    const mine = myId != null && m.sender_id === myId;
                    return (
                      <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[78%] border px-3.5 py-2 ${mine ? "border-coral bg-coral-soft" : "border-border bg-paper"}`}>
                          {!mine && <div className="font-sans text-[11px] font-semibold text-subtle">{m.sender_name ?? "Member"}</div>}
                          <div className="font-sans text-[14px] leading-snug text-charcoal">{m.body}</div>
                          <div className="mt-1 font-sans text-[10px] text-muted">{relativeTime(m.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-end gap-3 border-t border-border p-4">
                  <Input value={chatText} onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder="Type a message…" />
                  <Button type="button" variant="dark" onClick={sendChat}>Send</Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
