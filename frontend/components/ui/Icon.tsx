/**
 * Compact monoline icon set (24×24, currentColor stroke) used by the sidebar nav
 * and around the app. Unknown names fall back to a small dot so nothing breaks.
 */
export type IconName =
  | "dashboard" | "plans" | "activity" | "diet" | "progress" | "meals"
  | "feedback" | "calendar" | "community" | "messages" | "bell" | "profile"
  | "clients" | "tasks" | "content" | "announce" | "reports" | "users"
  | "approvals" | "programs" | "security" | "search" | "menu" | "close"
  | "plus" | "logout" | "chevron";

const P: Record<string, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
  plans: <><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  activity: <path d="M3 12h4l2 6 4-14 2 8h6" />,
  diet: <><path d="M12 3c4 0 7 3 7 8a7 7 0 0 1-14 0c0-5 3-8 7-8z" /><path d="M12 7v10" /></>,
  progress: <><path d="M4 19V5M4 19h16" /><path d="M8 16l3-4 3 2 4-6" /></>,
  meals: <><path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18" /><path d="M17 3c-2 0-3 2-3 5s1 4 3 4 3-1 3-4-1-5-3-5zM17 12v9" /></>,
  feedback: <path d="M4 5h16v11H9l-5 4z" />,
  calendar: <><rect x="3" y="4" width="18" height="17" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  community: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 5a3 3 0 0 1 0 6M21 20c0-2.5-1.5-4-3.5-4.6" /></>,
  messages: <path d="M4 4h16v12H8l-4 4z" />,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  clients: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.5 3-5.5 6-5.5s6 2 6 5.5" /><path d="M17 4.5a3.5 3.5 0 0 1 0 7" /></>,
  tasks: <><path d="M4 6h16M4 12h16M4 18h16" /><path d="M3 6l1 1 1.5-2" /></>,
  content: <><rect x="4" y="3" width="16" height="18" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  announce: <><path d="M4 10v4l11 5V5L4 10z" /><path d="M15 8a4 4 0 0 1 0 8" /></>,
  reports: <><rect x="3" y="3" width="18" height="18" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  users: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 .8-3.3 2.5-3.8" /></>,
  approvals: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6 1 0 2 .1 2.8.4" /><path d="M15 18l2 2 4-4" /></>,
  programs: <><rect x="3" y="4" width="18" height="16" /><path d="M3 9h18M9 4v16" /></>,
  security: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <><path d="M9 4H5v16h4" /><path d="M16 8l4 4-4 4M9 12h11" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
};

export function Icon({
  name,
  size = 18,
  className = "",
  strokeWidth = 1.6,
}: {
  name: IconName | string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const path = P[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {path ?? <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
