import React from "react";
import { PrimaryButton } from "../Primitives";

export default function MilestoneScreen({ onShare }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--coral)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 30px",
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "4px",
            color: "var(--charcoal)",
            textTransform: "uppercase",
          }}
        >
          MILESTONE
        </span>
        <div
          style={{
            margin: "34px 0",
            fontFamily: "var(--font-numeral)",
            fontWeight: 700,
            fontSize: 150,
            lineHeight: 0.9,
            letterSpacing: "-4px",
            color: "var(--charcoal)",
          }}
        >
          100
        </div>
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "1px",
            color: "var(--cream)",
          }}
        >
          DAYS. YOU DID IT.
        </span>
        <span
          style={{
            marginTop: 14,
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--charcoal)",
            opacity: 0.55,
          }}
        >
          a streak built one move at a time.
        </span>
      </div>
      <div style={{ padding: "0 30px 30px" }}>
        <PrimaryButton variant="dark" onClick={onShare}>
          Share the win
        </PrimaryButton>
      </div>
    </div>
  );
}
