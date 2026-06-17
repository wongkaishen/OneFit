"use client";
import React from "react";

export default function CalorieRing({ value, goal, size = 96, stroke = 6 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value / goal));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--coral)"
        strokeWidth={stroke}
        strokeDasharray={`${c * pct} ${c}`}
        strokeDashoffset={c * 0.25}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .6s ease" }}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "var(--font-numeral)",
          fontWeight: 700,
          fontSize: 18,
          fill: "var(--charcoal)",
        }}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}
