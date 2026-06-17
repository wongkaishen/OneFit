"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GymShell from "../../web/GymShell";
import { Label, Field, Hairline, PrimaryButton } from "../Primitives";
import { getProfile, updateProfile } from "../../api/gymUser";
import { me } from "../../api/auth";
import { useAuth } from "../../auth/useAuth";

function ProfileMenu({ user, onSignOut, onViewNotifications }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = (label, onClick, opts = {}) => (
    <button
      type="button"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      style={{
        appearance: "none",
        background: "transparent",
        border: 0,
        width: "100%",
        textAlign: "left",
        padding: "10px 14px",
        fontFamily: "var(--font-sans)",
        fontSize: 13,
        color: opts.danger ? "var(--coral)" : "var(--charcoal)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", marginLeft: "auto" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Account menu"
        style={{
          appearance: "none",
          background: "transparent",
          border: "1px solid var(--charcoal)",
          borderRadius: 999,
          padding: "6px 12px",
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          letterSpacing: "0.5px",
          color: "var(--charcoal)",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Account
        <span style={{ fontSize: 9, transform: open ? "rotate(180deg)" : "none", transition: "transform 120ms" }}>
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 200,
            background: "var(--paper, #fff)",
            border: "1px solid var(--charcoal)",
            borderRadius: 10,
            padding: "6px 0",
            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
            zIndex: 30,
          }}
        >
          <div style={{ padding: "8px 14px 10px" }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--charcoal)" }}>
              {user?.name || "—"}
            </div>
            <div style={{ marginTop: 2, fontSize: 11, color: "var(--muted)" }}>
              {user?.role?.replace("_", " ") || ""}
              {user?.status ? ` · ${user.status}` : ""}
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "2px 0" }} />
          {item("View notifications", onViewNotifications)}
          {item("Sign out", onSignOut, { danger: true })}
        </div>
      )}
    </div>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
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
            <ProfileMenu
              user={user}
              onViewNotifications={() => router.push("/notifications")}
              onSignOut={() => {
                logout();
                router.replace("/login");
              }}
            />
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
