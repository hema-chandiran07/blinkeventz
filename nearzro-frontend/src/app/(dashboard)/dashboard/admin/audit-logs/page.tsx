"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity, Shield, User, Calendar, Download, Search, Eye, CheckCircle2, XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api";

interface AuditLog {
  id: number;
  action: string;
  actorEmail?: string;
  actorRole?: string;
  source: string;
  severity: string;
  entityType: string;
  description?: string;
  occurredAt: string;
}

const ACTION_ICONS: Record<string, any> = {
  USER_LOGIN: User,
  VENUE_APPROVED: CheckCircle2,
  PAYMENT_PROCESSED: Activity,
  VENDOR_VERIFIED: CheckCircle2,
  EVENT_CREATED: Calendar,
  PASSWORD_RESET: Shield,
};

const STATUS_COLORS: Record<string, string> = {
  INFO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-red-50 text-red-700 border-red-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-300",
  LOW: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await api.get("/audit");
      const logs = response.data || [];
      setAuditLogs(logs);
    } catch (error: any) {
      console.error("Failed to load audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.actorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.entityType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = filterSeverity === "all" || log.severity === filterSeverity;
    return matchesSearch && matchesSeverity;
  });

  const stats = {
    totalLogs: auditLogs.length,
    successful: auditLogs.filter(l => l.severity === "INFO" || l.severity === "LOW").length,
    failed: auditLogs.filter(l => l.severity === "HIGH" || l.severity === "CRITICAL").length,
    uniqueUsers: new Set(auditLogs.map(l => l.actorEmail)).size,
  };

  const handleExport = async () => {
    try {
      const csvContent = auditLogs.map(log =>
        `${log.id},${log.action || ''},${log.actorEmail || ''},${log.actorRole || ''},${log.severity},${log.entityType},${log.occurredAt}`
      ).join('\n');
      const blob = new Blob([`ID,Action,User,Role,Severity,Entity,Timestamp\n${csvContent}`], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Audit logs exported successfully!");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to export audit logs");
    }
  };

  const handleViewLog = async (logId: number) => {
    try {
      const log = auditLogs.find(l => l.id === logId);
      if (log) {
        toast.info(`Viewing log: ${log.action}`);
      }
    } catch (error: any) {
      console.error("Failed to view log:", error);
      toast.error("Failed to view log details");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600">Loading audit logs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Audit Logs</h1>
          <p className="text-neutral-600">System activity and security logs</p>
        </div>
        <Button variant="outline" className="border-black hover:bg-neutral-100" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Logs
        </Button>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
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
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.uniqueUsers}</p>
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
              <Input placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 border-neutral-300" />
            </div>
            <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm">
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
          <CardTitle className="text-black flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 border-b-2 border-neutral-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Action</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">User</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Role</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">IP Address</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Timestamp</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-neutral-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredLogs.map((log) => {
                  const Icon = ACTION_ICONS[log.action] || Activity;
                  return (
                    <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm font-medium text-black">{log.action.replace("_", " ")}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-black">{log.actorEmail || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-neutral-100 text-black border-neutral-300 text-xs">{log.actorRole || log.source}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-black">{log.entityType}</td>
                      <td className="py-3 px-4 text-sm text-black">{new Date(log.occurredAt).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${STATUS_COLORS[log.severity]} border text-xs`}>{log.severity}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" className="text-black hover:bg-neutral-100" onClick={() => handleViewLog(log.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
