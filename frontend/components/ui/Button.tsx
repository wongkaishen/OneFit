"use client";
type Variant = "primary" | "dark" | "ghost" | "soft";
type Size = "sm" | "md" | "lg";

export function Button({
  children, variant = "primary", size = "md", onClick, type = "button", disabled,
  fullWidth = false, className = "",
}: {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}) {
  const variants: Record<Variant, string> = {
    primary: "bg-coral text-charcoal border border-coral shadow-card hover:brightness-95",
    dark: "bg-charcoal text-cream border border-charcoal shadow-card hover:bg-charcoal-deep",
    ghost: "bg-paper text-charcoal border border-border hover:border-charcoal",
    soft: "bg-coral-soft text-warm-red border border-coral-soft hover:border-coral",
  };
  const sizes: Record<Size, string> = {
    sm: "h-[32px] px-3.5 text-[10px]",
    md: "h-[42px] px-[22px] text-[11px]",
    lg: "h-[48px] px-7 text-[12px]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-bold uppercase tracking-button transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/40 focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? "w-full" : ""} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
