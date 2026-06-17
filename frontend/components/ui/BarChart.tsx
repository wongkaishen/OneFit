import { Label } from "./Label";

export function BarChart({
  data, height = 120, highlightLast = true,
}: {
  data: { k: string; v: number }[];
  height?: number;
  highlightLast?: boolean;
}) {
  if (data.length === 0) return <Label>No data</Label>;
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="flex items-end gap-[10px]" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <div
            className={`w-full ${highlightLast && i === data.length - 1 ? "bg-coral" : "bg-border"}`}
            style={{ height: `${(d.v / max) * 100}%` }}
          />
          <Label className="!text-[8px]">{d.k}</Label>
        </div>
      ))}
    </div>
  );
}
