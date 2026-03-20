'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'loading';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  updateToast: (id: string, updates: Partial<Toast>) => void;
  removeToast: (id: string) => void;
  success: (title: string, description?: string, duration?: number) => string;
  error: (title: string, description?: string, action?: { label: string; onClick: () => void }) => string;
  warning: (title: string, description?: string, action?: { label: string; onClick: () => void }) => string;
  info: (title: string, description?: string, duration?: number) => string;
  loading: (title: string, description?: string) => string;
}

const DEFAULT_DURATIONS = {
  success: 5000,
  error: 10000,
  warning: 8000,
  info: 5000,
  loading: 0, // No auto-dismiss for loading
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = () => `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      id,
      ...toast,
      duration: toast.duration ?? DEFAULT_DURATIONS[toast.type],
    };
    
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string, duration?: number) => {
    return addToast({
      title,
      description,
      type: 'success',
      duration: duration ?? DEFAULT_DURATIONS.success,
    });
  }, [addToast]);

  const error = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return addToast({
      title,
      description,
      type: 'error',
      duration: DEFAULT_DURATIONS.error,
      action,
    });
  }, [addToast]);

  const warning = useCallback((title: string, description?: string, action?: { label: string; onClick: () => void }) => {
    return addToast({
      title,
      description,
      type: 'warning',
      duration: DEFAULT_DURATIONS.warning,
      action,
    });
  }, [addToast]);

  const info = useCallback((title: string, description?: string, duration?: number) => {
    return addToast({
      title,
      description,
      type: 'info',
      duration: duration ?? DEFAULT_DURATIONS.info,
    });
  }, [addToast]);

  const loading = useCallback((title: string, description?: string) => {
    return addToast({
      title,
      description,
      type: 'loading',
      duration: DEFAULT_DURATIONS.loading,
    });
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        updateToast,
        removeToast,
        success,
        error,
        warning,
        info,
        loading,
      }}
    >
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[420px]">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// Individual Toast Component
function Toast({ 
  id, 
  title, 
  description, 
  type, 
  duration, 
  action,
  onDismiss 
}: Toast & { onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!duration || duration <= 0) return;

    const startTime = Date.now();
    const remainingTime = duration;
    
    const interval = setInterval(() => {
      if (!isPaused) {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.max(0, 100 - (elapsed / remainingTime) * 100);
        setProgress(newProgress);
        
        if (newProgress <= 0) {
          clearInterval(interval);
        }
      }
    }, 100);

    const timeout = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [duration, isPaused, onDismiss]);

  const typeStyles = {
    success: 'bg-green-50 border-green-500 text-green-900',
    error: 'bg-red-50 border-red-500 text-red-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    info: 'bg-blue-50 border-blue-500 text-blue-900',
    loading: 'bg-gray-50 border-gray-500 text-gray-900',
  };

  const typeIcons = {
    success: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    loading: (
      <svg className="w-5 h-5 text-gray-500 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    ),
  };

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-lg ${typeStyles[type]} animate-slide-in`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex-shrink-0">{typeIcons[type]}</div>
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">{title}</h4>
        {description && (
          <p className="text-xs mt-1 opacity-90">{description}</p>
        )}
        
        {action && (
          <button
            onClick={() => {
              action.onClick();
              onDismiss();
            }}
            className="mt-2 text-xs font-medium underline hover:no-underline"
          >
            {action.label}
          </button>
        )}
      </div>
      
      <button
        onClick={onDismiss}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {duration && duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-current opacity-30 transition-all duration-100 linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Helper hook for API action toasts with retry
export function useApiToast() {
  const { success, error, loading, updateToast } = useToast();

  const withLoadingToast = useCallback(async <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: {
      showSuccess?: boolean;
    }
  ): Promise<T> => {
    const toastId = loading(messages.loading);

    try {
      const result = await promise;

      updateToast(toastId, {
        type: 'success',
        title: messages.success,
      });

      if (options?.showSuccess !== false) {
        setTimeout(() => {
          updateToast(toastId, { description: undefined });
        }, 2000);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.error?.message || messages.error;

      updateToast(toastId, {
        type: 'error',
        title: messages.error,
        description: errorMessage,
      });

      throw err;
    }
  }, [loading, updateToast]);

  return { withLoadingToast };
}
