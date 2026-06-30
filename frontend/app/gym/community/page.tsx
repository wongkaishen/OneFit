"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
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
    setPostsError(null);
    try {
      const p = await gymCreatePost(active, text.trim());
      setPosts((prev) => [p, ...prev]); setText("");
    } catch {
      setPostsError("Couldn't post — please try again.");
    }
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="G" />
      <PageBody max="form">
        <PageHeader eyebrow="Community">Share your progress and connect with other members.</PageHeader>
          <div className="flex flex-wrap gap-2">
            {(groups.data ?? []).map((g) => (
              <Chip key={g.group_id} active={active === g.group_id} onClick={() => setActive(g.group_id)}>
                {g.name}
              </Chip>
            ))}
          </div>
          {!active && (
            <div className="mt-6">
              <EmptyState title="Select a group" icon="community">
                Pick a group above to view and share posts.
              </EmptyState>
            </div>
          )}
          {active && (
            <div className="mt-6">
              <Card>
                <div className="flex items-end gap-3">
                  <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Share something…" />
                  <Button type="button" variant="dark" onClick={post}>Post</Button>
                </div>
              </Card>
              {postsError && <div className="mt-4 text-[14px] text-coral">{postsError}</div>}
              {posts.length === 0 && !postsError && (
                <div className="mt-6">
                  <EmptyState title="No posts yet" icon="community">Be the first to share something with this group.</EmptyState>
                </div>
              )}
              {posts.length > 0 && (
                <div className="mt-5 space-y-3">
                  {posts.map((p) => (
                    <Card key={p.post_id} className="font-sans text-[14px] leading-relaxed text-charcoal">
                      {p.content}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
      </PageBody>
    </>
  );
}
