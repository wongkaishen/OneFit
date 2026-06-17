"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role === "gym_user") router.replace("/dashboard");
    else if (user.role === "wellness_specialist") router.replace("/specialist/clients");
    else if (user.role === "admin") router.replace("/admin/dashboard");
  }, [user, loading, router]);
  return null;
}
