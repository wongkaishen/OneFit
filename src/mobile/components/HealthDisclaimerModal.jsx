"use client";
import React from "react";
import { PrimaryButton, Label } from "../Primitives";

export default function HealthDisclaimerModal({ onAgree, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        zIndex: 60,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--cream)",
          border: "1px solid var(--border)",
          padding: "26px 24px 24px",
        }}
      >
        <Label>Before you start</Label>
        <div
          style={{
            marginTop: 12,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--charcoal)",
            lineHeight: 1.5,
          }}
        >
          OneFit's AI-generated plans are guidance, not medical advice. Consult a certified
          medical professional before starting any new training or diet plan.
        </div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          <PrimaryButton onClick={onAgree}>I understand</PrimaryButton>
          <button
            onClick={onCancel}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              color: "var(--muted)",
              cursor: "pointer",
              padding: 8,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
