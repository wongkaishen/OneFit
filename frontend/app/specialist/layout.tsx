import { Sidebar, type NavItem } from "@/components/shell/Sidebar";

const SPECIALIST_NAV: NavItem[] = [
  { label: "Clients", href: "/specialist/clients" },
  { label: "Plans", href: "/specialist/plans/new" },
  { label: "Content", href: "/specialist/content" },
  { label: "Reports", href: "/specialist/reports" },
];

export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream font-sans">
      <Sidebar items={SPECIALIST_NAV} role="Wellness Specialist" accent="coral" />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
