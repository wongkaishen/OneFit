"use client";
import { useRouter } from "next/navigation";
import AdminDashboard from "../../../web/screens/AdminDashboard";
import { RequireAuth } from "../../../auth/RequireAuth";
import { ADMIN_ROUTES } from "../../../web/navRoutes";

export default function AdminDashboardPage() {
  const router = useRouter();
  const onNav = (label: string) => {
    const path = ADMIN_ROUTES[label];
    if (path) router.push(path);
  };

  return (
    <RequireAuth role="admin">
      <AdminDashboard onNav={onNav} />
    </RequireAuth>
  );
}
