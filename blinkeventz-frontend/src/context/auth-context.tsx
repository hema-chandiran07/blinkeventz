"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";

// Define user roles
export type UserRole = "CUSTOMER" | "VENDOR" | "VENUE_OWNER" | "ADMIN";

// Define user interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googleLogin: () => void;
  facebookLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === "undefined") {
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      const storedUser = localStorage.getItem("blinkeventz_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.token) {
            // Verify token is still valid
            try {
              const response = await api.get('/api/auth/me');
              setUser({
                id: String(response.data.userId || parsed.id),
                name: parsed.name,
                email: response.data.email || parsed.email,
                role: response.data.role || parsed.role,
                token: parsed.token,
              });
            } catch (error: unknown) {
              // Only clear token on actual auth errors (401/403), not network errors
              const isAuthError = (error as { response?: { status?: number } })?.response?.status === 401
                || (error as { response?: { status?: number } })?.response?.status === 403;
              
              if (isAuthError) {
                // Token actually expired or invalid
                localStorage.removeItem('blinkeventz_user');
              }
              // For network errors, keep the token - user stays logged in
              // The API interceptor will handle 401s on actual API calls
            }
          }
        } catch {
          localStorage.removeItem('blinkeventz_user');
        }
      }
      setIsInitialized(true);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error("API configuration missing. Please contact support.");
      }

      const response = await api.post('/api/auth/login', { email, password });
      const { user: userData, token } = response.data;

      const authenticatedUser: User = {
        id: String(userData.id),
        name: userData.name,
        email: userData.email,
        role: userData.role as UserRole,
        token,
      };

      setUser(authenticatedUser);
      localStorage.setItem("blinkeventz_user", JSON.stringify(authenticatedUser));

      // Immediate redirect based on role
      const redirectPaths: Record<string, string> = {
        "ADMIN": "/dashboard/admin",
        "VENDOR": "/dashboard/vendor",
        "VENUE_OWNER": "/dashboard/venue",
        "CUSTOMER": "/dashboard/customer",
      };

      const redirectPath = redirectPaths[userData.role] || "/";
      
      // Use window.location for immediate redirect
      window.location.href = redirectPath;
      
    } catch (error: unknown) {
      console.error("Login failed:", error);

      let errorMessage = "Invalid email or password";

      if ((error as { code?: string })?.code === 'ERR_NETWORK') {
        errorMessage = "Unable to connect to server. Please check your connection.";
      } else if ((error as { response?: { status?: number } })?.response?.status === 400) {
        const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
        errorMessage = (data as { message?: string })?.message || "Invalid credentials";
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error("API configuration missing. Please contact support.");
      }

      const endpoint = role === 'VENDOR' ? '/api/auth/register-vendor'
        : role === 'VENUE_OWNER' ? '/api/auth/register-venue-owner'
        : '/api/auth/register';

      const response = await api.post(endpoint, { name, email, password });
      const { user: userData, token } = response.data;

      const authenticatedUser: User = {
        id: String(userData.id),
        name: userData.name,
        email: userData.email,
        role: userData.role as UserRole,
        token,
      };

      setUser(authenticatedUser);
      localStorage.setItem("blinkeventz_user", JSON.stringify(authenticatedUser));

      // Immediate redirect
      const redirectPaths: Record<string, string> = {
        "ADMIN": "/dashboard/admin",
        "VENDOR": "/dashboard/vendor",
        "VENUE_OWNER": "/dashboard/venue",
        "CUSTOMER": "/dashboard/customer",
      };

      window.location.href = redirectPaths[userData.role] || "/";
      
    } catch (error: unknown) {
      console.error("Registration failed:", error);

      let errorMessage = "Registration failed";

      if ((error as { code?: string })?.code === 'ERR_NETWORK') {
        errorMessage = "Unable to connect to server. Please try again.";
      } else if ((error as { response?: { data?: { message?: string } } })?.response?.data?.message) {
        errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message as string;
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useCallback(() => {
    // Google OAuth IS configured - redirect directly
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google`;
  }, []);

  const facebookLogin = useCallback(() => {
    // Check if Facebook OAuth is configured
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId || appId === 'dummy' || appId === 'YOUR_FACEBOOK_APP_ID') {
      // OAuth not configured - show toast via custom event
      window.dispatchEvent(new CustomEvent('auth-notice', { 
        detail: { 
          message: 'Facebook login is not configured yet. Please use email/password.',
          type: 'info'
        } 
      }));
      return;
    }
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/facebook`;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("blinkeventz_user");
    window.location.href = "/login";
  }, []);

  // Show loading during initialization
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-silver-50 via-white to-silver-100">
        <div className="text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-800 mx-auto mb-4 animate-pulse" />
          <p className="text-neutral-600 font-medium">Loading BlinkEventz...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      isLoading,
      googleLogin,
      facebookLogin
    }}>
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
