"use client";
export function Chip({
  children, active, onClick,
}: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[30px] px-[14px] text-[12px] font-sans whitespace-nowrap border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/30 ${
        active
          ? "bg-charcoal text-cream border-charcoal font-semibold"
          : "bg-transparent text-subtle border-border hover:border-charcoal hover:text-charcoal"
      }`}
    >
      {children}
    </button>
  );
}
