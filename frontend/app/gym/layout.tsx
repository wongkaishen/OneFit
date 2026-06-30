import type { NavItem } from "@/components/shell/Sidebar";
import { AuthGate } from "@/components/shell/AuthGate";
import { AppShell } from "@/components/shell/AppShell";

const GYM_NAV: NavItem[] = [
  { label: "Dashboard", href: "/gym/dashboard" },
  { label: "Plans", href: "/gym/plans" },
  { label: "Activity", href: "/gym/activity" },
  { label: "Diet", href: "/gym/diet" },
  { label: "Progress", href: "/gym/progress" },
  { label: "Meal Plans", href: "/gym/meal-plans" },
  { label: "Feedback", href: "/gym/feedback" },
  { label: "Calendar", href: "/gym/calendar" },
  { label: "Education", href: "/gym/education" },
  { label: "Community", href: "/gym/community" },
  { label: "Groups", href: "/gym/groups" },
  { label: "Members", href: "/gym/members" },
  { label: "Messages", href: "/gym/messages" },
  { label: "Notifications", href: "/gym/notifications" },
  { label: "Profile", href: "/gym/profile" },
];

export default function GymLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="gym_user">
      <AppShell items={GYM_NAV} role="Gym User" accent="coral">
        {children}
      </AppShell>
    </AuthGate>
  );
}
