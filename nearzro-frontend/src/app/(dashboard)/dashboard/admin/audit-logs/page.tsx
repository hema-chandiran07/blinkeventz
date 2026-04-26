"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity, Shield, User, Calendar, Download, Search, CheckCircle2, XCircle,
  AlertTriangle, AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight,
  Clock, Database, FileText, Code, Server, Loader2, X, Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

// ==================== Types ====================
interface AuditLog {
  id: number;
  actorId: number | null;
  actorRole: string | null;
  actorEmail: string | null;
  entityType: string;
  entityId: string | number | null;
  action: string;
  severity: "LOW" | "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  source: "USER" | "SYSTEM" | "ADMIN" | "SERVICE";
  description: string | null;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  diff: Record<string, any> | null;
  metadata: Record<string, any> | null;
  occurredAt: string;
  requestId: string | null;
  sessionId: string | null;
  traceId: string | null;
  isSensitive: boolean;
}

interface AuditLogDetail {
  log: AuditLog;
  actionLabel: string;
  severityLabel: string;
  sourceLabel: string;
}

// ==================== Constants ====================
const SEVERITY_CONFIG: Record<string, { className: string; label: string; icon: any; color: string }> = {
  LOW: { className: "bg-blue-50 text-blue-700 border-blue-200", label: "Low", icon: Info, color: "blue" },
  INFO: { className: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Info", icon: CheckCircle2, color: "emerald" },
  WARNING: { className: "bg-amber-50 text-amber-700 border-amber-200", label: "Warning", icon: AlertTriangle, color: "amber" },
  HIGH: { className: "bg-red-50 text-red-700 border-red-200", label: "High", icon: AlertCircle, color: "red" },
  CRITICAL: { className: "bg-red-100 text-red-800 border-red-300", label: "Critical", icon: XCircle, color: "red" },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: any }> = {
  USER: { label: "User", icon: User },
  SYSTEM: { label: "System", icon: Server },
  ADMIN: { label: "Admin", icon: Shield },
  SERVICE: { label: "Service", icon: Code },
};

const ACTION_ICONS: Record<string, any> = {
  USER_LOGIN: User,
  USER_REGISTER: User,
  VENUE_APPROVED: CheckCircle2,
  VENUE_REJECTED: XCircle,
  VENDOR_APPROVED: CheckCircle2,
  VENDOR_REJECTED: XCircle,
  PAYMENT_PROCESSED: Activity,
  KYC_SUBMITTED: FileText,
  KYC_APPROVED: CheckCircle2,
  KYC_REJECTED: XCircle,
  SETTINGS_UPDATED: Shield,
  FEATURE_FLAG_UPDATED: Shield,
  SECURITY_UPDATED: Shield,
};

// ==================== Helpers ====================
function formatAction(action: string): string {
  return action
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function formatJson(data: Record<string, any> | null): string {
  if (!data) return "N/A";
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

// ==================== Main Component ====================
export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Detail Drawer state
  const [detailLog, setDetailLog] = useState<AuditLogDetail | null>(null);

  // Entities Set for filters
  const entities = Array.from(new Set(logs.map(l => l.entityType).filter(Boolean)));

  // ==================== Load Logs ====================
  const loadLogs = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await api.get("/audit", {
        params: { page, limit },
      });

      const data = response.data || [];
      const logList = Array.isArray(data) ? data : [];

      setLogs(logList);
      setTotalPages(Math.ceil(logList.length / limit) || 1);
    } catch (error: any) {
      console.error("Failed to load audit logs:", error);
      toast.error(error?.response?.data?.message || "Failed to load audit logs");
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // ==================== View Log Detail ====================
  const handleViewLog = (logId: number) => {
    const log = logs.find(l => l.id === logId);
    if (!log) return;

    const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
    const srcConfig = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.SYSTEM;

    setDetailLog({
      log,
      actionLabel: formatAction(log.action),
      severityLabel: sevConfig.label,
      sourceLabel: srcConfig.label,
    });
  };

  // ==================== Filtered Logs ====================
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actorEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityType || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actorId?.toString() || "").includes(searchTerm);
    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    const matchesEntity = filterEntity === "all" || log.entityType === filterEntity;
    return matchesSearch && matchesSeverity && matchesEntity;
  });

  // ==================== Export ====================
  const handleExport = () => {
    try {
      const csvContent = filteredLogs.map(log =>
        `${log.id},"${log.action}","${log.actorEmail || ''}","${log.actorRole || ''}","${log.severity}","${log.entityType}","${log.description || ''}","${log.occurredAt}"`
      ).join('\n');
      const blob = new Blob([`ID,Action,User,Role,Severity,Entity,Description,Timestamp\n${csvContent}`], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Audit logs exported successfully!");
    } catch (error: any) {
      toast.error("Failed to export audit logs");
    }
  };

  // ==================== Loading State ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-black" />
          <p className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Accessing Kernel Logs...</p>
        </div>
      </div>
    );
  }

  // ==================== Main Render ====================
  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-zinc-50">
      {/* Top Protocol Bar */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="shrink-0 flex items-center justify-between p-6 bg-white border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-black text-black flex items-center gap-2 tracking-tight">
            <Activity className="h-6 w-6 text-indigo-600" />
            Audit Ledger
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-1">Immutable system activity and compliance records</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => loadLogs(true)} disabled={refreshing} className="shadow-sm border-zinc-200 text-zinc-700 rounded-full font-bold">
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh Feed
          </Button>
          <Button onClick={handleExport} className="bg-black hover:bg-zinc-800 text-white rounded-full font-bold shadow-md transition-all">
            <Download className="h-4 w-4 mr-2" /> Export to CSV
          </Button>
        </div>
      </motion.div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar Filters */}
        <div className="w-64 bg-white border-r border-zinc-200 flex flex-col shrink-0 overflow-y-auto hidden md:flex">
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2 text-sm font-black text-black uppercase tracking-widest">
            <Filter className="h-4 w-4" /> Filtering Controls
          </div>
          <div className="p-4 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Search Term</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  placeholder="ID, Action, Email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 border-zinc-200 bg-zinc-50 focus:bg-white text-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Severity Level</Label>
              <div className="flex flex-col gap-1">
                {["all", "INFO", "WARNING", "HIGH", "CRITICAL"].map((sev) => (
                   <button
                     key={sev}
                     onClick={() => setFilterSeverity(sev)}
                     className={cn(
                       "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all border",
                       filterSeverity === sev 
                        ? "bg-zinc-100 text-black border-zinc-300 shadow-sm"
                        : "border-transparent text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
                     )}
                   >
                     {sev !== "all" && React.createElement(SEVERITY_CONFIG[sev].icon, { className: cn("h-4 w-4", `text-${SEVERITY_CONFIG[sev].color}-500`) })}
                     {sev === "all" ? "All Levels" : SEVERITY_CONFIG[sev].label}
                   </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Entity Type</Label>
              <select
                value={filterEntity}
                onChange={(e) => setFilterEntity(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-black outline-none"
              >
                <option value="all">All Entities</option>
                {entities.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Center High Density Table */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-zinc-50/80 sticky top-0 z-10 border-b border-zinc-200 shadow-sm">
                <tr>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-40">Timestamp</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-24">Actor</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-48">Action</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resource</th>
                  <th className="py-3 px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest w-24 text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100/80">
                {filteredLogs.length === 0 ? (
                  <tr>
                     <td colSpan={5} className="py-12 text-center">
                        <Activity className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
                        <p className="text-zinc-500 font-medium">No system events matched the filter criteria.</p>
                     </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const Icon = ACTION_ICONS[log.action] || Activity;
                    const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
                    const SevIcon = sevConfig.icon;
                    const isSelected = detailLog?.log.id === log.id;
                    
                    return (
                      <tr 
                        key={log.id} 
                        onClick={() => handleViewLog(log.id)}
                        className={cn(
                          "cursor-pointer transition-all hover:bg-indigo-50/50 group",
                          isSelected ? "bg-indigo-50 border-l-4 border-l-indigo-600" : "border-l-4 border-l-transparent"
                        )}
                      >
                        <td className="py-2.5 px-4">
                          <p className="text-[13px] font-mono text-zinc-600">
                            {new Date(log.occurredAt).toISOString().replace('T', ' ').substring(0, 19)}
                          </p>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-zinc-100 p-1 rounded-md text-zinc-500"><User className="h-3 w-3" /></div>
                            <span className="text-[13px] font-medium text-zinc-800 truncate max-w-[120px]">
                              {log.actorEmail || log.source}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                             <span className="text-[13px] font-semibold text-black group-hover:text-indigo-700 transition-colors">
                                {formatAction(log.action)}
                             </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[12px] text-zinc-500 truncate max-w-[200px]">
                          {log.entityType}{log.entityId ? `:${log.entityId}` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                           <div className="flex justify-center">
                              <Badge className={cn("px-2 py-0 h-6 text-[10px] font-bold uppercase", sevConfig.className)}>
                                <SevIcon className="h-3 w-3 mr-1" />
                                {sevConfig.label}
                              </Badge>
                           </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="shrink-0 p-3 bg-white border-t border-zinc-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="h-7 w-7 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Inspector Drawer */}
        <AnimatePresence>
          {detailLog && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-96 border-l border-zinc-200 bg-white flex flex-col shrink-0 shadow-2xl relative z-20"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                <h3 className="font-bold text-sm text-black flex items-center gap-2">
                  <Shield className="h-4 w-4 text-indigo-600" /> Event Inspector
                </h3>
                <button onClick={() => setDetailLog(null)} className="p-1 hover:bg-zinc-200 rounded-md transition-colors text-zinc-500">
                   <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                 
                 {/* Header Banner */}
                 <div className="space-y-1">
                    <p className="font-mono text-[10px] text-zinc-400">UID: {detailLog.log.id} • {new Date(detailLog.log.occurredAt).toISOString()}</p>
                    <h2 className="text-lg font-black text-black break-words leading-tight">{detailLog.actionLabel}</h2>
                 </div>

                 {/* Key Values */}
                 <div className="grid grid-cols-2 gap-3 pb-4 border-b border-zinc-100">
                    <div>
                       <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Severity</Label>
                       <div className={cn("mt-1 flex items-center gap-1.5 text-xs font-bold", SEVERITY_CONFIG[detailLog.log.severity]?.className?.split(" ")[1])}>
                          {React.createElement(SEVERITY_CONFIG[detailLog.log.severity]?.icon || Info, { className: "h-3.5 w-3.5" })}
                          {detailLog.severityLabel}
                       </div>
                    </div>
                    <div>
                       <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Actor</Label>
                       <p className="mt-1 text-xs font-medium text-black truncate" title={detailLog.log.actorEmail || "System"}>
                          {detailLog.log.actorEmail || "System"}
                       </p>
                    </div>
                    <div>
                       <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Resource Type</Label>
                       <p className="mt-1 font-mono text-[11px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md w-max border border-indigo-100">
                          {detailLog.log.entityType}
                       </p>
                    </div>
                    <div>
                       <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Resource ID</Label>
                       <p className="mt-1 font-mono text-[11px] text-zinc-700">{detailLog.log.entityId || "N/A"}</p>
                    </div>
                 </div>

                 {/* Description */}
                 {detailLog.log.description && (
                   <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg">
                      <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Context Message</Label>
                      <p className="text-sm font-medium text-zinc-800 mt-1">{detailLog.log.description}</p>
                   </div>
                 )}

                 {/* Delta Viewer */}
                 {(detailLog.log.diff || detailLog.log.oldValue || detailLog.log.newValue) && (
                   <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                         <Code className="h-3.5 w-3.5" /> Payload Delta
                      </Label>
                      
                      {detailLog.log.oldValue && (
                        <div className="border border-red-200 rounded-lg overflow-hidden flex flex-col">
                           <div className="bg-red-50 px-3 py-1.5 border-b border-red-100 flex items-center gap-1.5">
                              <XCircle className="h-3 w-3 text-red-600" />
                              <span className="text-[10px] font-bold text-red-800 uppercase tracking-widest">Before</span>
                           </div>
                           <pre className="p-3 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[11px] overflow-x-auto m-0 shadow-inner">
                              {formatJson(detailLog.log.oldValue)}
                           </pre>
                        </div>
                      )}
                      
                      {detailLog.log.newValue && (
                        <div className="border border-emerald-200 rounded-lg overflow-hidden flex flex-col mt-2">
                           <div className="bg-emerald-50 px-3 py-1.5 border-b border-emerald-100 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">After</span>
                           </div>
                           <pre className="p-3 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-[11px] overflow-x-auto m-0 shadow-inner">
                              {formatJson(detailLog.log.newValue)}
                           </pre>
                        </div>
                      )}
                   </div>
                 )}

                 {/* Metadata */}
                 {detailLog.log.metadata && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                         <Database className="h-3.5 w-3.5" /> System Metadata
                      </Label>
                      <pre className="p-3 bg-[#1e1e1e] text-[#d4d4d4] rounded-lg font-mono text-[11px] overflow-x-auto shadow-inner border border-zinc-800">
                        {formatJson(detailLog.log.metadata)}
                      </pre>
                    </div>
                 )}

                 {/* HTTP Request Details */}
                 {(detailLog.log.requestId || detailLog.log.sessionId) && (
                    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                       <Label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Network Trace</Label>
                       <div className="space-y-1">
                          {detailLog.log.requestId && (
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-zinc-100 shadow-sm">
                               <span className="text-[10px] font-bold text-zinc-400 uppercase">Request ID</span>
                               <span className="text-[10px] font-mono text-zinc-600">{detailLog.log.requestId}</span>
                            </div>
                          )}
                          {detailLog.log.sessionId && (
                            <div className="flex justify-between items-center bg-white p-1.5 rounded border border-zinc-100 shadow-sm">
                               <span className="text-[10px] font-bold text-zinc-400 uppercase">Session ID</span>
                               <span className="text-[10px] font-mono text-zinc-600">{detailLog.log.sessionId}</span>
                            </div>
                          )}
                       </div>
                    </div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
