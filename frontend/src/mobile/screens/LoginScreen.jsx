"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Label, Field, PrimaryButton } from "../Primitives";
import { useAuth } from "../../auth/useAuth";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      const user = await login(email, pw);
      if (user.role === "gym_user") router.push("/dashboard");
      else if (user.role === "wellness_specialist") router.push("/specialist/clients");
      else router.push("/admin/dashboard");
    } catch (e) {
      setErr(e.detail || "Invalid email or password");
    } finally {
      setBusy(false);
    }
  };

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

      {err && (
        <div style={{ marginTop: 16, color: "var(--coral)", fontSize: 12 }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: "auto" }}>
        <PrimaryButton onClick={busy ? undefined : submit}>
          {busy ? "Signing in…" : "Sign in  →"}
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
          <span
            style={{ color: "var(--charcoal)", cursor: "pointer" }}
            onClick={() => router.push("/register")}
          >
            Join us
          </span>
        </div>
      </div>
    </div>
  );
}
