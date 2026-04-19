"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Settings, Save, Loader2, RefreshCw, Shield, Key, Bell, Database,
  CheckCircle2, AlertCircle, Eye, EyeOff, Lock, Globe, Mail, Phone,
  CreditCard, Cloud, Activity, Users, TrendingUp, Zap
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";

// ==================== Types ====================
interface FeatureFlagItem {
  key: string;
  value: boolean;
  description?: string;
  id: number;
}

interface IntegrationItem {
  key: string;
  value: {
    enabled: boolean;
    keyId?: string;
    keySecret?: string;
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
    accessKey?: string;
    secretKey?: string;
    bucket?: string;
    region?: string;
    model?: string;
  };
  id: number;
}

interface SecurityItem {
  key: string;
  value: {
    enabled?: boolean;
    minutes?: number;
    attempts?: number;
    length?: number;
    max?: number;
    window?: number;
  };
  id: number;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalVenues: number;
  totalVendors: number;
  totalBookings: number;
  totalRevenue: number;
  systemUptime: string;
  lastBackup: string;
}

interface KernelMetadata {
  version: string;
  nodeVersion: string;
  platform: string;
  osRelease: string;
  totalMemory: string;
  freeMemory: string;
  uptime: string;
  environment: string;
  database: string;
  cache: string;
  timestamp: string;
}

// ==================== Main Component ====================
export default function AdminSystemSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"features" | "integrations" | "security" | "system">("features");

  // Feature flags state - maps to backend FEATURE_* keys
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({
    NEW_DASHBOARD: false,
    AI_PLANNING: false,
    EXPRESS_BOOKING: false,
    AUTO_APPROVE_VENUES: false,
    MAINTENANCE_MODE: false,
  });

  // Integration state - maps to backend INTEGRATION_* keys
  const [integrations, setIntegrations] = useState<Record<string, any>>({
    RAZORPAY: { enabled: false, keyId: "", keySecret: "" },
    SENDGRID: { enabled: false, apiKey: "" },
    TWILIO: { enabled: false, accountSid: "", authToken: "", fromNumber: "" },
    GOOGLE_OAUTH: { enabled: false, clientId: "", clientSecret: "" },
    OPENAI: { enabled: false, apiKey: "", model: "gpt-4o-mini" },
  });

  // Security state - maps to backend SECURITY_* keys
  const [security, setSecurity] = useState<Record<string, any>>({
    MFA_REQUIRED: { enabled: false },
    SESSION_TIMEOUT: { minutes: 30 },
    MAX_LOGIN_ATTEMPTS: { attempts: 5 },
    PASSWORD_MIN_LENGTH: { length: 8 },
    RATE_LIMITING: { enabled: true },
    RATE_LIMIT_MAX: { max: 100 },
    RATE_LIMIT_WINDOW: { window: 60 },
  });

  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [kernelMetadata, setKernelMetadata] = useState<KernelMetadata | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  
  // System fees state
  const [expressFee, setExpressFee] = useState<number>(500);
  const [platformFeePercent, setPlatformFeePercent] = useState<number>(2);
  const [gstPercent, setGstPercent] = useState<number>(18);
  const [isSavingFee, setIsSavingFee] = useState(false);

  // Valid feature flag keys
  const VALID_FEATURE_KEYS = [
    'NEW_DASHBOARD',
    'AI_PLANNING', 
    'EXPRESS_BOOKING',
    'AUTO_APPROVE_VENUES',
    'MAINTENANCE_MODE',
  ];

  // ==================== Load Settings from Backend ====================
  const loadSettings = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      // Load all settings in one call
      const response = await api.get("/settings", { signal });
      const data = response.data;

      // Parse feature flags - ONLY valid keys
      if (data?.featureFlags && Array.isArray(data.featureFlags)) {
        const flags: Record<string, boolean> = { ...featureFlags };
        data.featureFlags.forEach((flag: FeatureFlagItem) => {
          const key = flag.key.replace("FEATURE_", "");
          if (VALID_FEATURE_KEYS.includes(key)) {
            flags[key] = Boolean(flag.value);
          }
        });
        setFeatureFlags(flags);
      }

      // Parse integrations
      if (data?.integrations && Array.isArray(data.integrations)) {
        const ints: Record<string, any> = {};
        data.integrations.forEach((item: IntegrationItem) => {
          const key = item.key.replace("INTEGRATION_", "");
          ints[key] = item.value;
        });
        if (Object.keys(ints).length > 0) {
          setIntegrations(prev => ({ ...prev, ...ints }));
        }
      }

      // Parse security settings
      if (data?.security && Array.isArray(data.security)) {
        const secs: Record<string, any> = {};
        data.security.forEach((item: SecurityItem) => {
          const key = item.key.replace("SECURITY_", "");
          secs[key] = item.value;
        });
        if (Object.keys(secs).length > 0) {
          setSecurity(prev => ({ ...prev, ...secs }));
        }
      }

      // Load system stats
      try {
        const statsRes = await api.get("/dashboard/admin/stats", { signal });
        if (statsRes.data) {
          setSystemStats(statsRes.data);
        }

        // Load kernel info
        const kernelRes = await api.get("/settings/kernel", { signal });
        if (kernelRes.data) {
          setKernelMetadata(kernelRes.data);
        }
      } catch (error) {
        console.warn("Could not load supplementary system diagnostics");
      }

      // Load EXPRESS_FEE from settings (stored in paise, convert to rupees)
      try {
        const expressFeeRes = await api.get("/settings/EXPRESS_FEE", { signal });
        if (expressFeeRes.data?.value) {
          setExpressFee(Number(expressFeeRes.data.value) / 100);
        }
      } catch (error) {
        console.warn("Could not load EXPRESS_FEE setting");
      }

      // Load PLATFORM_FEE_PERCENTAGE (stored as decimal, e.g., 0.02 = 2%)
      try {
        const platformFeeRes = await api.get("/settings/PLATFORM_FEE_PERCENTAGE", { signal });
        if (platformFeeRes.data?.value) {
          setPlatformFeePercent(Number(platformFeeRes.data.value) * 100);
        }
      } catch (error) {
        console.warn("Could not load PLATFORM_FEE_PERCENTAGE setting");
      }

      // Load GST_PERCENTAGE (stored as decimal, e.g., 0.18 = 18%)
      try {
        const gstRes = await api.get("/settings/TAX_PERCENTAGE", { signal });
        if (gstRes.data?.value) {
          setGstPercent(Number(gstRes.data.value) * 100);
        }
      } catch (error) {
        console.warn("Could not load TAX_PERCENTAGE setting");
      }
    } catch (error: any) {
      if (error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return;
      console.error("Failed to load settings:", error);
      toast.error(error?.response?.data?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "ADMIN") {
      router.push("/login");
      return;
    }
    const controller = new AbortController();
    loadSettings(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated, user, router, loadSettings]);

  // ==================== Save Feature Flags ====================
  const saveFeatureFlags = async () => {
    try {
      setSaving(true);
      await api.post("/settings/feature-flags", { flags: featureFlags });
      toast.success("Feature flags updated successfully!");
    } catch (error: any) {
      console.error("Failed to save feature flags:", error);
      toast.error(error?.response?.data?.message || "Failed to update feature flags");
    } finally {
      setSaving(false);
    }
  };

  // ==================== Save Integrations ====================
  const saveIntegrations = async () => {
    try {
      setSaving(true);
      await api.post("/settings/integrations", { integrations });
      toast.success("Integration settings updated successfully!");
    } catch (error: any) {
      console.error("Failed to save integrations:", error);
      toast.error(error?.response?.data?.message || "Failed to update integrations");
    } finally {
      setSaving(false);
    }
  };

  // ==================== Save Security Settings ====================
  const saveSecurity = async () => {
    try {
      setSaving(true);
      await api.post("/settings/security", { security });
      toast.success("Security settings updated successfully!");
    } catch (error: any) {
      console.error("Failed to save security settings:", error);
      toast.error(error?.response?.data?.message || "Failed to update security settings");
    } finally {
      setSaving(false);
    }
  };

  // ==================== Initialize Default Settings ====================
  const initializeDefaults = async () => {
    try {
      setSaving(true);
      await api.post("/settings/initialize");
      toast.success("Default settings initialized!");
      loadSettings();
    } catch (error: any) {
      console.error("Failed to initialize defaults:", error);
      toast.error(error?.response?.data?.message || "Failed to initialize defaults");
    } finally {
      setSaving(false);
    }
  };

  // ==================== Save Financial Settings ====================
  const saveFinancialSettings = async () => {
    try {
      setIsSavingFee(true);
      await api.post("/settings", {
        EXPRESS_FEE: Math.round(expressFee * 100), // Convert rupees to paise
        PLATFORM_FEE_PERCENTAGE: platformFeePercent / 100, // Convert % to decimal
        TAX_PERCENTAGE: gstPercent / 100, // Convert % to decimal
      });
      toast.success("Financial settings updated successfully!");
    } catch (error: any) {
      console.error("Failed to save financial settings:", error);
      toast.error(error?.response?.data?.message || "Failed to update settings");
    } finally {
      setIsSavingFee(false);
    }
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==================== Loading State ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-zinc-400" />
          <p className="text-zinc-400">Loading system settings...</p>
        </div>
      </div>
    );
  }

  // ==================== Main Render ====================
  return (
    <div className="space-y-8 p-6 bg-[#0a0a0b] text-white selection:bg-blue-500/30 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">
            Node <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">Infrastructure</span>
          </h1>
          <p className="text-zinc-500 font-medium">Core system protocols and integration matrix</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={initializeDefaults} disabled={saving}>
            <Settings className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => loadSettings()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* System Stats */}
      {systemStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 md:grid-cols-4"
        >
          <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">System Identities</p>
                  <p className="text-3xl font-black text-white mt-1">{systemStats.totalUsers || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Sessions</p>
                  <p className="text-3xl font-black text-emerald-400 mt-1">{systemStats.activeUsers || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Revenue</p>
                  <p className="text-3xl font-black text-amber-400 mt-1">₹{(systemStats.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">System Availability</p>
                  <p className="text-3xl font-black text-white mt-1">{systemStats.systemUptime || "99.9%"}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Zap className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-zinc-900/50 border border-zinc-800 p-1 h-14 rounded-2xl">
          <TabsTrigger value="features" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-zinc-500 transition-all font-bold uppercase tracking-tighter text-[10px]">
            <Zap className="h-4 w-4" />
            Protocols
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-zinc-500 transition-all font-bold uppercase tracking-tighter text-[10px]">
            <Cloud className="h-4 w-4" />
            Uplinks
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-zinc-500 transition-all font-bold uppercase tracking-tighter text-[10px]">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-zinc-800 data-[state=active]:text-blue-400 text-zinc-500 transition-all font-bold uppercase tracking-tighter text-[10px]">
            <Database className="h-4 w-4" />
            Kernel
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feature Flags Tab */}
      {activeTab === "features" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-zinc-900/40 border-zinc-800 shadow-2xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                Operational Protocols
              </CardTitle>
              <CardDescription className="text-zinc-500 font-medium">Enable or disable platform functional modules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {Object.entries(featureFlags).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group">
                    <div>
                      <p className="font-bold text-zinc-200 capitalize tracking-tight group-hover:text-white">
                        {key.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-xs text-zinc-500 font-medium mt-1">
                        {key === 'MAINTENANCE_MODE' ? 'Put the entire platform in maintenance mode' :
                         key === 'AI_PLANNING' ? 'Enable AI-powered event planning assistant' :
                         key === 'EXPRESS_BOOKING' ? 'Allow quick booking without full registration' :
                         key === 'AUTO_APPROVE_VENUES' ? 'Automatically approve new venue submissions' :
                         key === 'NEW_DASHBOARD' ? 'Use the new dashboard design' :
                         'Platform feature toggle'}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      className="data-[state=checked]:bg-blue-600"
                      onCheckedChange={(checked) =>
                        setFeatureFlags(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>

              {featureFlags.MAINTENANCE_MODE && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-bold text-red-400 uppercase tracking-tighter text-xs">MAINTENANCE_MODE_ACTIVE</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Users will see a maintenance page. Only identities with administrative clearance can access the platform.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                onClick={saveFeatureFlags} 
                disabled={saving} 
                className="w-full h-12 bg-white text-black font-black hover:bg-zinc-200 shadow-xl shadow-white/5 transition-all rounded-xl"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Commit Protocol Changes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Razorpay */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-zinc-400" />
                Razorpay Payment Gateway
              </CardTitle>
              <CardDescription className="text-zinc-500">Configure payment processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Enable Razorpay</Label>
                <Switch
                  checked={integrations.RAZORPAY?.enabled || false}
                  onCheckedChange={(checked) =>
                    setIntegrations(prev => ({
                      ...prev,
                      RAZORPAY: { ...prev.RAZORPAY, enabled: checked }
                    }))
                  }
                />
              </div>
              {integrations.RAZORPAY?.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Key ID</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.razorpayKey ? "text" : "password"}
                        value={integrations.RAZORPAY?.keyId || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          RAZORPAY: { ...prev.RAZORPAY, keyId: e.target.value }
                        }))}
                        placeholder="rzp_live_xxxxx"
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("razorpayKey")}>
                        {showSecrets.razorpayKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Key Secret</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.razorpaySecret ? "text" : "password"}
                        value={integrations.RAZORPAY?.keySecret || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          RAZORPAY: { ...prev.RAZORPAY, keySecret: e.target.value }
                        }))}
                        placeholder="Enter secret key"
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("razorpaySecret")}>
                        {showSecrets.razorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SendGrid */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Mail className="h-5 w-5 text-zinc-400" />
                SendGrid Email Service
              </CardTitle>
              <CardDescription className="text-zinc-500">Configure transactional emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Enable SendGrid</Label>
                <Switch
                  checked={integrations.SENDGRID?.enabled || false}
                  onCheckedChange={(checked) =>
                    setIntegrations(prev => ({
                      ...prev,
                      SENDGRID: { ...prev.SENDGRID, enabled: checked }
                    }))
                  }
                />
              </div>
              {integrations.SENDGRID?.enabled && (
                <div>
                  <Label className="text-zinc-300">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type={showSecrets.sendgrid ? "text" : "password"}
                      value={integrations.SENDGRID?.apiKey || ""}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        SENDGRID: { ...prev.SENDGRID, apiKey: e.target.value }
                      }))}
                      placeholder="SG.xxxxx"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                    <Button variant="outline" size="icon" onClick={() => toggleSecret("sendgrid")}>
                      {showSecrets.sendgrid ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Twilio */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Phone className="h-5 w-5 text-zinc-400" />
                Twilio SMS & WhatsApp
              </CardTitle>
              <CardDescription className="text-zinc-500">Configure SMS and WhatsApp notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Enable Twilio</Label>
                <Switch
                  checked={integrations.TWILIO?.enabled || false}
                  onCheckedChange={(checked) =>
                    setIntegrations(prev => ({
                      ...prev,
                      TWILIO: { ...prev.TWILIO, enabled: checked }
                    }))
                  }
                />
              </div>
              {integrations.TWILIO?.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">Account SID</Label>
                    <Input
                      value={integrations.TWILIO?.accountSid || ""}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        TWILIO: { ...prev.TWILIO, accountSid: e.target.value }
                      }))}
                      placeholder="ACxxxxx"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Auth Token</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.twilio ? "text" : "password"}
                        value={integrations.TWILIO?.authToken || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          TWILIO: { ...prev.TWILIO, authToken: e.target.value }
                        }))}
                        placeholder="Enter auth token"
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("twilio")}>
                        {showSecrets.twilio ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300">From Number</Label>
                    <Input
                      value={integrations.TWILIO?.fromNumber || ""}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        TWILIO: { ...prev.TWILIO, fromNumber: e.target.value }
                      }))}
                      placeholder="+1234567890"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Zap className="h-5 w-5 text-zinc-400" />
                OpenAI Integration
              </CardTitle>
              <CardDescription className="text-zinc-500">Configure AI-powered features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-zinc-300">Enable OpenAI</Label>
                <Switch
                  checked={integrations.OPENAI?.enabled || false}
                  onCheckedChange={(checked) =>
                    setIntegrations(prev => ({
                      ...prev,
                      OPENAI: { ...prev.OPENAI, enabled: checked }
                    }))
                  }
                />
              </div>
              {integrations.OPENAI?.enabled && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-zinc-300">API Key</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.openai ? "text" : "password"}
                        value={integrations.OPENAI?.apiKey || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          OPENAI: { ...prev.OPENAI, apiKey: e.target.value }
                        }))}
                        placeholder="sk-proj-xxxxx"
                        className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("openai")}>
                        {showSecrets.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-zinc-300">Model</Label>
                    <Input
                      value={integrations.OPENAI?.model || "gpt-4o-mini"}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        OPENAI: { ...prev.OPENAI, model: e.target.value }
                      }))}
                      placeholder="gpt-4o-mini"
                      className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={saveIntegrations} disabled={saving} className="w-full h-12 text-white">
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Integration Settings
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Security Tab */}
      {activeTab === "security" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Shield className="h-5 w-5 text-zinc-400" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-zinc-500">Configure platform security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800/30">
                  <div>
                    <p className="font-medium text-zinc-100">Require MFA</p>
                    <p className="text-sm text-zinc-400">Force multi-factor authentication</p>
                  </div>
                  <Switch
                    checked={security.MFA_REQUIRED?.enabled || false}
                    onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, MFA_REQUIRED: { enabled: checked } }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800/30">
                  <div>
                    <p className="font-medium text-zinc-100">Enable Rate Limiting</p>
                    <p className="text-sm text-zinc-400">Prevent API abuse</p>
                  </div>
                  <Switch
                    checked={security.RATE_LIMITING?.enabled || false}
                    onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, RATE_LIMITING: { enabled: checked } }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-zinc-300">Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={security.SESSION_TIMEOUT?.minutes || 30}
                    onChange={(e) => setSecurity(prev => ({ ...prev, SESSION_TIMEOUT: { minutes: parseInt(e.target.value) || 30 } }))}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={security.MAX_LOGIN_ATTEMPTS?.attempts || 5}
                    onChange={(e) => setSecurity(prev => ({ ...prev, MAX_LOGIN_ATTEMPTS: { attempts: parseInt(e.target.value) || 5 } }))}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
                <div>
                  <Label className="text-zinc-300">Password Min Length</Label>
                  <Input
                    type="number"
                    value={security.PASSWORD_MIN_LENGTH?.length || 8}
                    onChange={(e) => setSecurity(prev => ({ ...prev, PASSWORD_MIN_LENGTH: { length: parseInt(e.target.value) || 8 } }))}
                    className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                  />
                </div>
              </div>

              {security.RATE_LIMITING?.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-zinc-300">Rate Limit Max Requests</Label>
                    <Input
                      type="number"
                      value={security.RATE_LIMIT_MAX?.max || 100}
                      onChange={(e) => setSecurity(prev => ({ ...prev, RATE_LIMIT_MAX: { max: parseInt(e.target.value) || 100 } }))}
                      className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-300">Rate Limit Window (seconds)</Label>
                    <Input
                      type="number"
                      value={security.RATE_LIMIT_WINDOW?.window || 60}
                      onChange={(e) => setSecurity(prev => ({ ...prev, RATE_LIMIT_WINDOW: { window: parseInt(e.target.value) || 60 } }))}
                      className="mt-1 bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>
                </div>
              )}

              <Button onClick={saveSecurity} disabled={saving} className="w-full h-12 text-white">
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Security Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* System Tab */}
      {activeTab === "system" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Financial Settings Card */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Global Financial Settings
              </CardTitle>
              <CardDescription className="text-zinc-500">Configure platform fees, taxes, and booking charges</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-zinc-300">Platform Fee (%)</Label>
                  <Input
                    type="number"
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(parseFloat(e.target.value) || 0)}
                    placeholder="2"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Applied to subtotal + express fee</p>
                </div>
                <div>
                  <Label className="text-zinc-300">GST (%)</Label>
                  <Input
                    type="number"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)}
                    placeholder="18"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Applied to subtotal + platform fee</p>
                </div>
                <div>
                  <Label className="text-zinc-300">Express Booking Fee (₹)</Label>
                  <Input
                    type="number"
                    value={expressFee}
                    onChange={(e) => setExpressFee(parseFloat(e.target.value) || 0)}
                    placeholder="500"
                    className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Priority processing charge</p>
                </div>
              </div>
              <Button
                onClick={saveFinancialSettings}
                disabled={isSavingFee}
                className="w-full mt-4 bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                {isSavingFee ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Financial Settings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-zinc-100 flex items-center gap-2">
                <Database className="h-5 w-5 text-zinc-400" />
                System Information
              </CardTitle>
              <CardDescription className="text-zinc-500">Platform status and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Platform Version</p>
                  <p className="font-medium text-zinc-100">{kernelMetadata?.version || "v2.0.0"}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Environment</p>
                  <p className="font-medium text-zinc-100 capitalize">{kernelMetadata?.environment || "Production"}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Node Engine</p>
                  <p className="font-medium text-zinc-100">{kernelMetadata?.nodeVersion || "v20.x"}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Platform OS</p>
                  <p className="font-medium text-zinc-100 uppercase">{kernelMetadata?.platform} {kernelMetadata?.osRelease}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">Memory Load (Free/Total)</p>
                  <p className="font-medium text-zinc-100">{kernelMetadata?.freeMemory} / {kernelMetadata?.totalMemory}</p>
                </div>
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400">System Uptime</p>
                  <p className="font-medium text-zinc-100">{kernelMetadata?.uptime}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <p className="font-medium text-emerald-300">All Systems Operational</p>
                    <p className="text-sm text-emerald-500">All services are running normally</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
