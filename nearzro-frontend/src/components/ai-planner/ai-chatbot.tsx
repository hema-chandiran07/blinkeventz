"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/ai-planner";

interface AIChatbotProps {
  className?: string;
  conversationId?: string;
  initialMessages?: ChatMessage[];
  onSendMessage?: (message: string) => Promise<void>;
  onError?: (error: Error) => void;
  isLoading?: boolean;
  streamingResponse?: string;
}

// Reserved for future use
const _chatbotConfig = { maxMessages: 100 };

// Simple markdown-like rendering for AI responses
function MessageContent({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple formatting - split by lines and apply basic styling
  const lines = content.split("\n");

  return (
    <div className="relative group">
      <div className="space-y-1">
        {lines.map((line, i) => {
          // Headers
          if (line.startsWith("### ")) {
            return (
              <h3 key={i} className="font-semibold text-gray-900 mt-2">
                {line.replace("### ", "")}
              </h3>
            );
          }
          // Bold
          if (line.startsWith("**") && line.endsWith("**")) {
            return (
              <p key={i} className="font-semibold text-gray-900">
                {line.replace(/\*\*/g, "")}
              </p>
            );
          }
          // List items
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <li key={i} className="ml-4 text-gray-700">
                {line.replace(/^[-*] /, "")}
              </li>
            );
          }
          // Numbered items
          if (/^\d+\. /.test(line)) {
            return (
              <li key={i} className="ml-4 text-gray-700 list-decimal">
                {line.replace(/^\d+\. /, "")}
              </li>
            );
          }
          // Empty lines
          if (!line.trim()) {
            return <br key={i} />;
          }
          // Regular text
          return (
            <p key={i} className="text-gray-700">
              {line}
            </p>
          );
        })}
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-gray-100"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4 text-gray-400" />
        )}
      </button>
    </div>
  );
}

export function AIChatbot({
  className,
  conversationId: _conversationId,
  initialMessages = [],
  onSendMessage,
  onError,
  isLoading = false,
  streamingResponse: _streamingResponse,
}: AIChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Handle streaming response
  useEffect(() => {
    if (_streamingResponse !== undefined) {
      setStreamingText(_streamingResponse);
    }
  }, [_streamingResponse]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending || localLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Add user message
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    // Create placeholder for AI response
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessage: ChatMessage = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      if (onSendMessage) {
        // Use external handler
        await onSendMessage(userMessage.content);
      } else {
        // Simulate AI response (for demo)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const response = generateMockResponse(userMessage.content);
        
        // Update the AI message with response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? { ...msg, content: response, isLoading: false }
              : msg
          )
        );
      }
    } catch (error) {
      // Update message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: "Sorry, I encountered an error. Please try again.",
                isLoading: false,
              }
            : msg
        )
      );
      onError?.(error as Error);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, localLoading, onSendMessage, onError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col h-[600px] bg-white rounded-2xl border border-gray-100", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Event Brain</h3>
            <p className="text-sm text-gray-500">AI Assistant</p>
          </div>
        </div>
        <button
          onClick={() => {
            setMessages([]);
            setStreamingText("");
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Clear conversation"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-violet-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">
              Welcome to Event Brain!
            </h4>
            <p className="text-sm text-gray-500 max-w-xs">
              I can help you plan your event, suggest vendors, or answer questions about your budget.
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                  message.role === "user"
                    ? "bg-gray-100"
                    : "bg-gradient-to-r from-violet-500 to-purple-600"
                )}
              >
                {message.role === "user" ? (
                  <User className="w-4 h-4 text-gray-600" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-50 text-gray-900"
                )}
              >
                {message.isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                    <span className="text-sm text-gray-500">Thinking...</span>
                  </div>
                ) : (
                  <MessageContent content={message.content} />
                )}
              </div>
            </motion.div>
          ))}

          {/* Streaming response */}
          {streamingText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 max-w-[75%]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
                  <span className="text-sm text-gray-500">Typing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-100">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your event..."
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-gray-50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
              disabled={isSending || localLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending || localLoading}
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              input.trim() && !isSending && !localLoading
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {isSending || localLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

// Mock response generator for demo
function generateMockResponse(userInput: string): string {
  const input = userInput.toLowerCase();
  
  if (input.includes("budget") || input.includes("cost")) {
    return `Here's a typical budget breakdown for a wedding in India:

**Venue** - 25-30% of total budget
- Mandapam: ₹50,000 - ₹5,00,000
- Banquet hall: ₹1,00,000 - ₹10,00,000

**Catering** - 20-25% of total budget
- Per plate: ₹300 - ₹2,000
- Vegetarian options typically ₹300-₹800

**Decor** - 15-20% of total budget
- Floral arrangements: ₹50,000 - ₹5,00,000
- Lighting: ₹20,000 - ₹2,00,000

Would you like me to create a detailed plan with specific amounts?`;
  }
  
  if (input.includes("vendor") || input.includes("photographer")) {
    return `Here are some tips for booking vendors:

### Photography
- Book 3-6 months in advance for popular dates
- Look for portfolios with natural lighting style
- Ask for full-day vs half-day packages

### Catering
- Taste test before booking
- Check if they provide serving staff
- Ask about vegetarian and Jain options

Would you like me to search for vendors in your city?`;
  }
  
  return `I'd be happy to help you plan your event!

Here are some things I can assist with:
- **Budget planning** - Create a detailed allocation
- **Vendor recommendations** - Find the best vendors in your city
- **Timeline planning** - Create a day-of schedule
- **Tips & suggestions** - Best practices for Indian weddings

What would you like to know more about?`;
}
