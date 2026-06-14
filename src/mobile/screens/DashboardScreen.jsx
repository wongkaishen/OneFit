import React, { useState } from "react";
import { BrandMark, Label, Hairline, Pill } from "../Primitives";

function StatRow({ name, value, unit, pct }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "16px 0 14px",
        }}
      >
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
          {name}
        </span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 4 }}>
          <span
            style={{
              fontFamily: "var(--font-numeral)",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--charcoal)",
            }}
          >
            {value}
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--muted)" }}>
            {unit}
          </span>
        </span>
      </div>
      {pct != null ? (
        <div style={{ height: 2, background: "var(--border)", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--coral)",
              transformOrigin: "left",
              animation: "onefit-bar-fill 900ms cubic-bezier(.22,1,.36,1) 180ms both",
              "--pct": pct,
            }}
          />
        </div>
      ) : (
        <Hairline />
      )}
    </div>
  );
}

function WorkoutRow({ time, name, tag, isNext }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "16px 0 14px",
        paddingLeft: isNext ? 14 : 0,
        background: isNext ? "var(--white)" : "transparent",
        borderLeft: isNext ? "3px solid var(--coral)" : "3px solid transparent",
        marginLeft: isNext ? -16 : 0,
        marginRight: isNext ? -16 : 0,
        paddingRight: isNext ? 14 : 0,
        cursor: isNext ? "pointer" : "default",
        opacity: pressed && isNext ? 0.9 : 1,
        transform: pressed && isNext ? "scale(0.99)" : "none",
        transition: "opacity .12s ease, transform .12s ease",
      }}
    >
      <span style={{ width: 34, fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
        {time}
      </span>
      <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--charcoal)" }}>
        {name}
      </span>
      {isNext ? (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: "1.5px",
            color: "var(--coral)",
            textTransform: "uppercase",
          }}
        >
          NEXT
        </span>
      ) : (
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--muted)" }}>
          {tag}
        </span>
      )}
    </div>
  );
}

function TabBar({ active = "Home", onTab }) {
  const tabs = ["Home", "Train", "Eat", "Stats"];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "14px 36px 22px",
        borderTop: "1px solid var(--border)",
        background: "var(--cream)",
      }}
    >
      {tabs.map((t) => {
        const isActive = t === active;
        return (
          <div
            key={t}
            onClick={() => onTab?.(t)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: isActive ? "var(--coral)" : "transparent",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: isActive ? "var(--coral)" : "var(--muted)",
              }}
            >
              {t}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardScreen({ onTab }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 30px 0",
        }}
      >
        <BrandMark />
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "1px solid var(--charcoal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 12,
            color: "var(--charcoal)",
          }}
        >
          A
        </div>
      </div>

      {/* Date + streak + greeting */}
      <div style={{ padding: "26px 30px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Label>SUN · 31 MAY</Label>
          <Pill>9-Day Streak</Pill>
        </div>
        <h1
          style={{
            margin: "14px 0 0",
            fontFamily: "var(--font-greeting)",
            fontWeight: 400,
            fontSize: 22,
            letterSpacing: "-0.5px",
            color: "var(--charcoal)",
            lineHeight: 1.15,
          }}
        >
          Good morning, Alex.
        </h1>
      </div>

      {/* Stats */}
      <div style={{ padding: "30px 30px 0" }}>
        <Hairline />
        <StatRow name="Steps" value="7,342" unit="/ 10,000" pct={0.73} />
        <StatRow name="Calories" value="420" unit="kcal" />
        <StatRow name="Water" value="1.8" unit="L" />
      </div>

      {/* Today */}
      <div style={{ padding: "26px 30px 0" }}>
        <Label>Today</Label>
        <div style={{ padding: "12px 0 0" }}>
          <WorkoutRow time="07:00" name="Morning run" isNext />
          <WorkoutRow time="18:00" name="Upper body" tag="45m" />
        </div>
      </div>

      <div style={{ marginTop: "auto" }}>
        <TabBar active="Home" onTab={onTab} />
      </div>
    </div>
  );
}
