"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { listGroups, createGroup, listGroupPosts, createGroupPost, moderatePost } from "@/lib/api/specialist";
import type { CommunityGroup, CommunityPost } from "@/lib/api/types";

export default function SpecialistCommunityPage() {
  const groups = useResource<CommunityGroup[]>(listGroups, []);
  const [active, setActive] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [newPost, setNewPost] = useState("");

  useEffect(() => {
    if (!active) return;
    setPostsError(null);
    listGroupPosts(active).then(setPosts).catch(() => setPostsError("Couldn't load posts."));
  }, [active]);

  const addGroup = async () => {
    if (!newGroup.trim()) return;
    const g = await createGroup(newGroup.trim());
    groups.setData((prev) => [...(prev ?? []), g]); setNewGroup("");
  };
  const addPost = async () => {
    if (!active || !newPost.trim()) return;
    const p = await createGroupPost(active, newPost.trim());
    setPosts((prev) => [p, ...prev]); setNewPost("");
  };
  const moderate = async (id: string, action: "remove" | "warn" | "escalate") => {
    const updated = await moderatePost(id, action, action === "escalate" ? "high" : "low");
    setPosts((prev) => prev.map((p) => (p.post_id === id ? updated : p)));
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="S" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Create groups, post updates, and moderate member posts.</PageIntro>

          <div className="mb-6 flex items-end gap-3">
            <input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group name"
              className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
            <Button type="button" variant="dark" onClick={addGroup}>Create group</Button>
          </div>

          <div className="flex gap-2">
            {(groups.data ?? []).map((g) => (
              <Button key={g.group_id} type="button" variant={active === g.group_id ? "dark" : "ghost"}
                onClick={() => setActive(g.group_id)}>{g.name}</Button>
            ))}
          </div>

          {active && (
            <div className="mt-6">
              <div className="flex items-end gap-3">
                <input value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Post an update…"
                  className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                <Button type="button" variant="dark" onClick={addPost}>Post</Button>
              </div>
              <Hairline className="mt-4" />
              {postsError && (
                <div className="mt-4 text-[14px] text-coral">{postsError}</div>
              )}
              {posts.map((p) => (
                <div key={p.post_id}>
                  <div className="flex items-center justify-between py-4">
                    <div className="font-sans text-[14px] text-charcoal">{p.content}</div>
                    <div className="flex items-center gap-2">
                      <Badge tone={p.status === "Removed" ? "neutral" : "good"}>{p.status}</Badge>
                      <Button type="button" variant="ghost" onClick={() => moderate(p.post_id, "warn")}>Flag</Button>
                      <Button type="button" variant="ghost" onClick={() => moderate(p.post_id, "remove")}>Remove</Button>
                      <Button type="button" variant="ghost" onClick={() => moderate(p.post_id, "escalate")}>Escalate</Button>
                    </div>
                  </div>
                  <Hairline />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
