"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar, type NavItem } from "./Sidebar";
import { ShellContext } from "./ShellContext";

/**
 * Responsive app chrome. Owns the mobile sidebar open/close state and exposes it
 * (via ShellContext) so each page's TopBar can render a hamburger that opens it.
 * Desktop (lg+) shows the sidebar inline; below that it slides in as an overlay.
 */
export function AppShell({
  items,
  role,
  accent = "coral",
  children,
}: {
  items: NavItem[];
  role: string;
  accent?: "coral" | "charcoal";
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (nav tap on mobile).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll + allow Escape to close while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <ShellContext.Provider
      value={{
        mobileOpen,
        openSidebar: () => setMobileOpen(true),
        closeSidebar: () => setMobileOpen(false),
      }}
    >
      <div className="flex min-h-screen bg-cream font-sans">
        <Sidebar
          items={items}
          role={role}
          accent={accent}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ShellContext.Provider>
  );
}
