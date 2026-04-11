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
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Valid feature flag keys
  const VALID_FEATURE_KEYS = [
    'NEW_DASHBOARD',
    'AI_PLANNING', 
    'EXPRESS_BOOKING',
    'AUTO_APPROVE_VENUES',
    'MAINTENANCE_MODE',
  ];

  // ==================== Load Settings from Backend ====================
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Load all settings in one call
      const response = await api.get("/settings");
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
        const statsRes = await api.get("/dashboard/admin/stats");
        if (statsRes.data) {
          setSystemStats(statsRes.data);
        }
      } catch (error) {
        console.warn("Could not load system stats");
      }
    } catch (error: any) {
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
    loadSettings();
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
      await api.post("/settings/security", security);
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

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==================== Loading State ====================
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-neutral-400" />
          <p className="text-neutral-600">Loading system settings...</p>
        </div>
      </div>
    );
  }

  // ==================== Main Render ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-black">System Settings</h1>
          <p className="text-neutral-600">Configure platform features, integrations, and security</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={initializeDefaults} disabled={saving}>
            <Settings className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={loadSettings}>
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
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Users</p>
                  <p className="text-3xl font-bold text-black mt-1">{systemStats.totalUsers || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Active Users</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{systemStats.activeUsers || 0}</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-black mt-1">₹{(systemStats.totalRevenue || 0).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">System Uptime</p>
                  <p className="text-3xl font-bold text-black mt-1">{systemStats.systemUptime || "99.9%"}</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Zap className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Feature Flags Tab */}
      {activeTab === "features" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <Zap className="h-5 w-5" />
                Feature Flags
              </CardTitle>
              <CardDescription className="text-neutral-600">Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                {Object.entries(featureFlags).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                    <div>
                      <p className="font-medium text-black capitalize">
                        {key.replace(/_/g, ' ').toLowerCase()}
                      </p>
                      <p className="text-sm text-neutral-600">
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
                      onCheckedChange={(checked) =>
                        setFeatureFlags(prev => ({ ...prev, [key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>

              {featureFlags.MAINTENANCE_MODE && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-900">Maintenance Mode Active</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Users will see a maintenance page. Only admins can access the platform.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={saveFeatureFlags} disabled={saving} className="w-full h-12 text-white">
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 mr-2" />
                    Save Feature Flags
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
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <CreditCard className="h-5 w-5" />
                Razorpay Payment Gateway
              </CardTitle>
              <CardDescription className="text-neutral-600">Configure payment processing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-black">Enable Razorpay</Label>
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
                    <Label className="text-black">Key ID</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.razorpayKey ? "text" : "password"}
                        value={integrations.RAZORPAY?.keyId || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          RAZORPAY: { ...prev.RAZORPAY, keyId: e.target.value }
                        }))}
                        placeholder="rzp_live_xxxxx"
                        className="text-black"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("razorpayKey")}>
                        {showSecrets.razorpayKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-black">Key Secret</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.razorpaySecret ? "text" : "password"}
                        value={integrations.RAZORPAY?.keySecret || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          RAZORPAY: { ...prev.RAZORPAY, keySecret: e.target.value }
                        }))}
                        placeholder="Enter secret key"
                        className="text-black"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <Mail className="h-5 w-5" />
                SendGrid Email Service
              </CardTitle>
              <CardDescription className="text-neutral-600">Configure transactional emails</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-black">Enable SendGrid</Label>
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
                  <Label className="text-black">API Key</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type={showSecrets.sendgrid ? "text" : "password"}
                      value={integrations.SENDGRID?.apiKey || ""}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        SENDGRID: { ...prev.SENDGRID, apiKey: e.target.value }
                      }))}
                      placeholder="SG.xxxxx"
                      className="text-black"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <Phone className="h-5 w-5" />
                Twilio SMS & WhatsApp
              </CardTitle>
              <CardDescription className="text-neutral-600">Configure SMS and WhatsApp notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-black">Enable Twilio</Label>
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
                    <Label className="text-black">Account SID</Label>
                    <Input
                      value={integrations.TWILIO?.accountSid || ""}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        TWILIO: { ...prev.TWILIO, accountSid: e.target.value }
                      }))}
                      placeholder="ACxxxxx"
                      className="text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black">Auth Token</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.twilio ? "text" : "password"}
                        value={integrations.TWILIO?.authToken || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          TWILIO: { ...prev.TWILIO, authToken: e.target.value }
                        }))}
                        placeholder="Enter auth token"
                        className="text-black"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("twilio")}>
                        {showSecrets.twilio ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-black">From Number</Label>
                    <Input
                      value={integrations.TWILIO?.fromNumber || ""}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        TWILIO: { ...prev.TWILIO, fromNumber: e.target.value }
                      }))}
                      placeholder="+1234567890"
                      className="text-black"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <Zap className="h-5 w-5" />
                OpenAI Integration
              </CardTitle>
              <CardDescription className="text-neutral-600">Configure AI-powered features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-black">Enable OpenAI</Label>
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
                    <Label className="text-black">API Key</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showSecrets.openai ? "text" : "password"}
                        value={integrations.OPENAI?.apiKey || ""}
                        onChange={(e) => setIntegrations(prev => ({
                          ...prev,
                          OPENAI: { ...prev.OPENAI, apiKey: e.target.value }
                        }))}
                        placeholder="sk-proj-xxxxx"
                        className="text-black"
                      />
                      <Button variant="outline" size="icon" onClick={() => toggleSecret("openai")}>
                        {showSecrets.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-black">Model</Label>
                    <Input
                      value={integrations.OPENAI?.model || "gpt-4o-mini"}
                      onChange={(e) => setIntegrations(prev => ({
                        ...prev,
                        OPENAI: { ...prev.OPENAI, model: e.target.value }
                      }))}
                      placeholder="gpt-4o-mini"
                      className="text-black"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription className="text-neutral-600">Configure platform security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                  <div>
                    <p className="font-medium text-black">Require MFA</p>
                    <p className="text-sm text-neutral-600">Force multi-factor authentication</p>
                  </div>
                  <Switch
                    checked={security.MFA_REQUIRED?.enabled || false}
                    onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, MFA_REQUIRED: { enabled: checked } }))}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-neutral-200">
                  <div>
                    <p className="font-medium text-black">Enable Rate Limiting</p>
                    <p className="text-sm text-neutral-600">Prevent API abuse</p>
                  </div>
                  <Switch
                    checked={security.RATE_LIMITING?.enabled || false}
                    onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, RATE_LIMITING: { enabled: checked } }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-black">Session Timeout (minutes)</Label>
                  <Input
                    type="number"
                    value={security.SESSION_TIMEOUT?.minutes || 30}
                    onChange={(e) => setSecurity(prev => ({ ...prev, SESSION_TIMEOUT: { minutes: parseInt(e.target.value) || 30 } }))}
                    className="mt-1 text-black"
                  />
                </div>
                <div>
                  <Label className="text-black">Max Login Attempts</Label>
                  <Input
                    type="number"
                    value={security.MAX_LOGIN_ATTEMPTS?.attempts || 5}
                    onChange={(e) => setSecurity(prev => ({ ...prev, MAX_LOGIN_ATTEMPTS: { attempts: parseInt(e.target.value) || 5 } }))}
                    className="mt-1 text-black"
                  />
                </div>
                <div>
                  <Label className="text-black">Password Min Length</Label>
                  <Input
                    type="number"
                    value={security.PASSWORD_MIN_LENGTH?.length || 8}
                    onChange={(e) => setSecurity(prev => ({ ...prev, PASSWORD_MIN_LENGTH: { length: parseInt(e.target.value) || 8 } }))}
                    className="mt-1 text-black"
                  />
                </div>
              </div>

              {security.RATE_LIMITING?.enabled && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-black">Rate Limit Max Requests</Label>
                    <Input
                      type="number"
                      value={security.RATE_LIMIT_MAX?.max || 100}
                      onChange={(e) => setSecurity(prev => ({ ...prev, RATE_LIMIT_MAX: { max: parseInt(e.target.value) || 100 } }))}
                      className="mt-1 text-black"
                    />
                  </div>
                  <div>
                    <Label className="text-black">Rate Limit Window (seconds)</Label>
                    <Input
                      type="number"
                      value={security.RATE_LIMIT_WINDOW?.window || 60}
                      onChange={(e) => setSecurity(prev => ({ ...prev, RATE_LIMIT_WINDOW: { window: parseInt(e.target.value) || 60 } }))}
                      className="mt-1 text-black"
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
          <Card>
            <CardHeader>
              <CardTitle className="text-black">
                <Database className="h-5 w-5" />
                System Information
              </CardTitle>
              <CardDescription className="text-neutral-600">Platform status and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="text-sm text-neutral-600">Platform Version</p>
                  <p className="font-medium text-black">v2.0.0</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="text-sm text-neutral-600">Environment</p>
                  <p className="font-medium text-black">Production</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="text-sm text-neutral-600">Database</p>
                  <p className="font-medium text-black">PostgreSQL 15</p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="text-sm text-neutral-600">Cache</p>
                  <p className="font-medium text-black">Redis 7</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">All Systems Operational</p>
                    <p className="text-sm text-green-700">All services are running normally</p>
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
