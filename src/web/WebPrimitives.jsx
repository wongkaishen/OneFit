import React, { useState } from "react";

export function WLabel({ children, style }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 9,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color: "var(--muted)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

const buttonBase = (size) => ({
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: size === "sm" ? 10 : 11,
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  height: size === "sm" ? 34 : 42,
  padding: size === "sm" ? "0 16px" : "0 22px",
  cursor: "pointer",
  border: "1px solid transparent",
  whiteSpace: "nowrap",
  transition: "opacity .12s ease, transform .12s ease, filter .12s ease, background .12s ease, color .12s ease",
});

const buttonVariants = {
  primary: { background: "var(--coral)", color: "var(--charcoal)", border: "1px solid var(--coral)" },
  dark: { background: "var(--charcoal)", color: "var(--cream)", border: "1px solid var(--charcoal)" },
  ghost: { background: "transparent", color: "var(--charcoal)", border: "1px solid var(--border)" },
};

export function WButton({ children, variant = "primary", size = "md", onClick }) {
  const [pressed, setPressed] = useState(false);
  const [hover, setHover] = useState(false);
  const v = buttonVariants[variant];
  const hoverFilter = hover
    ? variant === "primary"
      ? "brightness(0.95)"
      : variant === "dark"
      ? "brightness(1.15)"
      : "none"
    : "none";
  const hoverOverride =
    hover && variant === "ghost"
      ? { background: "var(--white)", borderColor: "var(--charcoal)" }
      : null;
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setPressed(false);
        setHover(false);
      }}
      style={{
        ...buttonBase(size),
        ...v,
        ...hoverOverride,
        filter: hoverFilter,
        opacity: pressed ? 0.9 : 1,
        transform: pressed ? "scale(0.985)" : "none",
      }}
    >
      {children}
    </button>
  );
}

export function WChip({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 30,
        padding: "0 14px",
        background: active ? "var(--charcoal)" : "transparent",
        color: active ? "var(--cream)" : "var(--subtle)",
        border: active ? "1px solid var(--charcoal)" : "1px solid var(--border)",
        fontFamily: "var(--font-sans)",
        fontWeight: active ? 600 : 400,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const badgeTones = {
  neutral: { background: "transparent", color: "var(--subtle)", border: "1px solid var(--border)" },
  good: { background: "transparent", color: "#1F8A5B", border: "1px solid #BFE0CC" },
  warn: { background: "var(--coral)", color: "var(--charcoal)", border: "1px solid var(--coral)" },
  live: { background: "var(--charcoal)", color: "var(--cream)", border: "1px solid var(--charcoal)" },
  draft: { background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" },
  archived: { background: "transparent", color: "var(--muted)", border: "1px dashed var(--border)" },
  flag: { background: "transparent", color: "var(--charcoal)", border: "1px solid var(--charcoal)" },
};

export function WBadge({ children, tone = "neutral" }) {
  return (
    <span
      style={{
        ...badgeTones[tone],
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "1px",
        textTransform: "uppercase",
        padding: "4px 8px",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {children}
    </span>
  );
}

export function WHairline({ style }) {
  return <div style={{ height: 1, background: "var(--border)", width: "100%", ...style }} />;
}

export function WProgress({ pct = 0, width = 90 }) {
  return (
    <div style={{ width, height: 2, background: "var(--border)", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${Math.max(0, Math.min(100, pct))}%`,
          background: "var(--coral)",
        }}
      />
    </div>
  );
}

export function WBarChart({ data, height = 120, highlightLast = true }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1;
        const h = (d.v / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: "100%",
                height: `${h}%`,
                background: highlightLast && isLast ? "var(--coral)" : "var(--border)",
              }}
            />
            <span style={{ fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 8, letterSpacing: "1px", color: "var(--muted)", textTransform: "uppercase" }}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
