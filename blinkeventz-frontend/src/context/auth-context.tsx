"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Define user roles
export type UserRole = "CUSTOMER" | "VENDOR" | "VENUE_OWNER" | "ADMIN";

// Define user interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("blinkeventz_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user from local storage", error);
        localStorage.removeItem("blinkeventz_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, role: UserRole) => {
    // Simulate login - in a real app, this would verify credentials
    const mockUser: User = {
      id: "user-" + Math.random().toString(36).substr(2, 9),
      name: email.split("@")[0], // Use part of email as name for demo
      email,
      role,
    };
    
    setUser(mockUser);
    localStorage.setItem("blinkeventz_user", JSON.stringify(mockUser));
    
    // Redirect based on role
    switch (role) {
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
        router.push("/");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("blinkeventz_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
