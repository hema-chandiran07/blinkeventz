"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity, Shield, User, Calendar, Download, Search, Eye, CheckCircle2, XCircle,
  AlertTriangle, AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight,
  Clock, Database, FileText, Code, Server, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  // Detail dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLogDetail | null>(null);

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
    if (!log) {
      toast.error("Log not found");
      return;
    }

    const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
    const srcConfig = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.SYSTEM;

    setDetailLog({
      log,
      actionLabel: formatAction(log.action),
      severityLabel: sevConfig.label,
      sourceLabel: srcConfig.label,
    });
    setDetailOpen(true);
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
    return matchesSearch && matchesSeverity;
  });

  // ==================== Stats ====================
  const stats = {
    totalLogs: logs.length,
    successful: logs.filter(l => l.severity === "INFO" || l.severity === "LOW").length,
    warnings: logs.filter(l => l.severity === "WARNING").length,
    failed: logs.filter(l => l.severity === "HIGH" || l.severity === "CRITICAL").length,
    uniqueActors: new Set(logs.map(l => l.actorEmail).filter(Boolean)).size,
  };

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
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  // ==================== Main Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-black">Audit Logs</h1>
          <p className="text-neutral-600">System activity and security logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadLogs(true)} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export Logs
          </Button>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-2 border-neutral-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Logs</p>
                <p className="text-3xl font-bold text-neutral-900 mt-1">{stats.totalLogs}</p>
              </div>
              <div className="p-3 rounded-full bg-neutral-900">
                <Activity className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Successful</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.successful}</p>
              </div>
              <div className="p-3 rounded-full bg-emerald-600">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-amber-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Warnings</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{stats.warnings}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-600">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Failed</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.failed}</p>
              </div>
              <div className="p-3 rounded-full bg-red-600">
                <XCircle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Unique Users</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.uniqueActors}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-600">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-2 border-black">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search by action, user, entity, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-neutral-300"
              />
            </div>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm text-black"
            >
              <option value="all">All Severity</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="text-black">
            <Shield className="h-5 w-5" />
            Recent Activity ({filteredLogs.length} logs)
          </CardTitle>
          <CardDescription>Showing audit log entries with full details</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-black mb-2">No audit logs found</h3>
              <p className="text-neutral-600">
                {searchTerm || filterSeverity !== "all" ? "Try adjusting your filters" : "No audit logs recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                    <tr>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Action</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">User</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Source</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Entity</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Timestamp</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Severity</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredLogs.map((log) => {
                      const Icon = ACTION_ICONS[log.action] || Activity;
                      const sevConfig = SEVERITY_CONFIG[log.severity] || SEVERITY_CONFIG.INFO;
                      const SevIcon = sevConfig.icon;
                      const srcConfig = SOURCE_CONFIG[log.source] || SOURCE_CONFIG.SYSTEM;
                      const SrcIcon = srcConfig.icon;

                      return (
                        <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-neutral-400" />
                              <span className="text-sm font-medium text-black">{formatAction(log.action)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm text-black">{log.actorEmail || "System"}</p>
                              {log.actorId && <p className="text-xs text-neutral-500">ID: {log.actorId}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <SrcIcon className="h-3 w-3 text-neutral-500" />
                              <span className="text-sm text-black">{srcConfig.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm text-black">{log.entityType}</p>
                              {log.entityId && <p className="text-xs text-neutral-500">ID: {log.entityId}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-sm text-black">{new Date(log.occurredAt).toLocaleDateString("en-IN")}</p>
                              <p className="text-xs text-neutral-500">{new Date(log.occurredAt).toLocaleTimeString("en-IN")}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${sevConfig.className} border text-xs`}>
                              <SevIcon className="h-3 w-3 mr-1" />
                              {sevConfig.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-black hover:bg-neutral-100"
                              onClick={() => handleViewLog(log.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <p className="text-sm text-neutral-600">Page {page}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col text-black">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-black">
              <Shield className="h-5 w-5" />
              Audit Log Details
            </DialogTitle>
            <DialogDescription className="text-neutral-600">
              Log #{detailLog?.log.id}
            </DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-6 py-4 overflow-y-auto flex-1">
              {/* Action & Severity */}
              <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-lg border">
                {(() => {
                  const ActionIcon = ACTION_ICONS[detailLog.log.action] || Activity;
                  return <ActionIcon className="h-8 w-8 text-neutral-600" />;
                })()}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-black">{detailLog.actionLabel}</h3>
                  <p className="text-sm text-neutral-600 mt-1">{detailLog.log.description || "No description provided"}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className={cn(
                      "text-xs",
                      SEVERITY_CONFIG[detailLog.log.severity]?.className || SEVERITY_CONFIG.INFO.className
                    )}>
                      {detailLog.severityLabel}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-black">{detailLog.sourceLabel}</Badge>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs font-medium text-neutral-600 mb-1">Actor</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-neutral-500" />
                    <p className="text-sm text-black">{detailLog.log.actorEmail || "System"}</p>
                  </div>
                  {detailLog.log.actorId && (
                    <p className="text-xs text-neutral-500 mt-1">Actor ID: {detailLog.log.actorId}</p>
                  )}
                  {detailLog.log.actorRole && (
                    <p className="text-xs text-neutral-500">Role: {detailLog.log.actorRole}</p>
                  )}
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs font-medium text-neutral-600 mb-1">Entity</p>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-neutral-500" />
                    <p className="text-sm text-black">{detailLog.log.entityType}</p>
                  </div>
                  {detailLog.log.entityId && (
                    <p className="text-xs text-neutral-500 mt-1">Entity ID: {detailLog.log.entityId}</p>
                  )}
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs font-medium text-neutral-600 mb-1">Timestamp</p>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-neutral-500" />
                    <p className="text-sm text-black">{new Date(detailLog.log.occurredAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs font-medium text-neutral-600 mb-1">Request Info</p>
                  <div className="space-y-1">
                    {detailLog.log.requestId && (
                      <p className="text-xs text-neutral-600">Request: <code className="text-xs bg-neutral-200 px-1 rounded">{detailLog.log.requestId}</code></p>
                    )}
                    {detailLog.log.sessionId && (
                      <p className="text-xs text-neutral-600">Session: <code className="text-xs bg-neutral-200 px-1 rounded">{detailLog.log.sessionId}</code></p>
                    )}
                    {detailLog.log.traceId && (
                      <p className="text-xs text-neutral-600">Trace: <code className="text-xs bg-neutral-200 px-1 rounded">{detailLog.log.traceId}</code></p>
                    )}
                    {!detailLog.log.requestId && !detailLog.log.sessionId && !detailLog.log.traceId && (
                      <p className="text-xs text-neutral-400">No request info available</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {detailLog.log.metadata && (
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Metadata
                  </p>
                  <pre className="text-xs bg-neutral-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-48">
                    {formatJson(detailLog.log.metadata)}
                  </pre>
                </div>
              )}

              {/* Diff */}
              {detailLog.log.diff && (
                <div>
                  <p className="text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Diff
                  </p>
                  <pre className="text-xs bg-neutral-900 text-yellow-400 p-4 rounded-lg overflow-x-auto max-h-48">
                    {formatJson(detailLog.log.diff)}
                  </pre>
                </div>
              )}

              {/* Old / New Values */}
              {(detailLog.log.oldValue || detailLog.log.newValue) && (
                <div className="grid grid-cols-2 gap-4">
                  {detailLog.log.oldValue && (
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Old Value
                      </p>
                      <pre className="text-xs bg-red-50 text-red-800 p-4 rounded-lg border border-red-200 overflow-x-auto max-h-48">
                        {formatJson(detailLog.log.oldValue)}
                      </pre>
                    </div>
                  )}
                  {detailLog.log.newValue && (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        New Value
                      </p>
                      <pre className="text-xs bg-green-50 text-green-800 p-4 rounded-lg border border-green-200 overflow-x-auto max-h-48">
                        {formatJson(detailLog.log.newValue)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* Sensitive Flag */}
              {detailLog.log.isSensitive && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-800 font-medium">Sensitive Log</p>
                  </div>
                  <p className="text-xs text-amber-700 mt-1">This log entry contains sensitive information. Handle with care.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
