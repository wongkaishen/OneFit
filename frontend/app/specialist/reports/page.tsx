"use client";
import { useState } from "react";
import { TopBar } from "@/components/shell/TopBar";
import { PageBody, PageHeader } from "@/components/shell/Page";
import { Label } from "@/components/ui/Label";
import { Hairline } from "@/components/ui/Hairline";
import { Card } from "@/components/ui/Card";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { useResource } from "@/lib/api/useResource";
import { listClients, createHealthTrend } from "@/lib/api/specialist";
import type { ClientSummary } from "@/lib/api/types";

export default function ReportsPage() {
  const { data, error, loading } = useResource<ClientSummary[]>(listClients, []);
  const clients = data ?? [];

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);

  const goalCounts = clients.reduce<Record<string, number>>((acc, c) => {
    const g = c.goal ?? "Unspecified";
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});
  const goalData = Object.entries(goalCounts).map(([k, v]) => ({ k, v }));

  const withWeight = clients.filter((c) => c.weight != null);
  const avgWeight = withWeight.length
    ? withWeight.reduce((s, c) => s + Number(c.weight), 0) / withWeight.length
    : null;

  async function handleGenerateTrend() {
    setGenerating(true);
    setGenError(null);
    setRecommendation(null);
    try {
      const result = await createHealthTrend();
      if (result.recommendation) {
        setRecommendation(result.recommendation);
      }
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Failed to generate trend report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <TopBar title="Reports" search="Search" avatarLetter="J" />
      <PageBody>
        <PageHeader
          eyebrow="Roster health trends"
          actions={
            <Button onClick={handleGenerateTrend} disabled={generating} size="sm">
              {generating ? "Generating…" : "Generate trend report"}
            </Button>
          }
        >
          Aggregated, anonymized trends across your <b>whole roster</b> — use them to spot patterns
          and refine your programs. These are cohort-level figures; open a client’s profile for
          individual data.
        </PageHeader>
          <div className="mb-4 font-sans text-[12px] text-muted">
            The recommendation below is <b>AI-generated</b> from your roster’s aggregate metrics —
            review it before acting on it.
          </div>

          {genError && (
            <div className="mb-4 text-[13px] text-coral">{genError}</div>
          )}

          {recommendation && (
            <Card className="mb-6 border-l-2 border-l-coral text-[14px] text-charcoal">
              <Label>Recommendation</Label>
              <div className="mt-2 leading-relaxed">{recommendation}</div>
            </Card>
          )}

          {loading && <div className="py-8"><Label>Loading…</Label></div>}
          {error && <div className="py-8 text-[13px] text-coral">{error}</div>}

          {!loading && !error && clients.length === 0 && (
            <div className="py-8"><Label>Not enough data — clients need to log progress.</Label></div>
          )}

          {!loading && !error && clients.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <Card>
                <Label>Clients by goal</Label>
                <div className="font-sans text-[11px] text-muted">
                  How many of your clients are working toward each fitness goal.
                </div>
                <div className="mt-4"><BarChart data={goalData} height={160} highlightLast={false} /></div>
              </Card>
              <Card>
                <Label>Roster summary</Label>
                <div className="mt-4 flex justify-between py-2">
                  <span className="font-sans text-[13px] text-subtle">Active clients</span>
                  <span className="font-sans text-[13px] font-semibold text-charcoal">{clients.length}</span>
                </div>
                <Hairline />
                <div className="flex justify-between py-2">
                  <span className="font-sans text-[13px] text-subtle">Avg. weight (kg)</span>
                  <span className="font-sans text-[13px] font-semibold text-charcoal">
                    {avgWeight != null ? avgWeight.toFixed(1) : "—"}
                  </span>
                </div>
                <Hairline />
                <div className="flex justify-between py-2">
                  <span className="font-sans text-[13px] text-subtle">Tracking weight</span>
                  <span className="font-sans text-[13px] font-semibold text-charcoal">
                    {withWeight.length}/{clients.length}
                  </span>
                </div>
              </Card>
            </div>
          )}
      </PageBody>
    </>
  );
}
