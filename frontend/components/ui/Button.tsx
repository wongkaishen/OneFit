"use client";
type Variant = "primary" | "dark" | "ghost";
type Size = "sm" | "md";

export function Button({
  children, variant = "primary", size = "md", onClick, type = "button", disabled,
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const variants: Record<Variant, string> = {
    primary: "bg-coral text-charcoal border-0 hover:brightness-95",
    dark: "bg-charcoal text-cream border-0 hover:brightness-110",
    ghost: "bg-transparent text-charcoal border border-border hover:bg-white hover:border-charcoal",
  };
  const sizes: Record<Size, string> = {
    sm: "h-[34px] px-4 text-[10px]",
    md: "h-[42px] px-[22px] text-[11px]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-bold uppercase tracking-label transition disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}
