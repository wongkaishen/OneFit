"use client";
import React, { useEffect, useState } from "react";
import GymShell from "../../web/GymShell";
import { Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { getProfile, updateProfile } from "../../api/gymUser";
import { me } from "../../api/auth";

export default function ProfileScreen() {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      me().then(setUser).catch(() => {}),
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
        .catch(() => {}),
    ]).finally(() => setLoading(false));
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
    <GymShell active="Profile" title="Profile" search="Search settings">
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Loading…
        </div>
      ) : (
        <div style={{ padding: "30px 36px", maxWidth: 1100 }}>
          {/* Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "1px solid var(--charcoal)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-greeting)",
                fontSize: 26,
                color: "var(--charcoal)",
              }}
            >
              {initial}
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-greeting)", fontSize: 24, color: "var(--charcoal)" }}>
                {user?.name || "—"}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                {user?.email || ""}
              </div>
            </div>
          </div>

          {/* Two columns: Body metrics + Goals */}
          <div className="og-cols-even" style={{ marginTop: 36 }}>
            <div>
              <Label>Body metrics</Label>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
                <Field label="HEIGHT (CM)" value={profile.height} onChange={set("height")} numeric />
                <Field label="WEIGHT (KG)" value={profile.weight} onChange={set("weight")} numeric />
                <Field
                  label="BODY FAT %"
                  value={profile.body_fat_percent}
                  onChange={set("body_fat_percent")}
                  numeric
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

            <div>
              <Label>Goals</Label>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 22 }}>
                <Field
                  label="FITNESS GOAL"
                  value={profile.fitness_goal}
                  onChange={set("fitness_goal")}
                />
                <Field label="AGE" value={profile.age} onChange={set("age")} numeric />
              </div>
            </div>
          </div>

          {msg && (
            <div
              style={{
                marginTop: 20,
                color: msg === "Saved." ? "var(--muted)" : "var(--coral)",
                fontSize: 12,
              }}
            >
              {msg}
            </div>
          )}

          <div style={{ marginTop: 28, maxWidth: 280 }}>
            <PrimaryButton onClick={busy ? undefined : save}>
              {busy ? "Saving…" : "Save changes"}
            </PrimaryButton>
          </div>
        </div>
      )}
    </GymShell>
  );
}
