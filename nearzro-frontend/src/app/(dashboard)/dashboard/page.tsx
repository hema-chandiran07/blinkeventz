"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    // Redirect based on user role
    switch (user?.role) {
      case "ADMIN":
        router.push("/dashboard/admin");
        break;
      case "VENDOR":
        router.push("/dashboard/vendor");
        break;
      case "VENUE_OWNER":
        router.push("/dashboard/venue");
        break;
      case "CUSTOMER":
        router.push("/dashboard/customer");
        break;
      default:
        router.push("/login");
    }
  }, [isInitialized, user, isAuthenticated, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardSkeleton />
    </div>
  );
}
