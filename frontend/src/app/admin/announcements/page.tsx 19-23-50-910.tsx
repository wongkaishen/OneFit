"use client";
import { useRouter } from "next/navigation";
import AdminAnnouncements from "../../../web/screens/AdminAnnouncements";
import { RequireAuth } from "../../../auth/RequireAuth";
import { ADMIN_ROUTES } from "../../../web/navRoutes";

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const onNav = (label: string) => {
    const path = ADMIN_ROUTES[label];
    if (path) router.push(path);
  };

  return (
    <RequireAuth role="admin">
      <AdminAnnouncements onNav={onNav} />
    </RequireAuth>
  );
}
