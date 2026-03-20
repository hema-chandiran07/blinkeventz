"use client";

import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlannerError } from "@/types/ai-planner";

interface AIPlannerErrorProps {
  error: PlannerError;
  className?: string;
  onRetry?: () => void;
  onReset?: () => void;
}

export function AIPlannerError({
  error,
  className,
  onRetry,
  onReset,
}: AIPlannerErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("w-full max-w-lg mx-auto", className)}
    >
      <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
        {/* Error icon */}
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>

        {/* Error message */}
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {getErrorTitle(error.code)}
        </h3>
        <p className="text-gray-600 mb-6">
          {error.message}
        </p>

        {/* Error code */}
        <p className="text-xs text-gray-400 mb-6">
          Error code: {error.code}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {error.canRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Start Over
          </button>
        </div>
      </div>

      {/* Help text */}
      <p className="text-center text-sm text-gray-500 mt-4">
        Need help? Contact our support team for assistance.
      </p>
    </motion.div>
  );
}

function getErrorTitle(code: string): string {
  switch (code) {
    case "VALIDATION_ERROR":
      return "Please check your input";
    case "JOB_FAILED":
      return "Plan generation failed";
    case "POLLING_TIMEOUT":
      return "Request timed out";
    case "API_ERROR":
      return "Something went wrong";
    case "AI_SERVICE_UNAVAILABLE":
      return "AI service is temporarily unavailable";
    case "RATE_LIMIT":
      return "Too many requests - please wait";
    default:
      return "Oops! Something went wrong";
  }
}

// Error boundary fallback component
export function AIPlannerErrorBoundary({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  // This would be used with React's error boundary
  // Placeholder for the error boundary component
  return <div className={className}>{children}</div>;
}
