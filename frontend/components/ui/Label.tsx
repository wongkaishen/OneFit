export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-sans font-medium text-[9px] uppercase tracking-label text-muted ${className}`}
    >
      {children}
    </span>
  );
}
