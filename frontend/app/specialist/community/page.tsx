"use client";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Chip } from "@/components/ui/Chip";
import { Hairline } from "@/components/ui/Hairline";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Field";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { Textarea } from "@/components/ui/Field";
import { listGroups, createGroup, deleteGroup, listGroupPosts, createGroupPost, moderatePost, specialistCreateFeedPost, specialistUploadFeedPhoto } from "@/lib/api/specialist";
import type { CommunityGroup, CommunityPost } from "@/lib/api/types";

function FeedComposer() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "good" | "coral"; text: string } | null>(null);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg(null);
    try {
      const { image_url } = await specialistUploadFeedPhoto(file);
      setImage(image_url);
    } catch (e2) {
      setMsg({ tone: "coral", text: e2 instanceof ApiError ? e2.message : "Couldn't upload the photo." });
    } finally {
      setBusy(false); e.target.value = "";
    }
  };

  const share = async () => {
    if (!text.trim() && !image) return;
    setBusy(true); setMsg(null);
    try {
      await specialistCreateFeedPost(text.trim(), image);
      setText(""); setImage(null);
      setMsg({ tone: "good", text: "Shared to the community feed." });
    } catch (e2) {
      setMsg({ tone: "coral", text: e2 instanceof ApiError ? e2.message : "Couldn't share your post." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mb-6">
      <Label>Share to the community feed</Label>
      <Textarea className="mt-3" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="Share a tip or an educational highlight with all members…" />
      {image && (
        <div className="mt-3 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="max-h-[180px] rounded border border-border object-cover" />
          <button type="button" onClick={() => setImage(null)}
            className="text-[12px] font-semibold uppercase tracking-label text-subtle hover:text-coral">Remove</button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="cursor-pointer text-[12px] font-semibold uppercase tracking-label text-subtle hover:text-charcoal">
          {busy ? "Uploading…" : "Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} disabled={busy} />
        </label>
        <Button type="button" variant="dark" onClick={share} disabled={busy || (!text.trim() && !image)}>Share</Button>
      </div>
      {msg && <div className={`mt-2 text-[13px] ${msg.tone === "good" ? "text-good" : "text-coral"}`}>{msg.text}</div>}
    </Card>
  );
}

export default function SpecialistCommunityPage() {
  const groups = useResource<CommunityGroup[]>(listGroups, []);
  const [active, setActive] = useState<string | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [newGroup, setNewGroup] = useState("");
  const [newPost, setNewPost] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    setPostsError(null);
    listGroupPosts(active).then(setPosts).catch(() => setPostsError("Couldn't load posts."));
  }, [active]);

  const addGroup = async () => {
    if (!newGroup.trim()) return;
    setErr(null);
    try {
      const g = await createGroup(newGroup.trim());
      groups.setData((prev) => [...(prev ?? []), g]); setNewGroup("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create group.");
    }
  };
  const removeGroup = async (id: string) => {
    if (!confirm("Delete this group and all its posts?")) return;
    setErr(null);
    try {
      await deleteGroup(id);
      groups.setData((prev) => (prev ?? []).filter((g) => g.group_id !== id));
      if (active === id) { setActive(null); setPosts([]); }
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to delete group.");
    }
  };
  const addPost = async () => {
    if (!active || !newPost.trim()) return;
    setErr(null);
    try {
      const p = await createGroupPost(active, newPost.trim());
      setPosts((prev) => [p, ...prev]); setNewPost("");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to post.");
    }
  };
  const moderate = async (id: string, action: "remove" | "warn" | "escalate") => {
    setErr(null);
    try {
      const updated = await moderatePost(id, action, action === "escalate" ? "high" : "low");
      setPosts((prev) => prev.map((p) => (p.post_id === id ? updated : p)));
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Moderation action failed.");
    }
  };

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="S" />
      <PageBody>
        <PageHeader eyebrow="Community">Share to the feed, create groups, post updates, and moderate member posts.</PageHeader>

          <FeedComposer />

          <Card className="mb-6">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
              <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="New group name" />
              <Button type="button" variant="dark" onClick={addGroup}>Create group</Button>
            </div>
          </Card>
          {err && <div className="mb-3 text-[13px] text-coral">{err}</div>}

          <div className="flex flex-wrap items-center gap-2">
            {(groups.data ?? []).map((g) => (
              <div key={g.group_id} className="flex items-center gap-1">
                <Chip active={active === g.group_id} onClick={() => setActive(g.group_id)}>{g.name}</Chip>
                <button
                  type="button"
                  onClick={() => removeGroup(g.group_id)}
                  className="px-1 font-sans text-[14px] leading-none text-muted hover:text-coral"
                  aria-label={`Delete group ${g.name}`}
                  title="Delete group"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {active && (
            <div className="mt-6">
              <Card>
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                  <Input value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Post an update…" />
                  <Button type="button" variant="dark" onClick={addPost}>Post</Button>
                </div>
              </Card>
              {postsError && <div className="mt-4 text-[14px] text-coral">{postsError}</div>}
              {posts.length === 0 && !postsError && (
                <div className="mt-6"><EmptyState title="No posts yet" icon="community">Post the first update for this group.</EmptyState></div>
              )}
              {posts.length > 0 && (
                <Card padded={false} className="mt-5">
                {posts.map((p, i) => (
                  <div key={p.post_id}>
                    {i > 0 && <Hairline />}
                    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="font-sans text-[14px] text-charcoal">{p.content}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={p.status === "Removed" ? "neutral" : "good"}>{p.status}</Badge>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moderate(p.post_id, "warn")}>Flag</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moderate(p.post_id, "remove")}>Remove</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moderate(p.post_id, "escalate")}>Escalate</Button>
                      </div>
                    </div>
                  </div>
                ))}
                </Card>
              )}
            </div>
          )}
      </PageBody>
    </>
  );
}
