"use client";
import React, { useEffect, useState } from "react";
import { ScreenHeader, Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { getProfile, updateProfile } from "../../api/gymUser";
import { me } from "../../api/auth";

export default function ProfileScreen({ onBack }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    height: "",
    weight: "",
    body_fat_percent: "",
    fitness_goal: "",
    age: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    me().then(setUser).catch(() => {});
    getProfile()
      .then((p) =>
        setProfile({
          height: String(p.height ?? ""),
          weight: String(p.weight ?? ""),
          body_fat_percent: String(p.body_fat_percent ?? ""),
          fitness_goal: p.fitness_goal ?? "",
          age: String(p.age ?? ""),
        })
      )
      .catch(() => {});
  }, []);

  const set = (k) => (v) => setProfile((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setMsg("");
    setBusy(true);
    try {
      await updateProfile({
        age: Number(profile.age) || undefined,
        height: Number(profile.height) || undefined,
        weight: Number(profile.weight) || undefined,
        body_fat_percent: Number(profile.body_fat_percent) || undefined,
        fitness_goal: profile.fitness_goal,
      });
      setMsg("Saved.");
    } catch (e) {
      setMsg(e.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const initial = (user?.name?.[0] ?? "A").toUpperCase();
  const bmi =
    profile.height && profile.weight
      ? (Number(profile.weight) / (Number(profile.height) / 100) ** 2).toFixed(1)
      : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ paddingTop: 12 }}>
        <ScreenHeader title="Profile" onBack={onBack} />
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ padding: "28px 30px 0", display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "1px solid var(--charcoal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-greeting)",
              fontSize: 22,
              color: "var(--charcoal)",
            }}
          >
            {initial}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-greeting)", fontSize: 20, color: "var(--charcoal)" }}>
              {user?.name || "—"}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
              {user?.email || ""}
            </div>
          </div>
        </div>

        <div style={{ padding: "30px 30px 0" }}>
          <Label>Body metrics</Label>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
            <Field label="HEIGHT (CM)" value={profile.height} onChange={set("height")} />
            <Field label="WEIGHT (KG)" value={profile.weight} onChange={set("weight")} />
            <Field
              label="BODY FAT %"
              value={profile.body_fat_percent}
              onChange={set("body_fat_percent")}
            />
            <div>
              <Label>BMI</Label>
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 14,
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--charcoal)",
                }}
              >
                {bmi}
              </div>
              <Hairline />
            </div>
          </div>
        </div>

        <div style={{ padding: "26px 30px 0" }}>
          <Label>Goals</Label>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
            <Field
              label="FITNESS GOAL"
              value={profile.fitness_goal}
              onChange={set("fitness_goal")}
            />
            <Field label="AGE" value={profile.age} onChange={set("age")} />
          </div>
        </div>

        {msg && (
          <div
            style={{
              padding: "16px 30px 0",
              color: msg === "Saved." ? "var(--muted)" : "var(--coral)",
              fontSize: 12,
            }}
          >
            {msg}
          </div>
        )}
      </div>

      <div style={{ padding: "0 30px 30px" }}>
        <PrimaryButton onClick={busy ? undefined : save}>
          {busy ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </div>
  );
}
