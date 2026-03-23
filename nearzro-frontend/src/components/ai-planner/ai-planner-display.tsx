"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Share2,
  RefreshCw,
  Building2,
  Utensils,
  Camera,
  Music,
  Car,
  PartyPopper,
  MoreHorizontal,
  ArrowRight,
  ShoppingCart,
} from "lucide-react";
import { useAIPlanner } from "@/hooks/useAIPlanner";
import { cn } from "@/lib/utils";
import type { AIPlanJSON, AIPlanAllocation } from "@/types/ai-planner";

interface AIPlannerDisplayProps {
  className?: string;
  onAccept?: () => void;
  onRegenerate?: () => void;
  onShare?: () => void;
}

// Placeholder for unused prop warning
const _displayProps = true;

// Category icons mapping
const CATEGORY_ICONS: Record<string, any> = {
  Venue: Building2,
  Catering: Utensils,
  Photography: Camera,
  Decor: PartyPopper,
  Entertainment: Music,
  Transportation: Car,
  Invitations: MoreHorizontal,
  Miscellaneous: MoreHorizontal,
};

const DEFAULT_ICON = MoreHorizontal;

export function AIPlannerDisplay({
  className,
  onAccept,
  onRegenerate,
  onShare,
}: AIPlannerDisplayProps) {
  const { activePlan, formData, retryPlan } = useAIPlanner();
  const [copied, setCopied] = useState(false);

  if (!activePlan || !activePlan.planJson) {
    return null;
  }

  const planJson = activePlan.planJson as AIPlanJSON;
  const { summary, allocations } = planJson;

  const totalAllocated = allocations?.reduce(
    (sum: number, item: AIPlanAllocation) => sum + item.amount,
    0
  ) || 0;

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/ai-planner/public/${activePlan.shareId}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShare?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/50 shadow-2xl relative overflow-hidden rounded-2xl p-6 text-zinc-100 mb-6"
      >
        {/* Ambient top light */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400 to-transparent opacity-50" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-zinc-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 tracking-tight text-white">{summary.eventType || formData.eventType}</h2>
            <p className="text-zinc-400 font-medium tracking-wide text-sm">
              {summary.city || formData.city} • {summary.guestCount || formData.guestCount} guests
            </p>
          </div>
          <div className="text-right">
            <p className="text-zinc-400 text-sm font-medium tracking-wide uppercase">Total Budget</p>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
              {formatCurrency(summary.totalBudget || formData.budget)}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="relative z-10 flex gap-3 mt-6">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 border border-zinc-700/50 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all text-zinc-300 hover:text-white text-sm font-medium shadow-sm"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <Share2 className="w-4 h-4 text-zinc-400" />
            )}
            {copied ? "Copied!" : "Share Plan"}
          </button>
          <button
            onClick={onRegenerate || retryPlan}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800/80 border border-zinc-700/50 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-all text-zinc-300 hover:text-white text-sm font-medium shadow-sm"
          >
            <RefreshCw className="w-4 h-4 text-zinc-400" />
            Regenerate
          </button>
        </div>
      </motion.div>

      {/* Budget breakdown */}
      <div className="bg-zinc-950/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden">
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/40">
          <h3 className="font-semibold text-zinc-100 tracking-wide text-lg">Budget Allocation</h3>
          <p className="text-sm text-zinc-500 font-medium">
            {allocations?.length || 0} categories • {formatCurrency(totalAllocated)} total
          </p>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {allocations?.map((item: AIPlanAllocation, index: number) => {
            const Icon = CATEGORY_ICONS[item.category] || DEFAULT_ICON;
            const percentage = ((item.amount / (summary.totalBudget || formData.budget)) * 100).toFixed(1);

            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 hover:bg-zinc-900/50 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-inner group-hover:border-zinc-500/50 transition-colors">
                      <Icon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-medium text-zinc-200 tracking-wide">{item.category}</h4>
                      {item.notes && (
                        <p className="text-sm text-zinc-500 mt-1 leading-relaxed max-w-sm">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-zinc-200 tracking-wide">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-sm text-zinc-500 font-medium">{percentage}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-1.5 bg-zinc-800/80 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-500 via-zinc-400 to-zinc-300 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Accept/Cart action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <button
          onClick={onAccept}
          className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-400 text-zinc-950 border border-zinc-300 rounded-xl font-semibold hover:scale-[1.01] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] uppercase tracking-wider text-sm"
        >
          <ShoppingCart className="w-5 h-5" />
          Accept Plan & Create Cart
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}
