import type { NavItem } from "@/components/shell/Sidebar";
import { AuthGate } from "@/components/shell/AuthGate";
import { AppShell } from "@/components/shell/AppShell";

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Specialist approvals", href: "/admin/registrations" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Programs", href: "/admin/programs" },
  { label: "Community", href: "/admin/community" },
  { label: "Security", href: "/admin/security" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="admin">
      <AppShell items={ADMIN_NAV} role="Administrator" accent="charcoal">
        {children}
      </AppShell>
    </AuthGate>
  );
}
