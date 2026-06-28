"use client";
import { TopBar } from "@/components/shell/TopBar";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Hairline } from "@/components/ui/Hairline";
import { PageIntro } from "@/components/ui/PageIntro";
import { EmptyState } from "@/components/ui/EmptyState";
import { useResource } from "@/lib/api/useResource";
import { ApiError } from "@/lib/api/client";
import { listPrograms, removeProgram } from "@/lib/api/admin";
import { shortDate } from "@/lib/format";
import type { ProgramOut } from "@/lib/api/types";

export default function AdminProgramsPage() {
  const { data, error, loading, setData } = useResource<ProgramOut[]>(() => listPrograms(30), []);

  const remove = async (id: string) => {
    if (!confirm("Archive this inactive program? Its scheduled sessions will be marked missed.")) return;
    try {
      await removeProgram(id);
      setData((prev) => (prev ?? []).filter((p) => p.plan_id !== id));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    }
  };

  return (
    <>
      <TopBar title="Inactive programs" search="Search" avatarLetter="A" />
      <main className="flex-1 overflow-auto">
        <div className="px-9 py-[30px]">
          <PageIntro>Programs with no activity in the last 30 days. Archiving keeps history but removes them from active plans.</PageIntro>
          <Hairline className="mt-2" />
          {loading && <div className="py-6"><Label>Loading…</Label></div>}
          {error && <div className="py-6 text-[13px] text-coral">{error}</div>}
          {!loading && !error && (data ?? []).length === 0 && (
            <EmptyState title="No inactive programs">Nothing to clean up.</EmptyState>
          )}
          {(data ?? []).map((p) => (
            <div key={p.plan_id}>
              <div className="flex items-center justify-between py-4">
                <div>
                  <div className="font-sans text-[14px] text-charcoal">{p.goal}</div>
                  <div className="mt-1 font-sans text-[11px] text-muted">
                    Created {shortDate(p.created_at)}
                    {p.last_activity_at ? ` · last activity ${shortDate(p.last_activity_at)}` : ""}
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => remove(p.plan_id)}>Archive</Button>
              </div>
              <Hairline />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
