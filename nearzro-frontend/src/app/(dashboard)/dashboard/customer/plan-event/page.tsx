"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  ChevronRight,
  History,
  X,
  Clock,
  ArrowRight,
  ShoppingCart,
  RefreshCw,
  Share2,
  AlertCircle,
} from "lucide-react";
import { AIPlannerProvider, useAIPlannerContext } from "@/context/ai-planner-context";
import { useAIPlanner } from "@/hooks/useAIPlanner";
import { AIChatbot } from "@/components/ai-planner/ai-chatbot";
import { AIPlannerLoading } from "@/components/ai-planner/ai-planner-loading";
import { cn } from "@/lib/utils";
import { aiChatbotApi } from "@/lib/ai-planner";
import type { AIPlanAllocation } from "@/types/ai-planner";

// ─────────────────────────────────────────────────────────────
// Progress steps
// ─────────────────────────────────────────────────────────────
const FLOW_STEPS = [
  { key: "COLLECTING", label: "Tell us about your event" },
  { key: "GENERATING", label: "AI generates your plan" },
  { key: "SUCCESS", label: "Review & accept" },
];

function ProgressSteps({ current }: { current: string }) {
  const idx = current === "COLLECTING" ? 0 : current === "GENERATING" ? 1 : 2;
  return (
    <div className="flex items-center gap-2">
      {FLOW_STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-all",
            i < idx ? "bg-zinc-700 border-zinc-600 text-zinc-300"
              : i === idx ? "bg-zinc-200 border-zinc-100 text-zinc-900 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
              : "bg-zinc-900 border-zinc-800 text-zinc-600"
          )}>
            {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
          </div>
          <span className={cn(
            "text-xs font-medium hidden lg:block",
            i === idx ? "text-zinc-200" : "text-zinc-600"
          )}>
            {step.label}
          </span>
          {i < FLOW_STEPS.length - 1 && (
            <ChevronRight className="w-3 h-3 text-zinc-700 mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Live Summary sidebar
// ─────────────────────────────────────────────────────────────
const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function SummarySidebar({ uiState, formData, activePlan, onAccept, onRegenerate, onShare }: {
  uiState: string;
  formData: { budget: number; eventType: string; city: string; area: string; guestCount: number };
  activePlan: any;
  onAccept: () => void;
  onRegenerate: () => void;
  onShare: () => void;
}) {
  const fields = [
    { label: "Event Type", value: formData.eventType },
    { label: "City", value: formData.city },
    { label: "Area", value: formData.area },
    { label: "Guests", value: formData.guestCount ? `${formData.guestCount} guests` : null },
    { label: "Budget", value: formData.budget ? formatINR(formData.budget) : null },
  ].filter(f => f.value);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Details card */}
      <div className="bg-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800/80 p-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-zinc-500/10 rounded-full blur-2xl pointer-events-none" />
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Event Details</h3>
        {fields.length === 0 ? (
          <p className="text-zinc-600 text-sm italic">Chat with Event Brain to start planning...</p>
        ) : (
          <div className="space-y-3 relative z-10">
            {fields.map(f => (
              <div key={f.label} className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">{f.label}</span>
                <span className={cn(
                  "font-semibold text-sm",
                  f.label === "Budget" ? "text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-400" : "text-zinc-200"
                )}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Completion indicator */}
        {fields.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800/60">
            <div className="flex justify-between text-xs text-zinc-600 mb-1.5">
              <span>Completion</span>
              <span className="tabular-nums">{Math.round((fields.length / 5) * 100)}%</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-zinc-500 to-zinc-300 rounded-full"
                animate={{ width: `${(fields.length / 5) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Plan card — shown in SUCCESS state */}
      <AnimatePresence>
        {uiState === "SUCCESS" && activePlan && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-950/90 backdrop-blur-xl rounded-2xl border border-zinc-800/80 overflow-hidden"
          >
            <div className="p-5 border-b border-zinc-800/60">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Budget Breakdown</h3>
              <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
                {formatINR(activePlan.planJson?.summary?.totalBudget || activePlan.budget)}
              </p>
            </div>
            <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto">
              {activePlan.planJson?.allocations?.map((item: AIPlanAllocation, i: number) => (
                <div key={i} className="flex justify-between items-center px-2 py-1.5 rounded-lg hover:bg-zinc-900/60 transition-colors">
                  <span className="text-zinc-400 text-xs">{item.category}</span>
                  <span className="text-zinc-200 text-xs font-semibold tabular-nums">{formatINR(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-zinc-800/60 space-y-2">
              <button
                onClick={onAccept}
                className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all border border-zinc-200 hover:scale-[1.01] shadow-sm group"
              >
                <ShoppingCart className="w-4 h-4" />
                Accept & Create Cart
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onRegenerate}
                  className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-zinc-800"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
                <button
                  onClick={onShare}
                  className="py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all border border-zinc-800"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips card */}
      {uiState === "COLLECTING" && (
        <div className="bg-zinc-950/60 rounded-2xl border border-zinc-800/50 p-4">
          <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">Quick Tips</h4>
          <ul className="space-y-2 text-xs text-zinc-600">
            <li className="flex gap-2"><span className="text-zinc-500 mt-0.5">→</span> Mention your budget clearly e.g. "₹5 lakh"</li>
            <li className="flex gap-2"><span className="text-zinc-500 mt-0.5">→</span> Include your city and approximate area</li>
            <li className="flex gap-2"><span className="text-zinc-500 mt-0.5">→</span> Specify guest count for accurate pricing</li>
            <li className="flex gap-2"><span className="text-zinc-500 mt-0.5">→</span> You can say "no DJ" or "vegetarian food only"</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Conversation History Drawer
// ─────────────────────────────────────────────────────────────
function ConversationHistoryDrawer({ open, onClose, onResume }: {
  open: boolean;
  onClose: () => void;
  onResume: (id: string) => void;
}) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    aiChatbotApi.getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [open]);

  const STATUS_COLORS: Record<string, string> = {
    COLLECTING: "text-zinc-400 bg-zinc-900 border-zinc-800",
    GENERATING: "text-amber-400 bg-amber-950/40 border-amber-900",
    GENERATED: "text-emerald-400 bg-emerald-950/40 border-emerald-900",
    ACCEPTED: "text-zinc-500 bg-zinc-900 border-zinc-800",
    FAILED: "text-red-400 bg-red-950/40 border-red-900",
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 h-full w-80 bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <h2 className="font-semibold text-zinc-100 tracking-wide">Past Conversations</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-sm">No conversations yet</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { onResume(conv.id); onClose(); }}
                    className="w-full text-left p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        STATUS_COLORS[conv.status] || STATUS_COLORS.COLLECTING
                      )}>
                        {conv.status}
                      </span>
                      {conv.planId && <span className="text-[10px] text-zinc-600">Plan #{conv.planId}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                      <Clock className="w-3 h-3" />
                      {new Date(conv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      Resume conversation
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────
// Main inner content (uses context)
// ─────────────────────────────────────────────────────────────
function PlanEventContent() {
  const { state, reset } = useAIPlannerContext();
  const {
    uiState,
    messages,
    isChatLoading,
    progress,
    activePlan,
    formData,
    error,
    conversationId,
    sendMessage,
    startConversation,
    acceptPlan,
    retryPlan,
    resetPlanner,
    formatINR: _unused,
  } = useAIPlanner();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Start conversation on mount
  useEffect(() => {
    if (!conversationId && uiState === "COLLECTING") {
      startConversation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    await sendMessage(text);
  }, [sendMessage]);

  const handleClearConversation = useCallback(() => {
    resetPlanner();
    // Restart fresh conversation
    startConversation();
  }, [resetPlanner, startConversation]);

  const handleAccept = useCallback(async () => {
    await acceptPlan();
  }, [acceptPlan]);

  const handleRegenerate = useCallback(async () => {
    retryPlan();
    await startConversation();
  }, [retryPlan, startConversation]);

  const handleShare = useCallback(async () => {
    if (activePlan?.shareId) {
      const url = `${window.location.origin}/plans/share/${activePlan.shareId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [activePlan]);

  const handleResumeConversation = useCallback(async (id: string) => {
    // The sendMessage hook will use the existing conversationId
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ── Page Header ── */}
      <header className="flex-shrink-0 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-zinc-900" />
            </div>
            <div>
              <h1 className="font-bold text-zinc-100 tracking-tight">AI Event Planner</h1>
              <p className="text-xs text-zinc-500 font-medium">Plan your perfect event with AI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ProgressSteps current={uiState} />
            <button
              onClick={() => setHistoryOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 text-sm transition-all"
            >
              <History className="w-4 h-4" />
              <span className="hidden lg:block">History</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-8rem)]">

          {/* LEFT — Chat / Loading / Error */}
          <div className="flex flex-col min-h-0">
            <AnimatePresence mode="wait">
              {uiState === "GENERATING" ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col"
                >
                  {/* Mini chatbot still visible during generation */}
                  <AIChatbot
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={true}
                    conversationStatus="GENERATING"
                    className="flex-1 mb-4"
                  />
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4">
                    <AIPlannerLoading progress={progress} message="Your event plan is being generated..." />
                  </div>
                </motion.div>
              ) : uiState === "FAILED" ? (
                <motion.div
                  key="failed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 flex flex-col gap-4"
                >
                  <AIChatbot
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onClearConversation={handleClearConversation}
                    isLoading={isChatLoading}
                    conversationStatus="FAILED"
                    className="flex-1"
                  />
                  {/* Error banner */}
                  <div className="p-4 bg-red-950/40 border border-red-900/60 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 text-sm font-medium">{error?.message || "Something went wrong"}</p>
                      {error?.canRetry && (
                        <button
                          onClick={() => { retryPlan(); startConversation(); }}
                          className="mt-2 text-xs text-red-400 hover:text-red-300 underline underline-offset-2"
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <AIChatbot
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onAcceptPlan={handleAccept}
                    onClearConversation={handleClearConversation}
                    isLoading={isChatLoading}
                    conversationStatus={uiState === "SUCCESS" ? "GENERATED" : "COLLECTING"}
                    className="h-full"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT — Summary Sidebar */}
          <div className="hidden lg:block overflow-y-auto">
            <SummarySidebar
              uiState={uiState}
              formData={formData}
              activePlan={activePlan}
              onAccept={handleAccept}
              onRegenerate={handleRegenerate}
              onShare={handleShare}
            />
          </div>
        </div>

        {/* Mobile — Accept button at bottom when plan ready */}
        <AnimatePresence>
          {uiState === "SUCCESS" && activePlan && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-6 right-6 lg:hidden z-20"
            >
              <button
                onClick={handleAccept}
                className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xl border border-zinc-200 uppercase tracking-wider text-sm"
              >
                <ShoppingCart className="w-5 h-5" />
                Accept & Create Cart
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Conversation History Drawer */}
      <ConversationHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onResume={handleResumeConversation}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page export (wrapped in provider)
// ─────────────────────────────────────────────────────────────
export default function PlanEventPage() {
  return (
    <AIPlannerProvider>
      <PlanEventContent />
    </AIPlannerProvider>
  );
}
