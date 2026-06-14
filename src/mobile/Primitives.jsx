import React, { useState } from "react";

export function BrandMark({ size = 14 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 10, height: 10, background: "var(--warm-red)", flex: "0 0 auto" }} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: size,
          color: "var(--charcoal)",
          letterSpacing: "-0.1px",
        }}
      >
        onefit
      </span>
    </span>
  );
}

export function Label({ children, color = "var(--muted)", style }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-sans)",
        fontWeight: 500,
        fontSize: 9,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        color,
        lineHeight: 1,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function Hairline({ style }) {
  return <div style={{ height: 1, background: "var(--border)", width: "100%", ...style }} />;
}

export function Pill({ children }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--coral)",
        color: "var(--charcoal)",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        padding: "5px 8px",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

const palettes = {
  coral: { background: "var(--coral)", color: "var(--charcoal)", border: "none" },
  dark: { background: "var(--charcoal)", color: "var(--cream)", border: "none" },
  outline: { background: "var(--white)", color: "var(--coral)", border: "2px solid var(--coral)" },
};

export function PrimaryButton({ children, variant = "coral", onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: "100%",
        height: 48,
        ...palettes[variant],
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: "2px",
        textTransform: "uppercase",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        opacity: pressed ? 0.88 : 1,
        transform: pressed ? "scale(0.99)" : "none",
        transition: "opacity .12s ease, transform .12s ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function ScreenHeader({ title, onBack, right }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 30px",
          height: 44,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {onBack && (
            <span
              onClick={onBack}
              style={{
                fontSize: 22,
                color: "var(--charcoal)",
                cursor: "pointer",
                lineHeight: 1,
                marginTop: -3,
              }}
            >
              ‹
            </span>
          )}
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--charcoal)",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
        </div>
        {right}
      </div>
      <Hairline />
    </div>
  );
}

export function Field({ label, value, placeholder, onChange, type = "text", caret }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={!onChange}
        style={{
          display: "block",
          width: "100%",
          marginTop: 12,
          marginBottom: 14,
          border: "none",
          background: "transparent",
          outline: "none",
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--charcoal)",
          padding: 0,
        }}
      />
      <Hairline />
    </div>
  );
}
