"use client";
import { useEffect, useState } from "react";
import { isDemoMode, setDemoMode, setToken } from "../api/client";

export default function DemoBadge() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isDemoMode());
    const onStorage = () => setOn(isDemoMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!on) return null;

  const exit = () => {
    setDemoMode(false);
    setToken(null);
    window.location.href = "/login?demo=0";
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: "var(--charcoal)",
        color: "var(--cream)",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        zIndex: 100,
      }}
    >
      <span>Demo mode</span>
      <button
        onClick={exit}
        title="Exit demo"
        style={{
          background: "transparent",
          border: "1px solid var(--cream)",
          color: "var(--cream)",
          fontFamily: "var(--font-sans)",
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "1.5px",
          padding: "3px 8px",
          cursor: "pointer",
        }}
      >
        Exit
      </button>
    </div>
  );
}
