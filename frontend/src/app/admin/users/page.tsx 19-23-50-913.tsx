"use client";
import { useRouter } from "next/navigation";
import UserManagement from "../../../web/screens/UserManagement";
import { RequireAuth } from "../../../auth/RequireAuth";
import { ADMIN_ROUTES } from "../../../web/navRoutes";

export default function AdminUsersPage() {
  const router = useRouter();
  const onNav = (label: string) => {
    const path = ADMIN_ROUTES[label];
    if (path) router.push(path);
  };

  return (
    <RequireAuth role="admin">
      <UserManagement onNav={onNav} />
    </RequireAuth>
  );
}
