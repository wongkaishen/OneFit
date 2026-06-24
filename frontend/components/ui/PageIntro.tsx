/** One-line purpose description shown under a page's title to orient the user. */
export function PageIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-7 max-w-[620px] font-sans text-[13px] leading-relaxed text-muted">
      {children}
    </p>
  );
}
