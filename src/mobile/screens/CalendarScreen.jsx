"use client";
import React, { useEffect, useState } from "react";
import GymShell from "../../web/GymShell";
import { Label, Hairline, PrimaryButton } from "../Primitives";
import { getSessions } from "../../api/gymUser";

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

export default function CalendarScreen() {
  const [sessions, setSessions] = useState([]);
  const [cursor] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions()
      .then((r) => setSessions(Array.isArray(r) ? r : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
              <div style={{ marginTop: 24, maxWidth: 280 }}>
                <PrimaryButton
                  variant="outline"
                  onClick={() => alert("New-session UI is a follow-up.")}
                >
                  + New session
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </GymShell>
  );
}
