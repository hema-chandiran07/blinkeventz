"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get("token");
      const userParam = searchParams.get("user");

      if (!token || !userParam) {
        setStatus("error");
        setMessage("Authentication failed. Please try again.");
        setTimeout(() => router.push("/login"), 3000);
        return;
      }

      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        
        // Store auth data
        localStorage.setItem("NearZro_user", JSON.stringify({
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          token,
          avatar: user.picture,
        }));

        setStatus("success");
        setMessage("Successfully logged in! Redirecting...");

        // Redirect based on role
        const redirectPaths: Record<string, string> = {
          "ADMIN": "/dashboard/admin",
          "VENDOR": "/dashboard/vendor",
          "VENUE_OWNER": "/dashboard/venue",
          "CUSTOMER": "/dashboard/customer",
        };

        setTimeout(() => {
          window.location.href = redirectPaths[user.role] || "/";
        }, 1500);

      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setMessage("Authentication failed. Please try again.");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-silver-50 via-white to-silver-100">
      <Card className="w-full max-w-md shadow-2xl">
        <CardContent className="flex flex-col items-center justify-center py-12">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-neutral-800 animate-spin mb-4" />
              <h2 className="text-xl font-semibold text-black mb-2">Completing Login...</h2>
              <p className="text-neutral-600 text-center">Please wait while we set up your account</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold text-black mb-2">Welcome to NearZro!</h2>
              <p className="text-neutral-600 text-center">{message}</p>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-black mb-2">Login Failed</h2>
              <p className="text-neutral-600 text-center">{message}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
