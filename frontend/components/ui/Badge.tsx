type Tone = "neutral" | "good" | "warn" | "live" | "draft" | "archived" | "flag";

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: "bg-transparent text-subtle border border-border",
    good: "bg-transparent text-good border border-good-border",
    warn: "bg-coral text-charcoal border-0",
    live: "bg-charcoal text-cream border-0",
    draft: "bg-transparent text-muted border border-border",
    archived: "bg-transparent text-muted border border-dashed border-border",
    flag: "bg-transparent text-charcoal border border-charcoal",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-[9px] font-sans font-bold uppercase tracking-wider leading-none whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
