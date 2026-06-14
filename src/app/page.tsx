"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/useAuth";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [user, loading, router]);
  return null;
}
