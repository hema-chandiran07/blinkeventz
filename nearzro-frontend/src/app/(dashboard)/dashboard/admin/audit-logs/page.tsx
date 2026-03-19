"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Activity, Shield, User, Calendar, Download, Search, Eye, CheckCircle2, XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const AUDIT_LOGS = [
  { id: 1, action: "USER_LOGIN", user: "admin@NearZro.com", role: "ADMIN", ip: "192.168.1.100", timestamp: "2024-03-15 14:30:25", status: "SUCCESS" },
  { id: 2, action: "VENUE_APPROVED", user: "admin@NearZro.com", role: "ADMIN", ip: "192.168.1.100", timestamp: "2024-03-15 13:45:10", status: "SUCCESS" },
  { id: 3, action: "PAYMENT_PROCESSED", user: "system", role: "SYSTEM", ip: "10.0.0.1", timestamp: "2024-03-15 12:20:45", status: "SUCCESS" },
  { id: 4, action: "USER_LOGIN", user: "rajesh@email.com", role: "CUSTOMER", ip: "192.168.1.150", timestamp: "2024-03-15 11:15:30", status: "FAILED" },
  { id: 5, action: "VENDOR_VERIFIED", user: "admin@NearZro.com", role: "ADMIN", ip: "192.168.1.100", timestamp: "2024-03-15 10:05:15", status: "SUCCESS" },
  { id: 6, action: "EVENT_CREATED", user: "rajesh@email.com", role: "CUSTOMER", ip: "192.168.1.150", timestamp: "2024-03-15 09:30:00", status: "SUCCESS" },
  { id: 7, action: "PASSWORD_RESET", user: "anita@email.com", role: "VENDOR", ip: "192.168.1.175", timestamp: "2024-03-15 08:45:20", status: "SUCCESS" },
  { id: 8, action: "USER_LOGIN", user: "unknown@email.com", role: "UNKNOWN", ip: "203.0.113.50", timestamp: "2024-03-15 07:20:10", status: "FAILED" },
];

const ACTION_ICONS: Record<string, any> = {
  USER_LOGIN: User,
  VENUE_APPROVED: CheckCircle2,
  PAYMENT_PROCESSED: Activity,
  VENDOR_VERIFIED: CheckCircle2,
  EVENT_CREATED: Calendar,
  PASSWORD_RESET: Shield,
};

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
};

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const stats = {
    totalLogs: 1247,
    successful: 1189,
    failed: 58,
    uniqueUsers: 342,
  };

  const filteredLogs = AUDIT_LOGS.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesRole = filterRole === "all" || log.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const handleExport = async () => {
    try {
      console.log("Exporting audit logs...");
      // Generate CSV from mock data
      const csvContent = AUDIT_LOGS.map(log => 
        `${log.id},${log.action},${log.user},${log.role},${log.ip},${log.timestamp},${log.status}`
      ).join('\n');
      const blob = new Blob([`ID,Action,User,Role,IP,Timestamp,Status\n${csvContent}`], { type: "text/csv" });
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

  const handleViewLog = async (id: number) => {
    try {
      console.log(`Viewing audit log ${id}`);
      toast.success("Log details loaded");
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      // TODO: Show log details in modal
    } catch (error: any) {
      console.error("View log error:", error);
      toast.error("Failed to load log details");
    }
  };

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
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm">
              <option value="all">All Status</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
            </select>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="flex h-10 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm">
              <option value="all">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="CUSTOMER">Customer</option>
              <option value="VENDOR">Vendor</option>
              <option value="VENUE_OWNER">Venue Owner</option>
              <option value="SYSTEM">System</option>
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
                      <td className="py-3 px-4 text-sm text-black">{log.user}</td>
                      <td className="py-3 px-4">
                        <Badge className="bg-neutral-100 text-black border-neutral-300 text-xs">{log.role}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm font-mono text-black">{log.ip}</td>
                      <td className="py-3 px-4 text-sm text-black">{log.timestamp}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${STATUS_COLORS[log.status]} border text-xs`}>{log.status}</Badge>
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
