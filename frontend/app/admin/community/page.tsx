"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Hairline } from "@/components/ui/Hairline";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import {
  adminListGroups, adminListGroupPosts, adminUpdatePost, adminDeletePost,
} from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { AdminCommunityGroup, AdminCommunityPost } from "@/lib/api/types";

export default function AdminCommunityPage() {
  const groups = useResource<AdminCommunityGroup[]>(adminListGroups, []);
  const [active, setActive] = useState<AdminCommunityGroup | null>(null);
  const [posts, setPosts] = useState<AdminCommunityPost[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const openGroup = async (g: AdminCommunityGroup) => {
    setActive(g);
    setPosts([]);
    setPostsError(null);
    try {
      setPosts(await adminListGroupPosts(g.group_id));
    } catch (e) {
      setPostsError(e instanceof ApiError ? e.message : "Couldn't load posts.");
    }
  };

  const setStatus = async (post: AdminCommunityPost, status: string) => {
    setBusy(post.post_id);
    try {
      const updated = await adminUpdatePost(post.post_id, { status });
      setPosts((prev) => prev.map((p) => (p.post_id === post.post_id ? updated : p)));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (post: AdminCommunityPost) => {
    if (!confirm("Permanently delete this post? This cannot be undone.")) return;
    setBusy(post.post_id);
    try {
      await adminDeletePost(post.post_id);
      setPosts((prev) => prev.filter((p) => p.post_id !== post.post_id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="A" />
      <PageBody>
        <PageHeader eyebrow="Community moderation">
          Review community groups and moderate member posts. Viewing a group&apos;s posts and every
          edit, removal, or deletion is recorded in the audit log.
        </PageHeader>

        {!active && (
          <>
            {groups.loading && <div className="py-6"><Label>Loading…</Label></div>}
            {groups.error && <div className="py-6 text-[13px] text-coral">{groups.error}</div>}
            {!groups.loading && !groups.error && (groups.data ?? []).length === 0 && (
              <EmptyState title="No community groups" icon="community">Nothing to moderate yet.</EmptyState>
            )}
            {(groups.data ?? []).length > 0 && (
              <Card padded={false}>
                {(groups.data ?? []).map((g, i) => (
                  <div key={g.group_id}>
                    {i > 0 && <Hairline />}
                    <button
                      type="button"
                      onClick={() => openGroup(g)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-cream"
                    >
                      <div>
                        <div className="font-sans text-[14px] text-charcoal">{g.name}</div>
                        <div className="mt-1 font-sans text-[11px] text-muted">
                          {g.specialist_name ? `Owner: ${g.specialist_name}` : "No owner"}
                          {` · ${g.post_count} post${g.post_count === 1 ? "" : "s"}`}
                        </div>
                      </div>
                      <span className="font-sans text-[11px] uppercase tracking-label text-muted">View →</span>
                    </button>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}

        {active && (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <div className="font-sans text-[15px] text-charcoal">{active.name}</div>
                {active.description && (
                  <div className="mt-1 font-sans text-[12px] text-muted">{active.description}</div>
                )}
              </div>
              <Button type="button" variant="ghost" onClick={() => setActive(null)}>← All groups</Button>
            </div>

            {postsError && <div className="py-6 text-[13px] text-coral">{postsError}</div>}
            {!postsError && posts.length === 0 && (
              <EmptyState title="No posts" icon="community">This group has no posts.</EmptyState>
            )}
            {posts.length > 0 && (
              <Card padded={false}>
                {posts.map((p, i) => (
                  <div key={p.post_id}>
                    {i > 0 && <Hairline />}
                    <div className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-sans text-[12px] text-muted">
                          {p.author_name ?? "Unknown"}
                          {p.author_email ? ` · ${p.author_email}` : ""} · {shortDate(p.created_at)}
                        </div>
                        <Badge tone={p.status === "Removed" ? "archived" : "neutral"}>{p.status}</Badge>
                      </div>
                      <div className="mt-2 font-sans text-[14px] text-charcoal whitespace-pre-wrap">{p.content}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.status !== "Removed" ? (
                          <Button size="sm" variant="ghost" disabled={busy === p.post_id}
                            onClick={() => setStatus(p, "Removed")}>Hide (Removed)</Button>
                        ) : (
                          <Button size="sm" variant="ghost" disabled={busy === p.post_id}
                            onClick={() => setStatus(p, "Posted")}>Restore</Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={busy === p.post_id}
                          onClick={() => remove(p)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
