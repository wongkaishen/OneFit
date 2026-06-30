/**
 * Loading placeholders to replace bare "Loading…" text. Uses a soft pulse on
 * the cream/border palette so it reads as content settling in, not an error.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[2px] bg-border/60 ${className}`} />;
}

/** A few stacked skeleton lines — handy default for list/detail loading. */
export function SkeletonLines({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-[14px] ${i === rows - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

/** Card-shaped skeleton block. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`border border-border bg-white p-5 ${className}`} aria-hidden>
      <Skeleton className="h-[12px] w-1/3" />
      <Skeleton className="mt-4 h-[22px] w-2/3" />
      <Skeleton className="mt-3 h-[12px] w-1/2" />
    </div>
  );
}
