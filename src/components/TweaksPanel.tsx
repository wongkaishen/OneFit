"use client";
import { useEffect, useState } from "react";

const ACCENTS = [
  { value: "#E85D4A", label: "Coral" },
  { value: "#B94838", label: "Warm red" },
  { value: "#D8732E", label: "Burnt" },
];

export default function TweaksPanel() {
  const [personalBeats, setPersonalBeats] = useState("EB Garamond");
  const [accent, setAccent] = useState("#E85D4A");

  useEffect(() => {
    const serif = personalBeats === "EB Garamond";
    document.documentElement.style.setProperty(
      "--font-greeting",
      serif ? "var(--font-serif)" : "var(--font-sans)"
    );
    document.documentElement.style.setProperty(
      "--font-numeral",
      serif ? "var(--font-serif)" : "var(--font-sans)"
    );
  }, [personalBeats]);

  useEffect(() => {
    document.documentElement.style.setProperty("--coral", accent);
  }, [accent]);

  return (
    <div className="tweaks">
      <h4>Typography</h4>
      <div className="row">
        <span>Personal beats</span>
        <div className="seg">
          {["Inter", "EB Garamond"].map((opt) => (
            <button
              key={opt}
              className={personalBeats === opt ? "on" : ""}
              onClick={() => setPersonalBeats(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
      <h4>Color</h4>
      <div className="row">
        <span>Accent</span>
        <div className="chips">
          {ACCENTS.map((a) => (
            <button
              key={a.value}
              title={a.label}
              className={`chip${accent === a.value ? " on" : ""}`}
              style={{ background: a.value }}
              onClick={() => setAccent(a.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
