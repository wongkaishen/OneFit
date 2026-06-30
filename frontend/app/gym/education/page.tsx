"use client";
import { useMemo, useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Chip } from "@/components/ui/Chip";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { gymListContent } from "@/lib/api/gym";
import { shortDate } from "@/lib/format";
import type { EducationalContentOut } from "@/lib/api/types";

export default function GymEducationPage() {
  const { data, error, loading } = useResource<EducationalContentOut[]>(gymListContent, []);
  const [category, setCategory] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set((data ?? []).map((c) => c.category).filter(Boolean));
    return Array.from(set).sort();
  }, [data]);

  const items = useMemo(
    () => (category ? (data ?? []).filter((c) => c.category === category) : data ?? []),
    [data, category],
  );

  return (
    <>
      <TopBar title="Education" search="Search" avatarLetter="G" />
      <PageBody max="form">
        <PageHeader eyebrow="Education">
          Articles and guides published by our wellness specialists.
        </PageHeader>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              All
            </Chip>
            {categories.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}

        {loading && <div className="mt-6 text-[14px] text-muted">Loading…</div>}
        {error && <div className="mt-6 text-[14px] text-coral">{error}</div>}

        {!loading && !error && items.length === 0 && (
          <div className="mt-6">
            <EmptyState title="Nothing here yet" icon="content">
              No educational content has been published yet. Check back soon.
            </EmptyState>
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-5 space-y-3">
            {items.map((c) => {
              const open = openId === c.content_id;
              return (
                <Card key={c.content_id} hover className="cursor-pointer">
                  <div onClick={() => setOpenId(open ? null : c.content_id)}>
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-[18px] text-charcoal">{c.title}</h3>
                      <Chip active={false}>{c.category}</Chip>
                    </div>
                    <div className="mt-1 font-sans text-[12px] text-muted">
                      {c.specialist_name ?? "OneFit specialist"} · {shortDate(c.created_at)}
                    </div>
                    {!open && (
                      <p className="mt-3 line-clamp-2 font-sans text-[14px] leading-relaxed text-subtle">
                        {c.body}
                      </p>
                    )}
                  </div>
                  {open && (
                    <div className="mt-3">
                      {c.media_url && (
                        <img
                          src={c.media_url}
                          alt=""
                          className="mb-4 max-h-[320px] w-full rounded border border-border object-cover"
                        />
                      )}
                      <p className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-charcoal">
                        {c.body}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
