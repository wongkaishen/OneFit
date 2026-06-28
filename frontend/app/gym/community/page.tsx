"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { useResource } from "@/lib/api/useResource";
import { gymListGroups, gymListPosts, gymCreatePost } from "@/lib/api/gym";
import type { CommunityGroup, CommunityPost } from "@/lib/api/types";

export default function GymCommunityPage() {
  const groups = useResource<CommunityGroup[]>(gymListGroups, []);
  const params = useSearchParams();
  const [active, setActive] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [text, setText] = useState(params.get("share") ?? "");

  useEffect(() => {
    if (active) {
      setPostsError(null);
      gymListPosts(active).then(setPosts).catch(() => setPostsError("Couldn't load posts."));
    }
  }, [active]);

  const post = async () => {
    if (!active || !text.trim()) return;
    const p = await gymCreatePost(active, text.trim());
    setPosts((prev) => [p, ...prev]); setText("");
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="G" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Share your progress and connect with other members.</PageIntro>
          <div className="flex flex-wrap gap-2">
            {(groups.data ?? []).map((g) => (
              <Button key={g.group_id} type="button" variant={active === g.group_id ? "dark" : "ghost"}
                onClick={() => setActive(g.group_id)}>{g.name}</Button>
            ))}
          </div>
          {!active && <div className="mt-4"><Label>Select a group to view posts.</Label></div>}
          {active && (
            <div className="mt-6">
              <div className="flex items-end gap-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something…"
                  className="h-[42px] flex-1 border border-border px-3 text-[14px] outline-none focus:border-charcoal" />
                <Button type="button" variant="dark" onClick={post}>Post</Button>
              </div>
              <Hairline className="mt-4" />
              {postsError && (
                <div className="mt-4 text-[14px] text-coral">{postsError}</div>
              )}
              {posts.length === 0 && !postsError && (
                <div className="mt-4"><Label>No posts yet. Be the first to share!</Label></div>
              )}
              {posts.map((p) => (
                <div key={p.post_id}>
                  <div className="py-4 font-sans text-[14px] text-charcoal">{p.content}</div>
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
