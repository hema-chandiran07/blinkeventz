"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Loader2,
  MapPin,
  Users,
  ArrowRight,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import { useEventBrain } from "@/hooks/useEventBrain";
import type { ChatMessage, AIPlanJSON } from "@/types/ai-planner";
import { cn } from "@/lib/utils";

// ==================== CONSTANTS ====================

const SUGGESTIONS = [
  "Plan a wedding in Mumbai",
  "Birthday party for 50 guests",
  "Corporate event in Bangalore",
  "Anniversary dinner in Delhi",
];

// ==================== FORMATTER ====================

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==================== TYPING ANIMATION ====================

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-zinc-400"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

// ==================== STATUS BADGE ====================

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const map: Record<string, { label: string; color: string; dot: string }> = {
    COLLECTING: { label: "Collecting", color: "text-zinc-400 bg-zinc-900 border-zinc-800", dot: "bg-zinc-500" },
    GENERATING: { label: "Generating Plan", color: "text-amber-400 bg-amber-950/40 border-amber-900/60", dot: "bg-amber-400 animate-pulse" },
    GENERATED: { label: "Plan Ready", color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/60", dot: "bg-emerald-400" },
    SUCCESS: { label: "Plan Ready", color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/60", dot: "bg-emerald-400" },
    MODIFYING: { label: "Modifying", color: "text-blue-400 bg-blue-950/40 border-blue-900/60", dot: "bg-blue-400 animate-pulse" },
    ACCEPTED: { label: "Accepted", color: "text-zinc-400 bg-zinc-900 border-zinc-800", dot: "bg-zinc-500" },
    FAILED: { label: "Failed", color: "text-red-400 bg-red-950/40 border-red-900/60", dot: "bg-red-400" },
    PLAN_READY: { label: "Plan Ready", color: "text-emerald-400 bg-emerald-950/40 border-emerald-900/60", dot: "bg-emerald-400" },
  };

  const cfg = map[status] || map.COLLECTING;

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold uppercase tracking-widest", cfg.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ==================== EVENT PLAN BUBBLE ====================

function EventPlanBubble({
  plan,
  onAccept,
}: {
  plan: AIPlanJSON;
  onAccept?: () => void;
}) {
  if (!plan?.summary || !plan?.allocations) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="mt-4 w-full max-w-sm rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl"
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 p-4 border-b border-zinc-800 relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-zinc-400/60 to-transparent" />
        <h4 className="text-zinc-100 font-bold tracking-tight text-sm">
          {plan.summary.eventType}
        </h4>
        <div className="flex gap-4 mt-1.5 text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {plan.summary.city}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" /> {plan.summary.guestCount} guests
          </span>
        </div>
      </div>

      {/* Budget Total */}
      <div className="p-4 bg-zinc-900/60 flex justify-between items-center border-b border-zinc-800/60">
        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
          Total Budget
        </span>
        <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">
          {formatINR(plan.summary.totalBudget)}
        </span>
      </div>

      {/* Mini Allocations */}
      <div className="p-4 space-y-2.5">
        {plan.allocations.slice(0, 5).map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">{item.category}</span>
            <span className="text-zinc-200 font-medium tabular-nums">
              {formatINR(item.amount)}
            </span>
          </div>
        ))}
        {plan.allocations.length > 5 && (
          <p className="text-[10px] text-zinc-600 text-center italic mt-1">
            +{plan.allocations.length - 5} more categories
          </p>
        )}
      </div>

      {/* Action Button */}
      {onAccept && (
        <button
          onClick={onAccept}
          className="w-full py-3.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border-t border-zinc-800 group"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Convert to Cart
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </motion.div>
  );
}

// ==================== MESSAGE CONTENT ====================

function MessageContent({
  message,
  onAcceptPlan,
}: {
  message: ChatMessage;
  onAcceptPlan?: () => void;
}) {
  const { content, planData } = message;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderLine = (line: string, i: number) => {
    if (line.startsWith("### "))
      return (
        <h3 key={i} className="font-semibold text-zinc-100 mt-3 mb-1 text-sm">
          {line.replace("### ", "")}
        </h3>
      );
    if (line.startsWith("**") && line.endsWith("**"))
      return (
        <p key={i} className="font-semibold text-zinc-200 text-sm">
          {line.replace(/\*\*/g, "")}
        </p>
      );
    if (line.startsWith("- ") || line.startsWith("* "))
      return (
        <li key={i} className="ml-4 text-zinc-400 text-sm list-disc">
          {line.replace(/^[-*] /, "")}
        </li>
      );
    if (/^\d+\. /.test(line))
      return (
        <li key={i} className="ml-4 text-zinc-400 text-sm list-decimal">
          {line.replace(/^\d+\. /, "")}
        </li>
      );
    if (!line.trim()) return <br key={i} />;
    return (
      <p key={i} className="text-zinc-300 text-sm leading-relaxed">
        {line}
      </p>
    );
  };

  return (
    <div className="relative group">
      <div className="space-y-0.5">
        {content.split("\n").map((line, i) => renderLine(line, i))}
      </div>
      {planData && <EventPlanBubble plan={planData} onAccept={onAcceptPlan} />}
      {content && (
        <button
          onClick={handleCopy}
          className="absolute -top-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-zinc-800"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-zinc-600" />
          )}
        </button>
      )}
    </div>
  );
}

// ==================== ERROR DISPLAY ====================

function ErrorDisplay({
  error,
  onRetry,
}: {
  error: { message: string; canRetry: boolean };
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-950/40 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <p className="text-zinc-300 text-sm mb-4">{error.message}</p>
      {error.canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-sm font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ==================== PROGRESS BAR ====================

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-xs mx-auto mt-2">
      <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-[10px] text-zinc-500 text-center mt-1">
        Generating your plan... {Math.round(progress)}%
      </p>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

interface EventBrainChatProps {
  className?: string;
  onPlanAccepted?: (cartId: number) => void;
}

export function EventBrainChat({
  className,
  onPlanAccepted,
}: EventBrainChatProps) {
  const {
    state,
    messages,
    currentPlanJson,
    isLoading,
    isPolling,
    error,
    progress,
    sendMessage,
    acceptPlan,
    retryPlan,
    clearConversation,
  } = useEventBrain({ onPlanAccepted });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || isPolling) return;
    setInput("");
    await sendMessage(text);
  }, [input, isLoading, isPolling, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = async (text: string) => {
    setInput("");
    await sendMessage(text);
  };

  const isBusy = isLoading || isPolling;
  const isGuestMode =
    state === "GUEST_DEMO" ||
    state === "GUEST_MESSAGE" ||
    state === "REDIRECTING_TO_LOGIN";

  // Map state to status badge
  const getStatusBadge = () => {
    switch (state) {
      case "GUEST_DEMO":
      case "GUEST_MESSAGE":
        return <StatusBadge status="COLLECTING" />;
      case "GENERATING_PLAN":
        return <StatusBadge status="GENERATING" />;
      case "PLAN_READY":
        return <StatusBadge status="PLAN_READY" />;
      case "ERROR":
        return <StatusBadge status="FAILED" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col bg-zinc-950/95 backdrop-blur-xl rounded-2xl border border-zinc-800/80 shadow-2xl overflow-hidden relative",
        className
      )}
    >
      {/* Premium ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-24 bg-zinc-500/8 blur-[50px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 p-[1.5px] shadow-lg">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center">
                <Sparkles className="w-4.5 h-4.5 text-zinc-200" />
              </div>
            </div>
            {/* Online indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-zinc-950 block" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 tracking-wide text-sm">
              Event Brain
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium tracking-widest uppercase">
              AI Event Planner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <button
            onClick={clearConversation}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-600 hover:text-zinc-300"
            title="Clear conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 relative z-10 scrollbar-thin scrollbar-track-zinc-950 scrollbar-thumb-zinc-800">
        {/* Error State */}
        {state === "ERROR" && error && (
          <ErrorDisplay error={error} onRetry={retryPlan} />
        )}

        {/* Redirecting State */}
        {state === "REDIRECTING_TO_LOGIN" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center pt-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-5 shadow-xl">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
            </div>
            <h4 className="font-bold text-zinc-100 mb-2 text-base tracking-tight">
              Redirecting to Login
            </h4>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
              Please log in to continue with your event planning.
            </p>
          </motion.div>
        )}

        {/* Empty State (Guest Mode) */}
        {messages.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center pt-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-5 shadow-xl">
              <Bot className="w-8 h-8 text-zinc-400" />
            </div>
            <h4 className="font-bold text-zinc-100 mb-2 text-base tracking-tight">
              Welcome to Event Brain
            </h4>
            <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-6">
              {isGuestMode
                ? "Tell me about your event and I'll create a custom budget plan for you. Log in to save your progress!"
                : "Tell me about your event and I'll create a custom budget plan for you instantly."}
            </p>
            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSuggestion(s)}
                  disabled={isBusy}
                  className="px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-xs hover:border-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border mt-0.5",
                  message.role === "user"
                    ? "bg-zinc-900 border-zinc-800"
                    : "bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 border-zinc-500/30 p-[1px]"
                )}
              >
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-zinc-400" />
                ) : (
                  <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-zinc-300" />
                  </div>
                )}
              </div>

              {/* Bubble */}
              <div
                className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-3 shadow-sm",
                  message.role === "user"
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50 rounded-tr-md"
                    : "bg-zinc-900/70 backdrop-blur-sm text-zinc-300 border border-zinc-800/60 rounded-tl-md"
                )}
              >
                {message.isLoading ? (
                  <TypingDots />
                ) : (
                  <MessageContent
                    message={message}
                    onAcceptPlan={
                      message.planData && currentPlanJson && !isGuestMode
                        ? acceptPlan
                        : undefined
                    }
                  />
                )}
                <p
                  className={cn(
                    "text-[10px] mt-1.5 tabular-nums",
                    message.role === "user"
                      ? "text-zinc-500 text-right"
                      : "text-zinc-600"
                  )}
                >
                  {new Date(message.timestamp).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Global loading indicator */}
        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-200 via-zinc-400 to-zinc-700 border-zinc-500/30 p-[1px] flex-shrink-0 mt-0.5">
              <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center">
                <Bot className="w-4 h-4 text-zinc-300" />
              </div>
            </div>
            <div className="bg-zinc-900/70 backdrop-blur-sm rounded-2xl rounded-tl-md px-4 py-3 border border-zinc-800/60">
              <TypingDots />
            </div>
          </motion.div>
        )}

        {/* Polling Progress */}
        {isPolling && (
          <div className="py-2">
            <ProgressBar progress={progress} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-5 py-4 border-t border-zinc-800/80 relative z-10 bg-zinc-950/60">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isGuestMode
                  ? "Ask me about your event..."
                  : "Ask Event Brain..."
              }
              rows={1}
              disabled={isBusy}
              className="w-full px-4 py-3 pr-12 bg-zinc-900/80 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-zinc-600 border border-zinc-800 text-zinc-100 placeholder:text-zinc-600 transition-all text-sm font-medium disabled:opacity-50 max-h-32"
            />
            {/* Character indicator when typing */}
            {input.length > 0 && (
              <span className="absolute bottom-3 right-3 text-[10px] text-zinc-600 tabular-nums">
                {input.length}
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isBusy}
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center transition-all border flex-shrink-0 shadow-sm",
              input.trim() && !isBusy
                ? "bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-white hover:scale-[1.04] shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                : "bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed"
            )}
          >
            {isBusy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <p className="text-[10px] text-zinc-700 tracking-wide font-medium flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Powered by GPT-4
          </p>
          <p className="text-[10px] text-zinc-700 tracking-wide">
            ↵ Send · ⇧↵ New line
          </p>
        </div>
      </div>
    </div>
  );
}
