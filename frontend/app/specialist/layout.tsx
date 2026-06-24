import { Sidebar, type NavItem } from "@/components/shell/Sidebar";
import { AuthGate } from "@/components/shell/AuthGate";

const SPECIALIST_NAV: NavItem[] = [
  { label: "Clients", href: "/specialist/clients" },
  { label: "Plans", href: "/specialist/plans" },
  { label: "Content", href: "/specialist/content" },
  { label: "Announce", href: "/specialist/announce" },
  { label: "Notifications", href: "/specialist/notifications" },
  { label: "Reports", href: "/specialist/reports" },
];

export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="wellness_specialist">
      <div className="flex min-h-screen bg-cream font-sans">
        <Sidebar items={SPECIALIST_NAV} role="Wellness Specialist" accent="coral" />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AuthGate>
  );
}
