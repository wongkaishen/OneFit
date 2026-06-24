/** Consistent empty-state block: a heading plus a next-action hint. */
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="py-10 text-center">
      <div className="font-serif text-[18px] text-charcoal">{title}</div>
      {children && (
        <div className="mx-auto mt-2 max-w-[380px] font-sans text-[13px] leading-relaxed text-muted">
          {children}
        </div>
      )}
    </div>
  );
}
