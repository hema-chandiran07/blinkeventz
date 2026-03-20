"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPlannerLoadingProps {
  className?: string;
  progress?: number;
  message?: string;
}

// Reserved for future use
const _loadingConfig = { showProgress: true };

export function AIPlannerLoading({
  className,
  progress = 0,
  message = "Generating your personalized plan...",
}: AIPlannerLoadingProps) {
  return (
    <div className={cn("w-full max-w-lg mx-auto text-center", className)}>
      {/* Animated icon */}
      <div className="relative w-24 h-24 mx-auto mb-8">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute inset-2 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full opacity-40"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.5, 0.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-10 h-10 text-violet-600" />
          </motion.div>
        </div>
      </div>

      {/* Progress info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h3 className="text-xl font-semibold text-gray-900">
          {message}
        </h3>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-700">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Loading steps */}
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {[
            { label: "Analyzing budget", done: progress > 10 },
            { label: "Finding vendors", done: progress > 30 },
            { label: "Creating allocations", done: progress > 60 },
            { label: "Finalizing plan", done: progress > 80 },
          ].map((step, index) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: step.done ? 1 : 0.5, 
                scale: step.done ? 1 : 0.8 
              }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                step.done
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {step.done ? "✓" : "○"} {step.label}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Subtle pulse animation for the whole container */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-white/50 to-transparent pointer-events-none"
        animate={{
          y: ["-100%", "100%"],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

// Skeleton for plan cards (used in history, etc.)
export function AIPlannerCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-100 p-4 animate-pulse", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-gray-100 rounded" />
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// Detailed skeleton for the full plan view
export function AIPlannerFullSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-4", className)}>
      {/* Header skeleton */}
      <div className="bg-gray-200 rounded-2xl p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-300 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-6 w-24 bg-gray-300 rounded" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>

      {/* Allocations skeleton */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 space-y-2">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-4 border-b border-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded" />
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-4 w-16 bg-gray-200 rounded" />
                <div className="h-3 w-12 bg-gray-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
