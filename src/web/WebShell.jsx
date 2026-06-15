"use client";
import React, { useState } from "react";

export function WBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "26px 24px 22px" }}>
      <span style={{ width: 12, height: 12, background: "var(--warm-red)" }} />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          fontSize: 17,
          color: "var(--charcoal)",
          letterSpacing: "-0.2px",
        }}
      >
        onefit
      </span>
    </div>
  );
}

export function WAvatar({ letter = "A", ring = "var(--charcoal)" }) {
  return (
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: `1px solid ${ring}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: "var(--charcoal)",
      }}
    >
      {letter}
    </div>
  );
}

export function WNavItem({ label, active, accent = "var(--coral)", onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 24px",
        borderLeft: `2px solid ${active ? accent : "transparent"}`,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: active ? accent : "var(--border)",
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: active ? 600 : 400,
          fontSize: 13,
          color: active ? "var(--charcoal)" : "var(--subtle)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function WSidebar({ nav, active, role = "Wellness Specialist", accent = "var(--coral)", onNav, open }) {
  return (
    <aside className={`ws-sidebar${open ? " open" : ""}`}>
      <WBrand />
      <div style={{ height: 1, background: "var(--border)" }} />
      <nav style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 8 }}>
        {nav.map((item) => (
          <WNavItem
            key={item}
            label={item}
            active={item === active}
            accent={accent}
            onClick={() => onNav?.(item)}
          />
        ))}
      </nav>
      <div style={{ marginTop: "auto" }}>
        <div style={{ height: 1, background: "var(--border)" }} />
        <div style={{ padding: "20px 24px" }}>
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 500,
              fontSize: 9,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {role}
          </span>
        </div>
      </div>
    </aside>
  );
}

export function WTopBar({ title, search = "Search", right = <WAvatar letter="W" />, onHamburger }) {
  return (
    <div
      style={{
        height: 68,
        padding: "0 36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border)",
        background: "var(--cream)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <button className="ws-hamburger" aria-label="Menu" onClick={onHamburger}>
          ☰
        </button>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 600,
            fontSize: 16,
            color: "var(--charcoal)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: 220,
            borderBottom: "1px solid var(--border)",
            paddingBottom: 6,
          }}
        >
          <span style={{ fontSize: 13, color: "var(--muted)" }}>⌕</span>
          <input
            placeholder={search}
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--charcoal)",
            }}
          />
        </div>
        {right}
      </div>
    </div>
  );
}

export default function WebShell({
  nav,
  active,
  role,
  accent,
  title,
  search,
  topRight,
  children,
  onNav,
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="ws-root">
      <div className={`ws-backdrop${open ? " open" : ""}`} onClick={close} />
      <WSidebar
        nav={nav}
        active={active}
        role={role}
        accent={accent}
        open={open}
        onNav={(item) => {
          close();
          onNav?.(item);
        }}
      />
      <div className="ws-main">
        <WTopBar
          title={title}
          search={search}
          right={topRight}
          onHamburger={() => setOpen((v) => !v)}
        />
        <div className="ws-content">{children}</div>
      </div>
    </div>
  );
}
