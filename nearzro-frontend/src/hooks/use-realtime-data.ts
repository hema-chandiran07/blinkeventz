/**
 * Real-time Data Hooks
 * 
 * Provides React hooks for consuming real-time data via WebSocket
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketService, ConnectionStatus } from '../services/websocket-service';
import api from '../lib/api';

// ==================== Types ====================

export interface DashboardStats {
  totalRevenue: number;
  totalEvents: number;
  totalBookings: number;
  totalUsers: number;
  totalVendors: number;
  totalVenues: number;
  pendingApprovals: number;
  pendingPayouts: number;
  revenueGrowth: number;
  eventsGrowth: number;
  bookingsGrowth: number;
  usersGrowth: number;
}

export interface RealtimeHookResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
}

// ==================== Dashboard Stats Hook ====================

export function useRealtimeDashboardStats(): RealtimeHookResult<DashboardStats> {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const isInitialLoad = useRef(true);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.get<DashboardStats>('/admin/dashboard/stats');
      setStats(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();

    // Subscribe to dashboard updates
    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handleDashboardUpdate = (data: Partial<DashboardStats>) => {
      setStats(prev => prev ? { ...prev, ...data } : null);
      setLastUpdated(new Date());
    };

    const unsubscribeDashboard = WebSocketService.subscribe(
      'admin:dashboard',
      handleDashboardUpdate
    );

    // Auto-refresh every 60 seconds
    const interval = setInterval(loadStats, 60000);

    return () => {
      unsubscribe();
      unsubscribeDashboard();
      clearInterval(interval);
    };
  }, [loadStats]);

  return {
    data: stats,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadStats,
  };
}

// ==================== Vendors Hook ====================

export interface Vendor {
  id: number;
  businessName: string;
  serviceType: string;
  verificationStatus: string;
  email: string;
  phone: string;
  createdAt: string;
}

export function useRealtimeVendors(): RealtimeHookResult<Vendor[]> & {
  pendingCount: number;
} {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pendingCount, setPendingCount] = useState(0);

  const loadVendors = useCallback(async () => {
    try {
      const response = await api.get<Vendor[]>('/vendors');
      setVendors(response.data);
      setPendingCount(response.data.filter(v => v.verificationStatus === 'PENDING').length);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendors');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();

    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handleVendorUpdate = (data: { id: number; verificationStatus: string }) => {
      setVendors(prev =>
        prev.map(v =>
          v.id === data.id ? { ...v, verificationStatus: data.verificationStatus } : v
        )
      );
      setLastUpdated(new Date());
      
      // Update pending count
      setPendingCount(prev => {
        const vendor = vendors.find(v => v.id === data.id);
        if (vendor?.verificationStatus === 'PENDING' && data.verificationStatus !== 'PENDING') {
          return prev - 1;
        } else if (vendor?.verificationStatus !== 'PENDING' && data.verificationStatus === 'PENDING') {
          return prev + 1;
        }
        return prev;
      });
    };

    const unsubscribeVendor = WebSocketService.subscribe(
      'admin:vendor:*',
      handleVendorUpdate
    );

    return () => {
      unsubscribe();
      unsubscribeVendor();
    };
  }, [loadVendors, vendors]);

  return {
    data: vendors,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadVendors,
    pendingCount,
  };
}

// ==================== Venues Hook ====================

export interface Venue {
  id: number;
  name: string;
  location: string;
  capacity: number;
  status: string;
  createdAt: string;
}

export function useRealtimeVenues(): RealtimeHookResult<Venue[]> & {
  pendingCount: number;
} {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pendingCount, setPendingCount] = useState(0);

  const loadVenues = useCallback(async () => {
    try {
      const response = await api.get<Venue[]>('/venues');
      setVenues(response.data);
      setPendingCount(response.data.filter(v => v.status === 'PENDING').length);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load venues');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();

    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handleVenueUpdate = (data: { id: number; status: string }) => {
      setVenues(prev =>
        prev.map(v =>
          v.id === data.id ? { ...v, status: data.status } : v
        )
      );
      setLastUpdated(new Date());
      
      setPendingCount(prev => {
        const venue = venues.find(v => v.status === 'PENDING' && data.status !== 'PENDING');
        if (venue) return prev - 1;
        return prev;
      });
    };

    const unsubscribeVenue = WebSocketService.subscribe(
      'admin:venue:*',
      handleVenueUpdate
    );

    return () => {
      unsubscribe();
      unsubscribeVenue();
    };
  }, [loadVenues, venues]);

  return {
    data: venues,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadVenues,
    pendingCount,
  };
}

// ==================== KYC Submissions Hook ====================

export interface KycSubmission {
  id: number;
  userId: number;
  userName: string;
  documentType: string;
  status: string;
  submittedAt: string;
}

export function useRealtimeKYCSubmissions(): RealtimeHookResult<KycSubmission[]> & {
  pendingCount: number;
} {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pendingCount, setPendingCount] = useState(0);

  const loadSubmissions = useCallback(async () => {
    try {
      const response = await api.get<KycSubmission[]>('/admin/kyc');
      setSubmissions(response.data);
      setPendingCount(response.data.filter((s: any) => s.status === 'PENDING').length);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load KYC submissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();

    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handleKYCUpdate = (data: KycSubmission) => {
      setSubmissions(prev => {
        const exists = prev.find(s => s.id === data.id);
        if (exists) {
          return prev.map(s => s.id === data.id ? data : s);
        }
        return [data, ...prev];
      });
      setLastUpdated(new Date());
    };

    const unsubscribeKYC = WebSocketService.subscribe(
      'admin:kyc:*',
      handleKYCUpdate
    );

    return () => {
      unsubscribe();
      unsubscribeKYC();
    };
  }, [loadSubmissions]);

  return {
    data: submissions,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadSubmissions,
    pendingCount,
  };
}

// ==================== Payouts Hook ====================

export interface Payout {
  id: number;
  vendorId: number;
  vendorName: string;
  amount: number;
  status: string;
  requestedAt: string;
}

export function useRealtimePayouts(): RealtimeHookResult<Payout[]> & {
  pendingCount: number;
} {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pendingCount, setPendingCount] = useState(0);

  const loadPayouts = useCallback(async () => {
    try {
      const response = await api.get<Payout[]>('/payouts');
      setPayouts(response.data);
      setPendingCount(response.data.filter(p => p.status === 'PENDING').length);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayouts();

    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handlePayoutUpdate = (data: Payout) => {
      setPayouts(prev => {
        const exists = prev.find(p => p.id === data.id);
        if (exists) {
          return prev.map(p => p.id === data.id ? data : p);
        }
        return [data, ...prev];
      });
      setLastUpdated(new Date());
    };

    const unsubscribePayout = WebSocketService.subscribe(
      'admin:payout:*',
      handlePayoutUpdate
    );

    return () => {
      unsubscribe();
      unsubscribePayout();
    };
  }, [loadPayouts]);

  return {
    data: payouts,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadPayouts,
    pendingCount,
  };
}

// ==================== Transactions Hook ====================

export interface Transaction {
  id: string;
  amount: number;
  status: string;
  type: string;
  userId: number;
  createdAt: string;
}

export function useRealtimeTransactions(): RealtimeHookResult<Transaction[]> {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const loadTransactions = useCallback(async () => {
    try {
      const response = await api.get<Transaction[]>('/payments');
      setTransactions(response.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();

    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handleTransactionUpdate = (data: Transaction) => {
      setTransactions(prev => {
        const exists = prev.find(t => t.id === data.id);
        if (exists) {
          return prev.map(t => t.id === data.id ? data : t);
        }
        return [data, ...prev];
      });
      setLastUpdated(new Date());
    };

    const unsubscribeTransaction = WebSocketService.subscribe(
      'admin:payment:*',
      handleTransactionUpdate
    );

    return () => {
      unsubscribe();
      unsubscribeTransaction();
    };
  }, [loadTransactions]);

  return {
    data: transactions,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadTransactions,
  };
}

// ==================== Notifications Hook ====================

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function useRealtimeNotifications(): RealtimeHookResult<Notification[]> & {
  unreadCount: number;
} {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      // For now, return empty array - notifications come via WebSocket
      setNotifications([]);
      setUnreadCount(0);
      setLastUpdated(new Date());
      setError(null);
      setIsLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const unsubscribe = WebSocketService.onStatusChange(setConnectionStatus);

    const handleNotification = (data: Notification) => {
      setNotifications(prev => [data, ...prev]);
      if (!data.read) {
        setUnreadCount(prev => prev + 1);
      }
      setLastUpdated(new Date());
    };

    const unsubscribeNotification = WebSocketService.subscribe(
      'notifications',
      handleNotification
    );

    return () => {
      unsubscribe();
      unsubscribeNotification();
    };
  }, [loadNotifications]);

  return {
    data: notifications,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    refresh: loadNotifications,
    unreadCount,
  };
}
