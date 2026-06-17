// Maps sidebar nav labels -> routes for the Specialist / Admin shells.
// Labels without a built screen are intentionally omitted (onNav ignores them).

export const SPECIALIST_ROUTES: Record<string, string> = {
  Clients: "/specialist/clients",
  Plans: "/specialist/plans",
};

export const ADMIN_ROUTES: Record<string, string> = {
  Users: "/admin/users",
  Content: "/admin/content",
  Announcements: "/admin/announcements",
};
