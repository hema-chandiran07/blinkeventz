'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../ui/toast-provider';

export interface NetworkStatus {
  status: 'online' | 'offline' | 'reconnecting';
  lastChecked: Date;
  retryCount: number;
}

interface NetworkStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

const CHECK_INTERVAL = 5000; // Check every 5 seconds
const RECONNECT_DELAY = 2000; // Wait 2 seconds before retry

export function NetworkStatusIndicator({ 
  className = '', 
  showDetails = false 
}: NetworkStatusIndicatorProps) {
  const [status, setStatus] = useState<NetworkStatus>({
    status: 'online',
    lastChecked: new Date(),
    retryCount: 0,
  });
  
  const { error, success, warning } = useToast();
  const [hasShownOfflineToast, setHasShownOfflineToast] = useState(false);

  const checkConnection = useCallback(async () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const healthEndpoint = `${apiBaseUrl}/api/health`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(healthEndpoint, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setStatus(prev => {
          // Show reconnection success toast if was reconnecting
          if (prev.status === 'reconnecting') {
            success('Connection restored', 'Successfully reconnected to the server');
            setHasShownOfflineToast(false);
          }
          return {
            ...prev,
            status: 'online',
            lastChecked: new Date(),
            retryCount: 0,
          };
        });
      } else {
        throw new Error('Health check failed');
      }
    } catch (error: any) {
      setStatus(prev => {
        const newRetryCount = prev.retryCount + 1;

        // Show offline toast only once
        if (prev.status !== 'offline' && !hasShownOfflineToast) {
          error(
            'Connection lost',
            'Unable to connect to the server. We\'ll keep trying to reconnect.',
            {
              label: 'Retry now',
              onClick: checkConnection,
            }
          );
          setHasShownOfflineToast(true);
        }

        return {
          ...prev,
          status: newRetryCount > 5 ? 'offline' : 'reconnecting',
          lastChecked: new Date(),
          retryCount: newRetryCount,
        };
      });
    }
  }, [error, success, hasShownOfflineToast]);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Periodic checks
    const interval = setInterval(checkConnection, CHECK_INTERVAL);

    // Listen to online/offline events
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        status: 'reconnecting',
        lastChecked: new Date(),
      }));
      checkConnection();
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        status: 'offline',
        lastChecked: new Date(),
      }));
      warning(
        'Network disconnected',
        'You appear to be offline. Some features may not work properly.',
        {
          label: 'Retry',
          onClick: checkConnection,
        }
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection, warning]);

  const statusConfig = {
    online: {
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'Connected',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
    },
    reconnecting: {
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      label: 'Reconnecting',
      icon: (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ),
    },
    offline: {
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      label: 'Offline',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
    },
  };

  const config = statusConfig[status.status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${config.bgColor}`}>
        <span className={`${config.color} relative flex h-2.5 w-2.5`}>
          {status.status === 'online' && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${config.color}`} />
        </span>
        <span className={`text-xs font-medium ${config.textColor}`}>
          {config.label}
        </span>
      </div>
      
      {showDetails && (
        <div className="text-xs text-gray-500">
          Last checked: {status.lastChecked.toLocaleTimeString()}
          {status.retryCount > 0 && ` (${status.retryCount} retries)`}
        </div>
      )}
    </div>
  );
}

/**
 * Hook to get current network status
 */
export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    status: 'online',
    lastChecked: new Date(),
    retryCount: 0,
  });

  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        status: 'online',
        lastChecked: new Date(),
      }));
    };

    const handleOffline = () => {
      setNetworkStatus(prev => ({
        ...prev,
        status: 'offline',
        lastChecked: new Date(),
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return networkStatus;
}

/**
 * Hook to queue actions when offline
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState<Array<() => Promise<any>>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const networkStatus = useNetworkStatus();

  const addToQueue = useCallback((action: () => Promise<any>) => {
    setQueue(prev => [...prev, action]);
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessing || queue.length === 0) return;

    setIsProcessing(true);
    const failedActions: Array<() => Promise<any>> = [];

    for (const action of queue) {
      try {
        await action();
      } catch (error) {
        console.error('Failed to process queued action:', error);
        failedActions.push(action);
      }
    }

    setQueue(failedActions);
    setIsProcessing(false);
  }, [queue, isProcessing]);

  // Process queue when coming back online
  useEffect(() => {
    if (networkStatus.status === 'online' && queue.length > 0) {
      processQueue();
    }
  }, [networkStatus.status, queue.length, processQueue]);

  return {
    queue,
    queueLength: queue.length,
    addToQueue,
    isProcessing,
    isOnline: networkStatus.status === 'online',
  };
}
