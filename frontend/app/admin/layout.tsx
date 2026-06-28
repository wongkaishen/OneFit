import { Sidebar, type NavItem } from "@/components/shell/Sidebar";
import { AuthGate } from "@/components/shell/AuthGate";

const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Registrations", href: "/admin/registrations" },
  { label: "Announcements", href: "/admin/announcements" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Programs", href: "/admin/programs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="admin">
      <div className="flex min-h-screen bg-cream font-sans">
        <Sidebar items={ADMIN_NAV} role="Administrator" accent="charcoal" />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AuthGate>
  );
}
