"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShoppingCart,
  RefreshCw,
  Share2,
  CheckCircle2,
  Building2,
  Utensils,
  Camera,
  Music,
  Car,
  PartyPopper,
  MoreHorizontal,
  MapPin,
  Users,
  Wallet,
  Calendar,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { aiPlannerApi } from "@/lib/ai-planner";
import { AIPlannerFullSkeleton } from "@/components/ai-planner/ai-planner-loading";
import { cn } from "@/lib/utils";
import type { AIPlan, AIPlanAllocation } from "@/types/ai-planner";

// ─────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────
const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Venue: Building2,
  Catering: Utensils,
  Photography: Camera,
  Decor: PartyPopper,
  Entertainment: Music,
  Transportation: Car,
  Invitations: MoreHorizontal,
  Miscellaneous: MoreHorizontal,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  GENERATED: { label: "Plan Ready", color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/60", icon: CheckCircle2 },
  ACCEPTED: { label: "Accepted", color: "text-zinc-400 bg-zinc-900 border-zinc-800", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-red-400 bg-red-950/40 border-red-900/60", icon: AlertCircle },
  EXPIRED: { label: "Expired", color: "text-zinc-600 bg-zinc-900 border-zinc-800", icon: AlertCircle },
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────
export default function PlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = Number(params.id);

  const [plan, setPlan] = useState<AIPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [shared, setShared] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!planId || isNaN(planId)) { setError("Invalid plan ID"); setLoading(false); return; }
    const controller = new AbortController();
    aiPlannerApi.getPlan(planId)
      .then(setPlan)
      .catch((err) => {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        setError("Plan not found or access denied");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [planId]);

  const handleAccept = useCallback(async () => {
    if (!plan) return;
    setAccepting(true);
    try {
      await aiPlannerApi.acceptPlan(plan.id);
      router.push(`/dashboard/customer/cart?planId=${plan.id}`);
    } catch {
      setError("Failed to create cart. Please try again.");
    } finally {
      setAccepting(false);
    }
  }, [plan, router]);

  const handleShare = useCallback(async () => {
    if (!plan?.shareId) return;
    const url = `${window.location.origin}/plans/share/${plan.shareId}`;
    await navigator.clipboard.writeText(url);
    setShared(true);
    setTimeout(() => setShared(false), 2000);
  }, [plan]);

  const handleRegenerate = useCallback(async () => {
    if (!plan) return;
    setRegenerating(true);
    try {
      const res = await aiPlannerApi.regeneratePlan(plan.id);
      router.push(`/dashboard/customer/plan-event?jobId=${res.jobId}`);
    } catch {
      setError("Failed to start regeneration. Please try again.");
    } finally {
      setRegenerating(false);
    }
  }, [plan, router]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <AIPlannerFullSkeleton className="pt-8" />
      </div>
    );
  }

  // ── Error ──
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-14 h-14 rounded-xl bg-red-950/40 border border-red-900/60 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Plan not found</h2>
        <p className="text-zinc-500 text-sm max-w-sm">{error || "This plan doesn't exist or you don't have access to it."}</p>
        <button
          onClick={() => router.push("/dashboard/customer/plan-event")}
          className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-sm font-medium transition-all border border-zinc-700"
        >
          Plan a new event
        </button>
      </div>
    );
  }

  const { planJson, status } = plan;
  const allocations = planJson?.allocations || [];
  const summary = planJson?.summary;
  const totalAllocated = allocations.reduce((s: number, a: AIPlanAllocation) => s + a.amount, 0);
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.GENERATED;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-bold text-zinc-100 tracking-tight">Event Plan</h1>
          <span className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-widest",
            statusCfg.color
          )}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 rounded-2xl border border-zinc-700/50 p-7 relative overflow-hidden shadow-2xl"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400/50 to-transparent" />
          <div className="absolute -top-20 -right-20 w-52 h-52 bg-zinc-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-zinc-100 mb-2">
                {summary?.eventType || "Event Plan"}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-400 font-medium">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{plan.city}{plan.area ? `, ${plan.area}` : ""}</span>
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{plan.guestCount} guests</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(plan.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-1 flex items-center gap-1 justify-end">
                <Wallet className="w-3.5 h-3.5" /> Total Budget
              </p>
              <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
                {formatINR(summary?.totalBudget || plan.budget)}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="relative z-10 flex flex-wrap gap-2 mt-6 pt-6 border-t border-zinc-800/60">
            <button
              onClick={handleShare}
               className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-sm font-medium transition-all"
            >
              {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4 text-zinc-400" />}
              {shared ? "Link copied!" : "Share Plan"}
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
               className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 text-sm font-medium transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 text-zinc-400", regenerating && "animate-spin")} />
              {regenerating ? "Starting..." : "Regenerate"}
            </button>
          </div>
        </motion.div>

        {/* Budget breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800/80 overflow-hidden shadow-xl"
        >
          <div className="px-6 py-5 border-b border-zinc-800/60 bg-zinc-900/30 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-100 tracking-tight text-lg">Budget Allocation</h3>
              <p className="text-sm text-zinc-500 mt-0.5">{allocations.length} categories · {formatINR(totalAllocated)} total</p>
            </div>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {allocations.map((item: AIPlanAllocation, i: number) => {
              const Icon = CATEGORY_ICONS[item.category] || MoreHorizontal;
              const pct = ((item.amount / (summary?.totalBudget || plan.budget)) * 100).toFixed(1);
              return (
                <motion.div
                  key={item.category}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-6 py-5 hover:bg-zinc-900/50 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-inner group-hover:border-zinc-600/60 transition-colors flex-shrink-0">
                        <Icon className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-200 tracking-wide">{item.category}</h4>
                        {item.notes && <p className="text-sm text-zinc-500 mt-1 leading-relaxed max-w-md">{item.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="font-bold text-zinc-100 text-lg tabular-nums">{formatINR(item.amount)}</p>
                      <p className="text-xs text-zinc-500 font-medium tabular-nums">{pct}%</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                      className="h-full bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-300 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.15)]"
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Accept CTA */}
        <AnimatePresence>
          {status !== "ACCEPTED" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {error && (
                <div className="mb-4 p-4 bg-red-950/40 border border-red-900/60 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full flex items-center justify-center gap-3 py-4.5 bg-gradient-to-r from-zinc-200 via-white to-zinc-200 text-zinc-950 rounded-2xl font-bold shadow-[0_0_30px_rgba(255,255,255,0.12)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:scale-[1.01] transition-all uppercase tracking-widest text-sm border border-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                {accepting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating cart...</>
                ) : (
                  <><ShoppingCart className="w-5 h-5" /> Accept Plan & Create Cart <ArrowLeft className="w-5 h-5 rotate-180" /></>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Already accepted */}
        {status === "ACCEPTED" && (
          <div className="p-5 bg-zinc-900/60 rounded-2xl border border-zinc-800 text-center">
            <CheckCircle2 className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-300 font-medium">This plan has been accepted and converted to a cart.</p>
            <button
              onClick={() => router.push(`/dashboard/customer`)}
              className="mt-3 text-zinc-400 hover:text-zinc-200 text-sm underline underline-offset-2 transition-colors"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
