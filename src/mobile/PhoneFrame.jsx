import React from "react";

const outer = {
  width: 390,
  height: 844,
  borderRadius: 38,
  border: "4px solid var(--charcoal-deep)",
  background: "var(--charcoal-deep)",
  position: "relative",
  overflow: "hidden",
  flex: "0 0 auto",
};
const screen = (bg) => ({
  position: "absolute",
  inset: 0,
  borderRadius: 34,
  overflow: "hidden",
  background: bg,
});
const notch = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  top: 0,
  width: 120,
  height: 28,
  borderRadius: "0 0 14px 14px",
  background: "var(--charcoal-deep)",
  zIndex: 30,
};
const content = { position: "absolute", inset: 0, paddingTop: 38 };
const statusBar = {
  position: "absolute",
  top: 14,
  left: 0,
  right: 0,
  height: 16,
  display: "flex",
  justifyContent: "space-between",
  padding: "0 30px",
  zIndex: 31,
  pointerEvents: "none",
};
const statusText = (color) => ({
  fontFamily: "var(--font-sans)",
  fontWeight: 700,
  fontSize: 11,
  color,
});

export default function PhoneFrame({ children, bg = "var(--cream)", statusInk = "var(--charcoal)" }) {
  return (
    <div style={outer}>
      <div style={screen(bg)}>
        <div style={notch} />
        <div style={statusBar}>
          <span style={statusText(statusInk)}>9:41</span>
          <span style={statusText(statusInk)}>5G</span>
        </div>
        <div style={content}>{children}</div>
      </div>
    </div>
  );
}
