"use client";
import React, { useEffect, useState } from "react";
import GymShell from "../../web/GymShell";
import { Label, Hairline, PrimaryButton } from "../Primitives";
import { getSessions, getPlans, createSession } from "../../api/gymUser";

function MonthGrid({ year, month, sessions }) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayMatch =
    today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;
  const scheduledDays = new Set(
    sessions
      .map((s) => new Date(s.scheduled_date))
      .filter((d) => d.getFullYear() === year && d.getMonth() === month)
      .map((d) => d.getDate())
  );

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 10 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <Label>{d}</Label>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const isToday = d === todayMatch;
          const hasSession = scheduledDays.has(d);
          return (
            <div
              key={i}
              style={{
                aspectRatio: "1 / 1",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                background: isToday ? "var(--charcoal)" : "transparent",
                color: isToday ? "var(--cream)" : "var(--charcoal)",
                fontFamily: "var(--font-sans)",
                fontSize: 13,
              }}
            >
              <span>{d}</span>
              {hasSession && (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: isToday ? "var(--cream)" : "var(--coral)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function NewSessionForm({ plans, busy, err, onSubmit, onCancel }) {
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("07:00");
  const [planId, setPlanId] = useState(plans[0]?.plan_id ?? "");
  const [reminder, setReminder] = useState(true);

  const inputStyle = {
    height: 36,
    border: "1px solid var(--border)",
    background: "var(--white)",
    padding: "0 10px",
    fontFamily: "var(--font-sans)",
    fontSize: 13,
    color: "var(--charcoal)",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
      <Label>Plan</Label>
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        style={inputStyle}
      >
        {plans.length === 0 && <option value="">No plans yet — create one first</option>}
        {plans.map((p) => (
          <option key={p.plan_id} value={p.plan_id}>
            {p.goal}
          </option>
        ))}
      </select>

      <Label>Date</Label>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={inputStyle}
      />

      <Label>Time</Label>
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        style={inputStyle}
      />

      <label style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--muted)" }}>
        <input
          type="checkbox"
          checked={reminder}
          onChange={(e) => setReminder(e.target.checked)}
        />
        Set a reminder notification
      </label>

      {err && <div style={{ fontSize: 12, color: "var(--coral)" }}>{err}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <PrimaryButton variant="outline" onClick={onCancel}>
          Cancel
        </PrimaryButton>
        <PrimaryButton
          onClick={
            busy || !planId
              ? undefined
              : () =>
                  onSubmit({
                    plan_id: planId,
                    scheduled_date: date,
                    scheduled_time: `${time}:00`,
                    reminder_set: reminder,
                  })
          }
        >
          {busy ? "Saving…" : "Save session"}
        </PrimaryButton>
      </div>
    </div>
  );
}

export default function CalendarScreen() {
  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [cursor] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const refreshSessions = () =>
    getSessions()
      .then((r) => setSessions(Array.isArray(r) ? r : []))
      .catch(() => {});

  useEffect(() => {
    Promise.all([
      refreshSessions(),
      getPlans()
        .then((r) => setPlans(Array.isArray(r) ? r : []))
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const save = async (body) => {
    setErr("");
    setSaving(true);
    try {
      await createSession(body);
      await refreshSessions();
      setAdding(false);
    } catch (e) {
      // UC9 alternative flow: time-slot conflict
      setErr(e?.detail || "Failed to save session.");
    } finally {
      setSaving(false);
    }
  };

  const upcoming = [...sessions]
    .filter((s) => new Date(`${s.scheduled_date}T${s.scheduled_time}`) >= new Date())
    .sort(
      (a, b) =>
        new Date(`${a.scheduled_date}T${a.scheduled_time}`) -
        new Date(`${b.scheduled_date}T${b.scheduled_time}`)
    )
    .slice(0, 5);

  return (
    <GymShell active="Schedule" title="Schedule" search="Search sessions">
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Loading…
        </div>
      ) : (
        <div style={{ padding: "30px 36px", maxWidth: 1100 }}>
          <div className="og-cols">
            {/* Left: month grid */}
            <div style={{ maxWidth: 520 }}>
              <Label>{`${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}</Label>
              <div style={{ marginTop: 18 }}>
                <MonthGrid
                  year={cursor.getFullYear()}
                  month={cursor.getMonth()}
                  sessions={sessions}
                />
              </div>
            </div>

            {/* Right: up next + new session */}
            <div>
              <Label>Up next</Label>
              <div style={{ marginTop: 12 }}>
                <Hairline />
                {upcoming.length === 0 && (
                  <div style={{ padding: "16px 0", fontSize: 12, color: "var(--muted)" }}>
                    No sessions scheduled yet.
                  </div>
                )}
                {upcoming.map((s) => (
                  <div
                    key={s.session_id}
                    style={{
                      padding: "14px 0",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--charcoal)" }}>
                      {s.scheduled_date.slice(5)}
                    </span>
                    <Label>{s.scheduled_time}</Label>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 24, maxWidth: 320 }}>
                {!adding && (
                  <PrimaryButton variant="outline" onClick={() => setAdding(true)}>
                    + New session
                  </PrimaryButton>
                )}
                {adding && (
                  <NewSessionForm
                    plans={plans}
                    busy={saving}
                    err={err}
                    onSubmit={save}
                    onCancel={() => {
                      setAdding(false);
                      setErr("");
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </GymShell>
  );
}
