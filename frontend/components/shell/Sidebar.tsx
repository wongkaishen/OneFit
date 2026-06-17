"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  label: string;
  href: string;
}

export function Sidebar({
  items, role, accent = "coral",
}: {
  items: NavItem[];
  role: string;
  accent?: "coral" | "charcoal";
}) {
  const pathname = usePathname();
  const accentColor = accent === "coral" ? "var(--coral)" : "var(--charcoal)";

  return (
    <aside className="flex w-60 flex-none flex-col border-r border-border bg-cream">
      <div className="flex items-center gap-[9px] px-6 pb-[22px] pt-[26px]">
        <span className="h-3 w-3 bg-warm-red" />
        <span className="font-sans text-[17px] font-medium tracking-tight text-charcoal">onefit</span>
      </div>
      <div className="mx-0 mb-[14px] h-px bg-border" />
      <nav className="flex flex-col gap-[2px]">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-center gap-3 px-6 py-[11px]"
              style={{ borderLeft: `2px solid ${active ? accentColor : "transparent"}` }}
            >
              <span
                className="h-[6px] w-[6px] flex-none"
                style={{ background: active ? accentColor : "var(--border)" }}
              />
              <span
                className="font-sans text-[13px]"
                style={{
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--charcoal)" : "var(--subtle)",
                }}
              >
                {it.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-border px-6 py-5">
        <div className="font-sans text-[9px] font-medium uppercase tracking-label text-muted">
          {role}
        </div>
      </div>
    </aside>
  );
}
