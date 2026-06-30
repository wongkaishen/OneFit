export function Avatar({ letter = "A", size = 34 }: { letter?: string; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full border border-charcoal font-sans text-charcoal"
      style={{ width: size, height: size, fontSize: size < 40 ? 13 : 26, fontFamily: size >= 40 ? "var(--font-garamond)" : undefined }}
    >
      {letter}
    </div>
  );
}
