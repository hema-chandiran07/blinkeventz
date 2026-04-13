"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Shield, AlertCircle, CheckCircle, Info,
  Calendar, Clock, User, FileText, Download, Trash2, X, Loader2
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

interface AuditLog {
  id: number;
  actorId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  oldValue: any | null;
  newValue: any | null;
  severity: string;
  source: string;
  occurredAt: string;
  metadata: any | null;
}

export default function AuditLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    loadLog();
  }, [params.id]);

  const loadLog = async () => {
    try {
      setLoading(true);
      // Note: Backend might not have individual log endpoint, using list with filter
      const response = await api.get("/audit", {
        params: { page: 1, limit: 100 }
      });
      const foundLog = response.data.find((l: any) => l.id === parseInt(params.id as string));
      if (foundLog) {
        setLog(foundLog);
      } else {
        toast.error("Audit log not found");
      }
    } catch (error: any) {
      console.error("Failed to load audit log:", error);
      toast.error("Failed to load audit log details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Loading audit log details...</p>
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-neutral-600">Audit log not found</p>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    const severityConfig: Record<string, string> = {
      LOW: "bg-blue-100 text-blue-700 border-blue-300",
      INFO: "bg-green-100 text-green-700 border-green-300",
      MEDIUM: "bg-amber-100 text-amber-700 border-amber-300",
      WARNING: "bg-orange-100 text-orange-700 border-orange-300",
      HIGH: "bg-red-100 text-red-700 border-red-300",
      CRITICAL: "bg-purple-100 text-purple-700 border-purple-300",
    };
    return severityConfig[severity] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "ADMIN":
        return <Shield className="h-5 w-5" />;
      case "USER":
        return <User className="h-5 w-5" />;
      case "SYSTEM":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/dashboard/admin/audit-logs")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-black">Audit Log Details</h1>
          <p className="text-neutral-600">Log ID: #{log.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-black">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Log
          </Button>
        </div>
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-2 border-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-neutral-600" />
              <div>
                <p className="text-sm font-medium text-neutral-600">Action</p>
                <p className="text-lg font-bold text-black">{log.action}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-neutral-600" />
              <div>
                <p className="text-sm font-medium text-neutral-600">Entity Type</p>
                <p className="text-lg font-bold text-black">{log.entityType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-neutral-600" />
              <div>
                <p className="text-sm font-medium text-neutral-600">Occurred At</p>
                <p className="text-sm font-bold text-black">
                  {new Date(log.occurredAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-black">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-neutral-600" />
              <div>
                <p className="text-sm font-medium text-neutral-600">Time</p>
                <p className="text-sm font-bold text-black">
                  {new Date(log.occurredAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Severity & Source */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle>Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-600">Severity</p>
              <Badge className={getSeverityBadge(log.severity)}>
                {log.severity}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-600">Source</p>
              <div className="flex items-center gap-2">
                {getSourceIcon(log.source)}
                <span className="font-semibold text-black">{log.source}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entity Info */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle>Entity Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-neutral-600">Entity Type</p>
              <p className="text-black">{log.entityType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Entity ID</p>
              <p className="text-black">{log.entityId !== null ? `#${log.entityId}` : "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-600">Actor ID</p>
              <p className="text-black">{log.actorId !== null ? `#${log.actorId}` : "System"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Old Value */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-red-600">Before</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {log.oldValue ? (
              <pre className="bg-neutral-100 p-4 rounded-lg overflow-auto max-h-64 text-sm">
                {JSON.stringify(log.oldValue, null, 2)}
              </pre>
            ) : (
              <p className="text-neutral-600 italic">No previous value</p>
            )}
          </CardContent>
        </Card>

        {/* New Value */}
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-600">After</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {log.newValue ? (
              <pre className="bg-neutral-100 p-4 rounded-lg overflow-auto max-h-64 text-sm">
                {JSON.stringify(log.newValue, null, 2)}
              </pre>
            ) : (
              <p className="text-neutral-600 italic">No new value</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      {log.metadata && (
        <Card className="border-2 border-black">
          <CardHeader>
            <CardTitle>Additional Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-neutral-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Timeline Visualization */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-300" />
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative pl-12 py-4"
            >
              <div className="absolute left-2 w-5 h-5 rounded-full bg-black border-4 border-white" />
              <p className="text-sm font-medium text-neutral-600">
                {new Date(log.occurredAt).toLocaleString()}
              </p>
              <p className="text-lg font-bold text-black mt-1">{log.action}</p>
              <p className="text-sm text-neutral-600 mt-1">
                {log.source} action on {log.entityType}
              </p>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button className="bg-black hover:bg-neutral-800">
          View Related Logs
        </Button>
        <Button variant="outline" className="border-black">
          Export to CSV
        </Button>
        <Button variant="outline" className="border-amber-600 text-amber-600 hover:bg-amber-50">
          Flag for Review
        </Button>
      </div>
    </div>
  );
}
