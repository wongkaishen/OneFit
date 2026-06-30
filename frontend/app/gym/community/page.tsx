"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/shell/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { gymListFeed, gymCreateFeedPost, gymUploadFeedPhoto, gymReport } from "@/lib/api/gym";
import { relativeTime } from "@/lib/format";
import type { FeedPost } from "@/lib/api/types";

function initial(name: string | null) {
  return (name ?? "?").trim()[0]?.toUpperCase() ?? "?";
}

export default function GymCommunityPage() {
  const { data, error, loading, setData } = useResource<FeedPost[]>(gymListFeed, []);
  const params = useSearchParams();
  const [text, setText] = useState(params.get("share") ?? "");
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [composeErr, setComposeErr] = useState<string | null>(null);

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setComposeErr(null); setBusy(true);
    try {
      const { image_url } = await gymUploadFeedPhoto(file);
      setImage(image_url);
    } catch (e2) {
      setComposeErr(e2 instanceof ApiError ? e2.message : "Couldn't upload the photo.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const post = async () => {
    if (!text.trim() && !image) return;
    setComposeErr(null); setBusy(true);
    try {
      const p = await gymCreateFeedPost(text.trim(), image);
      setData((prev) => [p, ...(prev ?? [])]);
      setText(""); setImage(null);
    } catch (e2) {
      setComposeErr(e2 instanceof ApiError ? e2.message : "Couldn't share your post.");
    } finally {
      setBusy(false);
    }
  };

  const report = async (p: FeedPost) => {
    const reason = window.prompt("Report this post — why? (optional)");
    if (reason === null) return; // cancelled
    try {
      await gymReport({ target_type: "post", target_id: p.post_id, reason });
      window.alert("Thanks — this post was reported to the admins.");
    } catch (e2) {
      window.alert(e2 instanceof ApiError ? e2.message : "Couldn't submit the report.");
    }
  };

  const posts = data ?? [];

  return (
    <>
      <TopBar title="Community" search="Search" avatarLetter="G" />
      <PageBody max="form">
        <PageHeader eyebrow="Community">Share your progress and see what other members are up to.</PageHeader>

        <Card>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a win, a milestone, or some encouragement…"
          />
          {image && (
            <div className="mt-3 flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="max-h-[200px] rounded border border-border object-cover" />
              <button type="button" onClick={() => setImage(null)}
                className="text-[12px] font-semibold uppercase tracking-label text-subtle hover:text-coral">
                Remove
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="cursor-pointer text-[12px] font-semibold uppercase tracking-label text-subtle hover:text-charcoal">
              {busy ? "Uploading…" : "Add photo"}
              <input type="file" accept="image/*" className="hidden" onChange={onPickPhoto} disabled={busy} />
            </label>
            <Button type="button" variant="dark" onClick={post} disabled={busy || (!text.trim() && !image)}>
              Share
            </Button>
          </div>
          {composeErr && <div className="mt-2 text-[13px] text-coral">{composeErr}</div>}
        </Card>

        {loading && <div className="mt-6 text-[14px] text-muted">Loading…</div>}
        {error && <div className="mt-6 text-[14px] text-coral">{error}</div>}

        {!loading && !error && posts.length === 0 && (
          <div className="mt-6">
            <EmptyState title="No posts yet" icon="community">
              Be the first to share something with the community.
            </EmptyState>
          </div>
        )}

        {posts.length > 0 && (
          <div className="mt-5 space-y-3">
            {posts.map((p) => (
              <Card key={p.post_id}>
                <div className="flex items-center gap-3">
                  <Avatar letter={initial(p.author_name)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[14px] text-charcoal">{p.author_name ?? "Member"}</span>
                      {p.author_role === "wellness_specialist" && <Badge tone="good">Specialist</Badge>}
                    </div>
                    <span className="font-sans text-[12px] text-muted">{relativeTime(p.created_at)}</span>
                  </div>
                  <button type="button" onClick={() => report(p)}
                    className="text-[11px] font-semibold uppercase tracking-label text-muted hover:text-coral">
                    Report
                  </button>
                </div>
                {p.content && (
                  <p className="mt-3 whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-charcoal">
                    {p.content}
                  </p>
                )}
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="mt-3 max-h-[420px] w-full rounded border border-border object-cover" />
                )}
              </Card>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
