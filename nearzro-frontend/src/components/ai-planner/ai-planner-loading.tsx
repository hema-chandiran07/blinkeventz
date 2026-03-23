"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles, LayoutList, MapPin, Wallet, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIPlannerLoadingProps {
  className?: string;
  progress?: number;
  message?: string;
}

const STEPS = [
  { icon: Brain, label: "Understanding your requirements", duration: 2500 },
  { icon: MapPin, label: "Analysing your city & area", duration: 2500 },
  { icon: Users, label: "Estimating guest requirements", duration: 2500 },
  { icon: Wallet, label: "Allocating budget across categories", duration: 3000 },
  { icon: LayoutList, label: "Finalising your event plan", duration: 3000 },
];

export function AIPlannerLoading({ className, progress = 0, message }: AIPlannerLoadingProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let elapsed = 0;
    STEPS.forEach((step, i) => {
      const t = setTimeout(() => setActiveStep(i), elapsed);
      timers.push(t);
      elapsed += step.duration;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      {/* Animated orb */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-700 via-zinc-500 to-zinc-800 flex items-center justify-center shadow-2xl shadow-zinc-900">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-t-2 border-r-2 border-zinc-300/40 absolute"
          />
          <Sparkles className="w-8 h-8 text-zinc-200" />
        </div>
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-zinc-500/30"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>

      <h3 className="text-xl font-bold text-zinc-100 mb-2 tracking-tight">
        {message || "Generating your event plan..."}
      </h3>
      <p className="text-zinc-500 text-sm mb-8">
        Our AI is crafting a personalised budget breakdown for you
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-8">
        <div className="flex justify-between text-xs text-zinc-600 mb-2 font-medium">
          <span>Progress</span>
          <span className="tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-zinc-500 via-zinc-300 to-zinc-500 rounded-full"
            style={{ width: `${Math.max(progress, 5)}%` }}
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="w-full max-w-xs space-y-3">
        <AnimatePresence>
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: i <= activeStep ? 1 : 0.3, x: 0 }}
                className={cn(
                  "flex items-center gap-3 text-left p-3 rounded-xl border transition-all",
                  active ? "bg-zinc-900/80 border-zinc-700 shadow-sm" : "border-transparent"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-all",
                  done ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                    : active ? "bg-zinc-800 border-zinc-600 text-zinc-200 shadow-[0_0_10px_rgba(255,255,255,0.05)]"
                    : "bg-zinc-950 border-zinc-800 text-zinc-700"
                )}>
                  {done ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  ) : active ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <Icon className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className={cn(
                  "text-sm font-medium",
                  done ? "text-zinc-500 line-through" : active ? "text-zinc-200" : "text-zinc-600"
                )}>
                  {step.label}
                </span>
                {active && (
                  <motion.div
                    className="ml-auto flex gap-1"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Skeleton for pre-loading state ────────────────────────────────────

function SkeletonBlock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("rounded-xl bg-zinc-900/80 border border-zinc-800/60 overflow-hidden relative", className)} style={style}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/10 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export function AIPlannerFullSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("w-full max-w-2xl mx-auto space-y-4", className)}>
      {/* Header skeleton */}
      <SkeletonBlock className="h-28" />
      {/* Rows skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonBlock key={i} className="h-16" style={{ opacity: 1 - i * 0.12 } as React.CSSProperties} />
      ))}
      {/* CTA skeleton */}
      <SkeletonBlock className="h-12" />
    </div>
  );
}
