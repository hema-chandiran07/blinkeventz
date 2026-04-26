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
      <div className="bg-zinc-950/90 backdrop-blur-xl border border-red-900/30 shadow-2xl rounded-2xl p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-red-500/5 blur-[60px] rounded-full pointer-events-none" />
        
        {/* Error icon */}
        <div className="relative z-10 w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-inner">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>

        {/* Error message */}
        <h3 className="relative z-10 text-xl font-semibold text-zinc-100 mb-2 tracking-wide">
          {getErrorTitle(error.code)}
        </h3>
        <p className="relative z-10 text-zinc-400 mb-6 font-medium leading-relaxed">
          {error.message}
        </p>

        {/* Error code */}
        <p className="relative z-10 text-[11px] text-zinc-600 font-mono tracking-wider uppercase mb-8">
          Error code: {error.code}
        </p>

        {/* Actions */}
        <div className="relative z-10 flex flex-col sm:flex-row gap-3 justify-center">
          {error.canRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-100 text-zinc-950 border border-zinc-200 rounded-lg font-semibold hover:bg-white hover:scale-[1.02] transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-lg font-medium hover:bg-zinc-800 hover:text-white transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Start Over
          </button>
        </div>
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-zinc-500 mt-5 font-medium tracking-wide">
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
