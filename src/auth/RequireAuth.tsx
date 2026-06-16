"use client";
import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";
import type { UserRole } from "../api/types";

export function RequireAuth({ children, role }: { children: ReactNode; role?: UserRole }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (role && user.role !== role) {
      router.replace("/login");
    }
  }, [user, loading, role, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}
