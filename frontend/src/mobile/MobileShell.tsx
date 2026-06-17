"use client";
import { ReactNode } from "react";

// Responsive wrapper for every mobile screen.
// - On phones: fills the entire viewport (with safe-area insets for the notch).
// - On tablets/desktop: content centered in a 480-px column, with a darker
//   frame around it so the app reads as a phone app you're previewing.
export default function MobileShell({
  children,
  bg = "var(--cream)",
}: {
  children: ReactNode;
  bg?: string;
}) {
  return (
    <div className="onefit-shell" style={{ "--shell-bg": bg } as React.CSSProperties}>
      <div className="onefit-shell-screen">{children}</div>
    </div>
  );
}
