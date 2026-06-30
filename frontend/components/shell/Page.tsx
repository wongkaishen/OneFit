/**
 * Page layout primitives shared by every screen.
 *
 * - `PageBody`   scroll container + responsive padding + entrance animation.
 * - `PageHeader` intro block: optional eyebrow, lead description, and an actions
 *                slot that drops below the text on mobile.
 * - `Section`    a labelled content group with consistent spacing.
 */
export function PageBody({
  children,
  max = "wide",
  className = "",
}: {
  children: React.ReactNode;
  max?: "narrow" | "form" | "wide" | "full";
  className?: string;
}) {
  const widths: Record<string, string> = {
    narrow: "max-w-[680px]",
    form: "max-w-[760px]",
    wide: "max-w-[1180px]",
    full: "max-w-none",
  };
  return (
    <main className="flex-1 overflow-auto">
      <div className={`mx-auto animate-fade-in px-5 py-7 sm:px-7 lg:px-9 lg:py-9 ${widths[max]} ${className}`}>
        {children}
      </div>
    </main>
  );
}

export function PageHeader({
  eyebrow,
  children,
  actions,
}: {
  eyebrow?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="of-eyebrow mb-2">{eyebrow}</div>}
        {children && (
          <p className="max-w-[640px] font-sans text-[13.5px] leading-relaxed text-subtle">
            {children}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-none flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  actions,
  children,
  className = "",
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-9 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <div className="of-eyebrow">{title}</div>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
