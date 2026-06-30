import type { NavItem } from "@/components/shell/Sidebar";
import { AuthGate } from "@/components/shell/AuthGate";
import { AppShell } from "@/components/shell/AppShell";

const SPECIALIST_NAV: NavItem[] = [
  { label: "Clients", href: "/specialist/clients" },
  { label: "Tasks", href: "/specialist/tasks" },
  { label: "Plans", href: "/specialist/plans" },
  { label: "Content", href: "/specialist/content" },
  { label: "Announce", href: "/specialist/announce" },
  { label: "Community", href: "/specialist/community" },
  { label: "Messages", href: "/specialist/messages" },
  { label: "Notifications", href: "/specialist/notifications" },
  { label: "Reports", href: "/specialist/reports" },
];

export default function SpecialistLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="wellness_specialist">
      <AppShell items={SPECIALIST_NAV} role="Wellness Specialist" accent="coral">
        {children}
      </AppShell>
    </AuthGate>
  );
}
