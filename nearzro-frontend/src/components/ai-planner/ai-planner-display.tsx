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
        className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white mb-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{summary.eventType || formData.eventType}</h2>
            <p className="text-violet-100">
              {summary.city || formData.city} • {summary.guestCount || formData.guestCount} guests
            </p>
          </div>
          <div className="text-right">
            <p className="text-violet-100 text-sm">Total Budget</p>
            <p className="text-3xl font-bold">
              {formatCurrency(summary.totalBudget || formData.budget)}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCopyShareLink}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {copied ? "Copied!" : "Share Plan"}
          </button>
          <button
            onClick={onRegenerate || retryPlan}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Regenerate
          </button>
        </div>
      </motion.div>

      {/* Budget breakdown */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Budget Allocation</h3>
          <p className="text-sm text-gray-500">
            {allocations?.length || 0} categories • {formatCurrency(totalAllocated)} total
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {allocations?.map((item: AIPlanAllocation, index: number) => {
            const Icon = CATEGORY_ICONS[item.category] || DEFAULT_ICON;
            const percentage = ((item.amount / (summary.totalBudget || formData.budget)) * 100).toFixed(1);

            return (
              <motion.div
                key={item.category}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{item.category}</h4>
                      {item.notes && (
                        <p className="text-sm text-gray-500 mt-0.5">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </p>
                    <p className="text-sm text-gray-500">{percentage}%</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
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
          className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          Accept Plan & Create Cart
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}
