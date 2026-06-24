import { Sidebar, type NavItem } from "@/components/shell/Sidebar";
import { AuthGate } from "@/components/shell/AuthGate";

const GYM_NAV: NavItem[] = [
  { label: "Dashboard", href: "/gym/dashboard" },
  { label: "Plans", href: "/gym/plans" },
  { label: "Activity", href: "/gym/activity" },
  { label: "Diet", href: "/gym/diet" },
  { label: "Progress", href: "/gym/progress" },
  { label: "Meal Plans", href: "/gym/meal-plans" },
  { label: "Feedback", href: "/gym/feedback" },
  { label: "Calendar", href: "/gym/calendar" },
  { label: "Notifications", href: "/gym/notifications" },
  { label: "Profile", href: "/gym/profile" },
];

export default function GymLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate role="gym_user">
      <div className="flex min-h-screen bg-cream font-sans">
        <Sidebar items={GYM_NAV} role="Gym User" accent="coral" />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </AuthGate>
  );
}
