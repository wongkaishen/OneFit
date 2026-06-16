"use client";
import { useRouter } from "next/navigation";
import ContentPrograms from "../../../web/screens/ContentPrograms";
import { RequireAuth } from "../../../auth/RequireAuth";
import { ADMIN_ROUTES } from "../../../web/navRoutes";

export default function AdminContentPage() {
  const router = useRouter();
  const onNav = (label: string) => {
    const path = ADMIN_ROUTES[label];
    if (path) router.push(path);
  };

  return (
    <RequireAuth role="admin">
      <ContentPrograms onNav={onNav} />
    </RequireAuth>
  );
}
