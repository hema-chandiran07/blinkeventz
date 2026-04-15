"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Search, 
  User, 
  MapPin, 
  Store, 
  Calendar, 
  X, 
  Loader2, 
  ArrowRight,
  Command as CommandIcon 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn, getImageUrl } from "@/lib/utils";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface SearchResult {
  id: number;
  name?: string;
  title?: string;
  businessName?: string;
  city?: string;
  area?: string;
  role?: string;
  image?: string;
  status?: string;
  score: number;
}

interface SearchResponse {
  users: SearchResult[];
  venues: SearchResult[];
  vendors: SearchResult[];
  events: SearchResult[];
  metadata: {
    query: string;
    durationMs: number;
    totalResults: number;
  };
}

export function CommandPalette({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const handleSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/search?q=${q}`);
      setResults(data);
      setSelectedIndex(0);
    } catch (error: any) {
      console.error("Search failed:", error);
      if (error?.response?.status === 401) {
        // Redundancy check - api helper already handles redirect, but we can log it here
        console.warn("Search unauthorized. Access token missing or expired.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) handleSearch(query);
      else setResults(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  // Handle navigation
  const navigateToResult = (result: SearchResult, type: string) => {
    setOpen(false);
    switch (type) {
      case 'users':
        router.push(`/dashboard/admin/users?id=${result.id}`);
        break;
      case 'venues':
        router.push(`/dashboard/venue/details?id=${result.id}`);
        break;
      case 'vendors':
        router.push(`/dashboard/admin/vendors?id=${result.id}`);
        break;
      case 'events':
        router.push(`/dashboard/admin/events?id=${result.id}`);
        break;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === "ArrowDown") {
        setSelectedIndex(prev => prev + 1);
      } else if (e.key === "ArrowUp") {
        setSelectedIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === "Enter" && results) {
        // Flatten results for navigation
        const allResults = [
          ...results.users.map(r => ({ ...r, type: 'users' })),
          ...results.venues.map(r => ({ ...r, type: 'venues' })),
          ...results.vendors.map(r => ({ ...r, type: 'vendors' })),
          ...results.events.map(r => ({ ...r, type: 'events' })),
        ];
        if (allResults[selectedIndex]) {
          navigateToResult(allResults[selectedIndex] as any, (allResults[selectedIndex] as any).type);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, results, selectedIndex]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white/90 backdrop-blur-xl border-silver-200 shadow-2xl rounded-2xl">
        <div className="relative border-b border-silver-100 p-4 flex items-center gap-3">
          <Search className="h-5 w-5 text-neutral-400" />
          <Input
            autoFocus
            placeholder="Search anything... (Users, Venues, Vendors, Events)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-none bg-transparent focus-visible:ring-0 text-lg p-0 h-auto placeholder:text-neutral-400"
          />
          <div className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
            ) : (
              <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-silver-200 bg-silver-50 px-1.5 font-mono text-[10px] font-medium text-neutral-500 opacity-100">
                ESC
              </kbd>
            )}
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
          <AnimatePresence mode="wait">
            {!results && !loading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 text-center"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-silver-100 mb-4">
                  <CommandIcon className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-neutral-500 font-medium">Type to start searching...</p>
                <p className="text-neutral-400 text-sm mt-1">Try searching for "Venue", "Admin" or an email.</p>
              </motion.div>
            )}

            {results && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4 pb-4"
              >
                <ResultGroup 
                  title="Users" 
                  items={results.users} 
                  icon={User} 
                  type="users"
                  onNavigate={navigateToResult}
                  selectedIndex={selectedIndex}
                  offset={0}
                />
                <ResultGroup 
                  title="Venues" 
                  items={results.venues} 
                  icon={MapPin} 
                  type="venues"
                  onNavigate={navigateToResult}
                  selectedIndex={selectedIndex}
                  offset={results.users.length}
                />
                <ResultGroup 
                  title="Vendors" 
                  items={results.vendors} 
                  icon={Store} 
                  type="vendors"
                  onNavigate={navigateToResult}
                  selectedIndex={selectedIndex}
                  offset={results.users.length + results.venues.length}
                />
                <ResultGroup 
                  title="Events" 
                  items={results.events} 
                  icon={Calendar} 
                  type="events"
                  onNavigate={navigateToResult}
                  selectedIndex={selectedIndex}
                  offset={results.users.length + results.venues.length + results.vendors.length}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {results && (
          <div className="p-3 bg-silver-50/50 border-t border-silver-100 flex items-center justify-between text-[10px] text-neutral-400 font-medium uppercase tracking-wider">
            <div className="flex items-center gap-4">
              <span>{results.metadata.totalResults} results found</span>
              <span>Search took {results.metadata.durationMs}ms</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <kbd className="bg-white border rounded px-1">↓↑</kbd> to navigate
              </span>
              <span className="flex items-center gap-1 ml-2">
                <kbd className="bg-white border rounded px-1">↵</kbd> to select
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultGroup({ 
  title, 
  items, 
  icon: Icon, 
  type, 
  onNavigate,
  selectedIndex,
  offset
}: { 
  title: string, 
  items: SearchResult[], 
  icon: any, 
  type: string,
  onNavigate: any,
  selectedIndex: number,
  offset: number
}) {
  if (items.length === 0) return null;

  return (
    <div className="px-2">
      <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      <div className="space-y-1 mt-1">
        {items.map((item, idx) => {
          const globalIdx = offset + idx;
          const isSelected = selectedIndex === globalIdx;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item, type)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group text-left",
                isSelected 
                  ? "bg-gradient-to-r from-silver-200 to-silver-100 text-black shadow-sm" 
                  : "hover:bg-silver-50 text-neutral-600 hover:text-black"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-silver-100 flex items-center justify-center overflow-hidden border border-silver-200 shrink-0">
                  {item.image ? (
                    <img src={getImageUrl(item.image)} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-5 w-5 text-neutral-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold truncate max-w-[200px]">
                    {item.name || item.title || item.businessName}
                  </p>
                  <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                    {item.role || item.status || item.city || "Reference " + item.id}
                    {item.area && <span> • {item.area}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isSelected && (
                  <motion.div layoutId="arrow" initial={{ x: -10 }} animate={{ x: 0 }}>
                    <ArrowRight className="h-4 w-4 text-neutral-500" />
                  </motion.div>
                )}
                <span className="text-[10px] tabular-nums text-neutral-400 bg-white/50 px-1.5 py-0.5 rounded border">
                  {(item.score * 100).toFixed(0)}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
