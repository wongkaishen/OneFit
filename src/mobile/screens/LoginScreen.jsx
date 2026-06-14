import React, { useState } from "react";
import { BrandMark, Label, Field, PrimaryButton } from "../Primitives";

export default function LoginScreen({ onSignIn }) {
  const [email, setEmail] = useState("alex@onefit.com");
  const [pw, setPw] = useState("");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "0 30px 30px",
      }}
    >
      <div style={{ paddingTop: 57 }}>
        <BrandMark />
        <div style={{ marginTop: 14 }}>
          <Label style={{ letterSpacing: "2px" }}>daily · movement</Label>
        </div>
      </div>

      <h1
        style={{
          margin: "76px 0 0",
          fontFamily: "var(--font-greeting)",
          fontWeight: 400,
          fontSize: 22,
          letterSpacing: "-0.5px",
          color: "var(--charcoal)",
          lineHeight: 1.15,
        }}
      >
        Welcome back.
      </h1>

      <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 22 }}>
        <Field label="EMAIL" value={email} onChange={setEmail} />
        <Field
          label="PASSWORD"
          value={pw}
          onChange={setPw}
          placeholder="••••••••"
          type="password"
        />
      </div>

      <div style={{ marginTop: "auto" }}>
        <PrimaryButton onClick={onSignIn}>
          Sign in&nbsp;&nbsp;→
        </PrimaryButton>
        <div
          style={{
            marginTop: 22,
            textAlign: "center",
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--muted)",
          }}
        >
          New here?{" "}
          <span style={{ color: "var(--charcoal)", cursor: "pointer" }}>Join us</span>
        </div>
      </div>
    </div>
  );
}
