"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import { usePathname } from "next/navigation";

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
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googleLogin: (options?: { role?: UserRole; callbackUrl?: string }) => void;
  facebookLogin: () => void;
  setUserFromOAuth: (authUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Refresh user data from backend (gets fresh role from DB)
  const refreshUser = useCallback(async () => {
    const storedUser = localStorage.getItem("NearZro_user");
    if (!storedUser) return;

    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.token) {
        const response = await api.get('/auth/me');
        if (response.data) {
          const updatedUser = {
            id: String(response.data.id || parsed.id),
            name: response.data.name || parsed.name,
            email: response.data.email || parsed.email,
            role: response.data.role || parsed.role,
            token: parsed.token,
          };
          setUser(updatedUser);
          // Update localStorage with fresh data
          localStorage.setItem("NearZro_user", JSON.stringify(updatedUser));
        }
      }
    } catch (error) {
      // Silently fail - user stays logged in with cached data
      console.warn("Failed to refresh user data:", error);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      if (typeof window === "undefined") {
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }

      // 1. GLOBAL OAUTH INTERCEPTOR - Check for token in URL before localStorage
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      const urlUser = params.get('user');

      if (urlToken) {
        try {
          // Save OAuth data to localStorage immediately
          localStorage.setItem('token', urlToken);
          if (urlUser) {
            const parsedUser = JSON.parse(decodeURIComponent(urlUser));
            localStorage.setItem('user', JSON.stringify(parsedUser));
            // Also save to NearZro_user for consistency with standard login flow
            const authUser = {
              id: String(parsedUser.id),
              name: parsedUser.name,
              email: parsedUser.email,
              role: parsedUser.role,
              token: urlToken,
            };
            localStorage.setItem('NearZro_user', JSON.stringify(authUser));
            // Update context state immediately
            setUser({
              id: String(parsedUser.id),
              name: parsedUser.name,
              email: parsedUser.email,
              role: parsedUser.role as UserRole,
              token: urlToken,
            });
          }
          // Delete only the sensitive tokens, keep routing parameters like ?step=2
          params.delete('token');
          params.delete('user');
          const remainingParams = params.toString();
          const cleanUrl = window.location.pathname + (remainingParams ? `?${remainingParams}` : '');
          window.history.replaceState(null, '', cleanUrl);
        } catch (error) {
          console.error("Global OAuth interception failed:", error);
        }
      }

      // 2. STANDARD SESSION RESTORE (Existing Logic)
      // The existing logic will now smoothly pick up the token we just saved above!
      const storedUser = localStorage.getItem("NearZro_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.token) {
            // Verify token is still valid and get fresh role from DB
            try {
              const response = await api.get('/auth/me');
              setUser({
                id: String(response.data.id || parsed.id),
                name: response.data.name || parsed.name,
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
                localStorage.removeItem('NearZro_user');
              }
              // For network errors, keep the token - user stays logged in
              // The API interceptor will handle 401s on actual API calls
            }
          }
        } catch {
          localStorage.removeItem('NearZro_user');
        }
      }
      setIsInitialized(true);
      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Refresh user data on navigation to catch role changes
  // ADVANCED LOGIC: Only refresh once per session, NOT during auth flows
  const pathname = usePathname();
  const hasRefreshed = React.useRef(false);
  const lastRefreshTime = React.useRef<number>(0);
  const REFRESH_COOLDOWN = 5 * 60 * 1000; // 5 minutes between refreshes
  
  useEffect(() => {
    // Skip refresh if:
    // 1. No user logged in
    // 2. Already refreshed this session
    // 3. On auth-related pages (login, register, etc.)
    // 4. Too soon since last refresh (cooldown period)
    const isAuthPage = pathname?.includes('/login') || 
                       pathname?.includes('/register') || 
                       pathname?.includes('/auth') ||
                       pathname?.includes('/forgot-password') ||
                       pathname?.includes('/reset-password');
    
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime.current;
    const shouldSkipRefresh = !user || 
                               hasRefreshed.current || 
                               isAuthPage || 
                               timeSinceLastRefresh < REFRESH_COOLDOWN;
    
    if (shouldSkipRefresh) {
      return;
    }
    
    // Mark as refreshed and update timestamp
    hasRefreshed.current = true;
    lastRefreshTime.current = now;
    
    // Refresh user data silently (don't block navigation)
    refreshUser().catch(() => {
      // Silently fail - user stays logged in with cached data
      // Don't redirect or show error during navigation
    });
  }, [pathname, user, refreshUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      if (!process.env.NEXT_PUBLIC_API_URL) {
        throw new Error("API configuration missing. Please contact support.");
      }

      const response = await api.post('/auth/login', { email, password });
      const { user: userData, token } = response.data;

      const authenticatedUser: User = {
        id: String(userData.id),
        name: userData.name,
        email: userData.email,
        role: userData.role as UserRole,
        token,
      };

      setUser(authenticatedUser);
      localStorage.setItem("NearZro_user", JSON.stringify(authenticatedUser));

      // Smart redirect based on what profiles user has
      // If user has BOTH profiles, use their stored role
      // If user has only vendor profile → vendor dashboard
      // If user has only venue profile → venue dashboard
      const hasVendor = userData.hasVendorProfile || userData.role === 'VENDOR';
      const hasVenue = userData.hasVenueProfile || userData.role === 'VENUE_OWNER';
      
      let redirectPath = '/dashboard/customer'; // default
      
      if (userData.role === 'ADMIN') {
        redirectPath = '/dashboard/admin';
      } else if (hasVenue && !hasVendor) {
        // Only venue owner
        redirectPath = '/dashboard/venue';
      } else if (hasVendor && !hasVenue) {
        // Only vendor
        redirectPath = '/dashboard/vendor';
      } else if (hasVendor && hasVenue) {
        // Has both - use stored role
        const redirectPaths: Record<string, string> = {
          "ADMIN": "/dashboard/admin",
          "VENDOR": "/dashboard/vendor",
          "VENUE_OWNER": "/dashboard/venue",
          "CUSTOMER": "/",
        };
        redirectPath = redirectPaths[userData.role] || '/';
      }

      // Use window.location for immediate redirect
      window.location.href = redirectPath;

    } catch (error: unknown) {
      console.error("Login failed:", error);

      let errorMessage = "Invalid email or password";

      // Handle network errors
      if ((error as { code?: string })?.code === 'ERR_NETWORK' ||
          (error as { code?: string })?.code === 'ECONNREFUSED') {
        errorMessage = "Unable to connect to server. Please check your connection.";
      } else if ((error as { code?: string })?.code === 'ECONNABORTED') {
        errorMessage = "Request timed out. Please try again.";
      } else if ((error as { response?: { status?: number } })?.response?.status === 400) {
        // Handle bad request with specific message from backend
        const data = (error as { response?: { data?: { message?: string } } })?.response?.data;
        errorMessage = (data as { message?: string })?.message || "Invalid email or password";
      } else if ((error as { response?: { status?: number } })?.response?.status === 500) {
        errorMessage = "Server error. Please try again later.";
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
      localStorage.setItem("NearZro_user", JSON.stringify(authenticatedUser));

      // Immediate redirect
      const redirectPaths: Record<string, string> = {
        "ADMIN": "/dashboard/admin",
        "VENDOR": "/dashboard/vendor",
        "VENUE_OWNER": "/dashboard/venue",
        "CUSTOMER": "/",
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

  const googleLogin = useCallback((options?: { role?: UserRole; callbackUrl?: string }) => {
    // Google OAuth - redirect to backend
    // Use window.location for direct backend access (bypasses frontend proxy)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    // Build state parameter with role and callback URL
    // This will be passed to Google and returned in the callback
    const stateData: { intendedRole?: string; callbackUrl?: string } = {};
    
    if (options?.role) {
      stateData.intendedRole = options.role;
    }
    if (options?.callbackUrl) {
      stateData.callbackUrl = options.callbackUrl;
    }
    
    // Base64 encode the state data
    const state = btoa(JSON.stringify(stateData));
    
    // Redirect to Google OAuth with state parameter
    window.location.href = `${apiUrl}/api/auth/google?state=${encodeURIComponent(state)}`;
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/facebook`;
  }, []);

  const setUserFromOAuth = useCallback((authUser: User) => {
    setUser(authUser);
    localStorage.setItem("NearZro_user", JSON.stringify(authUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("NearZro_user");
    window.location.href = "/login";
  }, []);

  // Show loading during initialization
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="relative z-10 text-center px-4">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px'
            }} />
          </div>

          {/* Main Content */}
          <div className="relative">
            {/* Brand Name - NEARZRO */}
            <div className="mb-2">
              <h1 className="text-6xl font-black tracking-[0.3em] text-white">
                NEAR<span className="bg-gradient-to-r from-neutral-400 to-neutral-600 bg-clip-text text-transparent">ZRO</span>
              </h1>
            </div>

            {/* Divider Line */}
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-neutral-500 to-transparent mx-auto mb-4" />

            {/* Tagline */}
            <p className="text-neutral-500 text-sm tracking-[0.4em] uppercase font-light mb-12">
              Enterprise Event Management
            </p>

            {/* Loading Bar */}
            <div className="relative w-64 h-0.5 bg-neutral-800 rounded-full mx-auto mb-4 overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-neutral-600 via-neutral-400 to-neutral-600 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>

            {/* Status Text */}
            <p className="text-neutral-600 text-xs tracking-[0.2em] uppercase font-medium">
              Initializing Platform
            </p>
          </div>
        </div>

        {/* Custom Animations */}
        <style jsx>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isInitialized,
      login,
      register,
      logout,
      isLoading,
      googleLogin,
      facebookLogin,
      setUserFromOAuth
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
