"use client";
import { Label } from "./Label";

const base =
  "h-[42px] w-full border border-border bg-paper px-3 text-[14px] text-charcoal outline-none transition-all placeholder:text-muted/70 focus:border-charcoal focus:ring-2 focus:ring-coral/15";

/** Label + control wrapper so every form field lines up the same way. */
export function FormField({
  label,
  hint,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && <Label>{label}</Label>}
      {children}
      {hint && <span className="font-sans text-[11px] leading-relaxed text-muted">{hint}</span>}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  // suppressHydrationWarning: password managers / form fillers (1Password,
  // LastPass, Grammarly…) inject attributes into inputs before hydration, which
  // otherwise trips React's mismatch check. The value is controlled, so real
  // content mismatches are still surfaced elsewhere.
  return <input {...rest} suppressHydrationWarning className={`${base} ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  // Custom chevron so the native control matches the design across browsers.
  return (
    <div className="relative">
      <select
        {...rest}
        className={`${base} cursor-pointer appearance-none pr-9 ${className}`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">
        ▾
      </span>
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      suppressHydrationWarning
      className={`min-h-[96px] w-full border border-border bg-paper px-3 py-2.5 text-[14px] leading-relaxed text-charcoal outline-none transition-all placeholder:text-muted/70 focus:border-charcoal focus:ring-2 focus:ring-coral/15 ${className}`}
    />
  );
}

/** Styled file picker — the native button is replaced with a tokenised pill. */
export function FileInput({ className = "", ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="file"
      {...rest}
      className={`block w-full text-[13px] text-subtle file:mr-3 file:cursor-pointer file:border file:border-border file:bg-cream file:px-4 file:py-2 file:font-sans file:text-[10px] file:font-bold file:uppercase file:tracking-label file:text-charcoal hover:file:border-charcoal ${className}`}
    />
  );
}
