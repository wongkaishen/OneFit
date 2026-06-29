import { Label } from "./Label";

export function BarChart({
  data, height = 120, highlightLast = true, scaleFromMin = false,
}: {
  data: { k: string; v: number }[];
  height?: number;
  highlightLast?: boolean;
  /** Scale bars between the min and max value (with a floor) so small
   *  differences (e.g. a ~1 kg weight change) are readable instead of a flat row. */
  scaleFromMin?: boolean;
}) {
  if (data.length === 0) return <Label>No data</Label>;
  const values = data.map((d) => d.v);
  const max = Math.max(...values, scaleFromMin ? -Infinity : 1);
  const min = Math.min(...values);
  const span = max - min;

  const pct = (v: number): number => {
    if (!scaleFromMin) return (v / (max || 1)) * 100;
    if (span <= 0) return 100; // all values equal — show full, equal bars
    return 18 + ((v - min) / span) * 82; // 18% floor so the smallest bar stays visible
  };

  return (
    <div className="flex items-end gap-[10px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="font-sans text-[9px] text-muted">{d.v}</span>
          <div
            className={`w-full ${highlightLast && i === data.length - 1 ? "bg-coral" : "bg-border"}`}
            style={{ height: `${pct(d.v)}%` }}
          />
          <Label className="!text-[8px]">{d.k}</Label>
        </div>
      ))}
    </div>
  );
}
