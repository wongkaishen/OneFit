"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark, Label, Field, PrimaryButton } from "../Primitives";
import { register, login } from "../../api/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    dob: "",
    height: "",
    weight: "",
    gender: "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      await register({
        name: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        password: form.password,
        role: "gym_user",
      });
      await login({ email: form.email, password: form.password });
      router.push("/dashboard");
    } catch (e) {
      setErr(e.detail || "Registration failed");
      setBusy(false);
    }
  };

  const progressPct = (step / 3) * 100;
  const stepLabel = step === 1 ? "Account" : step === 2 ? "About You" : "Body Metrics";

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
      </div>

      <div style={{ marginTop: 30 }}>
        <Label>{`Step ${step} of 3 · ${stepLabel}`}</Label>
        <div
          style={{
            marginTop: 12,
            height: 2,
            background: "var(--border)",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: `${progressPct}%`,
              background: "var(--coral)",
              transition: "width .3s ease",
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 22 }}>
        {step === 1 && (
          <>
            <Field label="EMAIL" value={form.email} onChange={set("email")} />
            <Field
              label="PASSWORD"
              value={form.password}
              onChange={set("password")}
              type="password"
              placeholder="••••••••"
            />
          </>
        )}
        {step === 2 && (
          <>
            <Field label="FIRST NAME" value={form.firstName} onChange={set("firstName")} />
            <Field label="LAST NAME" value={form.lastName} onChange={set("lastName")} />
            <Field
              label="DATE OF BIRTH"
              value={form.dob}
              onChange={set("dob")}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="GENDER"
              value={form.gender}
              onChange={set("gender")}
              placeholder="e.g. female"
            />
          </>
        )}
        {step === 3 && (
          <>
            <Field label="HEIGHT (CM)" value={form.height} onChange={set("height")} numeric />
            <Field label="WEIGHT (KG)" value={form.weight} onChange={set("weight")} numeric />
          </>
        )}
      </div>

      {err && (
        <div style={{ marginTop: 16, color: "var(--coral)", fontSize: 12 }}>{err}</div>
      )}

      <div style={{ marginTop: "auto" }}>
        <PrimaryButton
          onClick={
            busy ? undefined : step < 3 ? () => setStep(step + 1) : submit
          }
        >
          {busy
            ? "Creating account…"
            : step < 3
            ? "Continue  →"
            : "Create account  →"}
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
          Already have an account?{" "}
          <span
            style={{ color: "var(--charcoal)", cursor: "pointer" }}
            onClick={() => router.push("/login")}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}
