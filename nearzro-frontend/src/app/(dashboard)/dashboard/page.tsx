"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { DashboardSkeleton } from "@/components/ui/skeleton";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
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
  }, [user, isAuthenticated, router]);

  return (
    <div className="space-y-6">
      <DashboardSkeleton />
    </div>
  );
}
