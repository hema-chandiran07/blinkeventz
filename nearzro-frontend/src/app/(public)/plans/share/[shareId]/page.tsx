"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  MapPin,
  Users,
  Wallet,
  Building2,
  Utensils,
  Camera,
  Music,
  Car,
  PartyPopper,
  MoreHorizontal,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { aiPlannerApi } from "@/lib/ai-planner";
import { AIPlannerFullSkeleton } from "@/components/ai-planner/ai-planner-loading";
import { cn } from "@/lib/utils";
import type { AIPlanPublic, AIPlanAllocation } from "@/types/ai-planner";

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Venue: Building2, Catering: Utensils, Photography: Camera,
  Decor: PartyPopper, Entertainment: Music, Transportation: Car,
  Invitations: MoreHorizontal, Miscellaneous: MoreHorizontal,
};

export default function PublicPlanSharePage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [plan, setPlan] = useState<AIPlanPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) { setError("Invalid share link"); setLoading(false); return; }
    aiPlannerApi.getPublicPlan(shareId)
      .then(setPlan)
      .catch(() => setError("This plan is not available for public viewing."))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
        <AIPlannerFullSkeleton className="w-full max-w-2xl" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center justify-center mb-2">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Plan not available</h2>
        <p className="text-zinc-500 text-sm max-w-sm">{error}</p>
        <a
          href="/register"
          className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-950 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-white transition-all"
        >
          Create your own plan
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const allocations = plan.planJson?.allocations || [];
  const summary = plan.planJson?.summary;
  const totalBudget = summary?.totalBudget || plan.budget;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Minimal nav */}
      <nav className="border-b border-zinc-800/60 bg-zinc-950/95 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-zinc-900" />
            </div>
            <span className="font-bold text-zinc-100 text-sm tracking-wide">Event Brain</span>
            <span className="text-zinc-700 text-xs ml-1">· Shared Plan</span>
          </div>
          <a
            href="/register"
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 text-zinc-950 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-white transition-all"
          >
            Plan Your Event <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 rounded-2xl border border-zinc-700/50 p-7 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400/50 to-transparent" />
          <div className="absolute -top-16 -right-16 w-40 h-40 bg-zinc-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-4">
              <Sparkles className="w-3 h-3" /> AI-Generated Event Plan
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
              {summary?.eventType || "Event Plan"}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-zinc-400 font-medium mb-5">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{summary?.city || plan.city}{plan.area ? `, ${plan.area}` : ""}</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{summary?.guestCount || plan.guestCount} guests</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-zinc-500 text-sm font-medium flex items-center gap-1"><Wallet className="w-4 h-4" />Total Budget</span>
              <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
                {formatINR(totalBudget)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Allocations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-950/90 rounded-2xl border border-zinc-800/80 overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-900/30">
            <h2 className="font-bold text-zinc-100 text-lg tracking-tight">Budget Breakdown</h2>
            <p className="text-sm text-zinc-500 mt-0.5">{allocations.length} categories</p>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {allocations.map((item: AIPlanAllocation, i: number) => {
              const Icon = CATEGORY_ICONS[item.category] || MoreHorizontal;
              const pct = ((item.amount / totalBudget) * 100).toFixed(1);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  className="px-6 py-5"
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-200 text-sm">{item.category}</p>
                        {item.notes && <p className="text-xs text-zinc-600 mt-0.5">{item.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-zinc-100 tabular-nums">{formatINR(item.amount)}</p>
                      <p className="text-xs text-zinc-600 tabular-nums">{pct}%</p>
                    </div>
                  </div>
                  <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.1 + i * 0.04 }}
                      className="h-full bg-gradient-to-r from-zinc-600 to-zinc-300 rounded-full"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-6 text-center"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-zinc-900" />
          </div>
          <h3 className="font-bold text-zinc-100 text-lg mb-2">Create your own event plan</h3>
          <p className="text-zinc-500 text-sm mb-5 max-w-sm mx-auto">
            Event Brain uses AI to build a personalised budget plan for your event in minutes.
          </p>
          <a
            href="/register"
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all",
              "bg-zinc-100 text-zinc-950 border border-zinc-200 hover:bg-white hover:scale-[1.02] shadow-lg"
            )}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}
