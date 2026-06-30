export function Progress({ pct, className = "" }: { pct: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`relative h-[2px] w-full bg-border ${className}`}>
      <div className="absolute left-0 top-0 h-[2px] bg-coral" style={{ width: `${clamped}%` }} />
    </div>
  );
}
