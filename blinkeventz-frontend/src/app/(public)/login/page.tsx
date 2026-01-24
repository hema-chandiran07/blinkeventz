"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useAuth, UserRole } from "@/context/auth-context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
        // Just a simple check for demo
        alert("Please enter an email address");
        return;
    }
    login(email, role);
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-purple-50/50">
      <Card className="w-full max-w-md border-purple-100 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>
            Enter your email to sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                        id="email" 
                        placeholder="name@example.com" 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="#" className="text-sm font-medium text-purple-600 hover:text-purple-500">
                        Forgot password?
                    </Link>
                    </div>
                    <Input 
                        id="password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Any password works for demo"
                    />
                </div>

                {/* Role Selector for Demo */}
                <div className="space-y-2">
                    <Label htmlFor="role">Login As (Demo Feature)</Label>
                    <select 
                        id="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                    >
                        <option value="CUSTOMER">Customer</option>
                        <option value="VENDOR">Vendor</option>
                        <option value="VENUE_OWNER">Venue Owner</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                </div>

                <Button type="submit" className="w-full">Sign In</Button>
            </form>
          
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <Button variant="outline" className="w-full" type="button">
               Google
            </Button>
            <Button variant="outline" className="w-full" type="button">
               Facebook
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2 text-center text-sm text-gray-500">
            <div>
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-semibold text-purple-600 hover:text-purple-500">
                    Sign up
                </Link>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
