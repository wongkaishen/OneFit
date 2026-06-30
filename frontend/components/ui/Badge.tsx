type Tone = "neutral" | "good" | "warn" | "live" | "draft" | "archived" | "flag";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: "bg-cream-deep text-subtle border border-border",
    good: "bg-good-soft text-good border border-good-border",
    warn: "bg-coral text-charcoal border border-coral",
    live: "bg-charcoal text-cream border border-charcoal",
    draft: "bg-coral-soft text-warm-red border border-coral-soft",
    archived: "bg-transparent text-muted border border-dashed border-border-strong",
    flag: "bg-transparent text-charcoal border border-charcoal",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-[9px] font-sans font-bold uppercase tracking-wider leading-none whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
