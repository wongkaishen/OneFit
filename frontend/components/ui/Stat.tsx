/**
 * Headline metric block: an eyebrow label over a large serif value, with an
 * optional sub-line. Used on dashboards and detail panels.
 */
export function Stat({
  label,
  value,
  sub,
  accent = false,
  className = "",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="of-eyebrow">{label}</div>
      <div className={`mt-2 font-serif text-[30px] leading-none ${accent ? "text-coral" : "text-charcoal"}`}>
        {value}
      </div>
      {sub && <div className="mt-2 font-sans text-[12px] text-muted">{sub}</div>}
    </div>
  );
}
