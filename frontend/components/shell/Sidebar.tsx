"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";

export interface NavItem {
  label: string;
  href: string;
}

/** Map a nav label to an icon without forcing every layout to specify one. */
function iconFor(label: string): IconName {
  const k = label.toLowerCase();
  if (k.includes("dashboard")) return "dashboard";
  if (k.includes("meal")) return "meals";
  if (k.includes("plan")) return "plans";
  if (k.includes("activity")) return "activity";
  if (k.includes("diet")) return "diet";
  if (k.includes("progress")) return "progress";
  if (k.includes("feedback")) return "feedback";
  if (k.includes("calendar")) return "calendar";
  if (k.includes("community") || k.includes("group")) return "community";
  if (k.includes("member")) return "users";
  if (k.includes("message")) return "messages";
  if (k.includes("notification")) return "bell";
  if (k.includes("profile")) return "profile";
  if (k.includes("client")) return "clients";
  if (k.includes("task")) return "tasks";
  if (k.includes("content") || k.includes("education")) return "content";
  if (k.includes("announce")) return "announce";
  if (k.includes("report")) return "reports";
  if (k.includes("user")) return "users";
  if (k.includes("approval") || k.includes("registration")) return "approvals";
  if (k.includes("program")) return "programs";
  if (k.includes("security")) return "security";
  return "dashboard";
}

/**
 * Primary navigation. Inline rail on desktop (lg+); off-canvas drawer with a
 * dimmed backdrop below that. Active item is a solid charcoal block with a coral
 * marker — bold and unmistakable while keeping the sharp editorial corners.
 */
export function Sidebar({
  items,
  role,
  accent = "coral",
  mobileOpen = false,
  onClose,
}: {
  items: NavItem[];
  role: string;
  accent?: "coral" | "charcoal";
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-charcoal/40 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-none flex-col border-r border-border bg-cream transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[248px] lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 shadow-pop" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 pb-5 pt-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 flex-none items-center justify-center bg-warm-red">
              <span className="h-2 w-2 bg-cream" />
            </span>
            <span className="font-serif text-[20px] leading-none text-charcoal">onefit</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-1 flex h-9 w-9 items-center justify-center text-muted hover:text-charcoal lg:hidden"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="px-5">
          <div className="of-eyebrow mb-2 px-1">Menu</div>
          <div className="h-px bg-border" />
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-[3px] overflow-y-auto px-3 py-3">
          {items.map((it) => {
            const active = pathname === it.href || pathname.startsWith(it.href + "/");
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 px-3 py-[10px] text-[13px] transition-colors ${
                  active
                    ? "bg-charcoal font-semibold text-cream"
                    : "text-subtle hover:bg-cream-deep hover:text-charcoal"
                }`}
              >
                {active && <span className="absolute left-0 top-0 h-full w-[3px] bg-coral" />}
                <Icon
                  name={iconFor(it.label)}
                  size={17}
                  className={active ? "text-coral" : "text-muted group-hover:text-charcoal"}
                />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Role footer */}
        <div className="mt-auto border-t border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: accent === "coral" ? "var(--coral)" : "var(--charcoal)" }}
            />
            <span className="of-eyebrow">{role}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
