/**
 * Surface container for grouping content. Sharp editorial corners with subtle
 * depth (shadow-card). Optional header (eyebrow + title + actions) and footer.
 */
export function Card({
  children,
  className = "",
  padded = true,
  hover = false,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
  /** Lift on hover — for clickable cards (lists, links). */
  hover?: boolean;
}) {
  return (
    <div
      className={`border border-border bg-paper shadow-card ${
        hover ? "transition-shadow hover:shadow-raised" : ""
      } ${padded ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  eyebrow,
  title,
  actions,
  className = "",
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <div className="of-eyebrow mb-1.5">{eyebrow}</div>}
        {title && (
          <div className="font-serif text-[20px] leading-tight text-charcoal">{title}</div>
        )}
      </div>
      {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small uppercase section heading used above a Card or list. */
export function SectionTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`of-eyebrow ${className}`}>{children}</div>;
}
