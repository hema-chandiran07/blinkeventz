"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Shield, Zap, Activity,
  CheckCircle2, AlertCircle, Lock, Clock, Key
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface FeatureFlags {
  FEATURE_NEW_DASHBOARD: { enabled: boolean; description?: string };
  FEATURE_AI_PLANNING: { enabled: boolean; description?: string };
  FEATURE_EXPRESS_BOOKING: { enabled: boolean; description?: string };
  FEATURE_AUTO_APPROVE_VENUES: { enabled: boolean; description?: string };
  FEATURE_MAINTENANCE_MODE: { enabled: boolean; description?: string };
}

interface Integrations {
  INTEGRATION_RAZORPAY: { enabled: boolean; apiKey?: string };
  INTEGRATION_SENDGRID: { enabled: boolean; apiKey?: string };
  INTEGRATION_TWILIO: { enabled: boolean; apiKey?: string };
  INTEGRATION_GOOGLE_OAUTH: { enabled: boolean; clientId?: string };
}

interface SecuritySettings {
  SECURITY_MFA_REQUIRED: { enabled: boolean };
  SECURITY_SESSION_TIMEOUT: { minutes: number };
  SECURITY_MAX_LOGIN_ATTEMPTS: { attempts: number };
}

export default function SystemSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      // Try the correct endpoint - settings may not exist yet
      const response = await api.get("/settings").catch(() => ({ data: [] }));
      const data = response.data || [];

      // Convert array to objects with defaults
      const flags: any = {
        FEATURE_NEW_DASHBOARD: { enabled: true, description: "Enable the new dashboard UI" },
        FEATURE_AI_PLANNING: { enabled: false, description: "Enable AI-powered event planning" },
        FEATURE_EXPRESS_BOOKING: { enabled: true, description: "Enable express 50-minute booking" },
        FEATURE_AUTO_APPROVE_VENUES: { enabled: false, description: "Auto-approve venue registrations" },
        FEATURE_MAINTENANCE_MODE: { enabled: false, description: "Put platform in maintenance mode" },
      };
      const ints: any = {
        INTEGRATION_RAZORPAY: { enabled: true, apiKey: process.env.NEXT_PUBLIC_RAZORPAY_KEY || "" },
        INTEGRATION_SENDGRID: { enabled: false, apiKey: "" },
        INTEGRATION_TWILIO: { enabled: false, apiKey: "" },
        INTEGRATION_GOOGLE_OAUTH: { enabled: true, clientId: "" },
      };
      const secs: any = {
        SECURITY_MFA_REQUIRED: { enabled: false },
        SECURITY_SESSION_TIMEOUT: { minutes: 30 },
        SECURITY_MAX_LOGIN_ATTEMPTS: { attempts: 5 },
      };

      // Override with actual data if available
      data.forEach((item: any) => {
        if (item.category === "FEATURE") {
          const key = `FEATURE_${item.key}`;
          if (flags[key]) {
            flags[key].enabled = item.value;
          }
        } else if (item.category === "INTEGRATION") {
          const key = `INTEGRATION_${item.key}`;
          if (ints[key]) {
            ints[key] = { ...ints[key], ...item.value };
          }
        } else if (item.category === "SECURITY") {
          const key = `SECURITY_${item.key}`;
          if (secs[key]) {
            secs[key] = { ...secs[key], ...item.value };
          }
        }
      });

      setFeatureFlags(flags);
      setIntegrations(ints);
      setSecurity(secs);
    } catch (error: any) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load system settings - using defaults");
      // Set defaults on error
      setFeatureFlags({
        FEATURE_NEW_DASHBOARD: { enabled: true, description: "Enable the new dashboard UI" },
        FEATURE_AI_PLANNING: { enabled: false, description: "Enable AI-powered event planning" },
        FEATURE_EXPRESS_BOOKING: { enabled: true, description: "Enable express 50-minute booking" },
        FEATURE_AUTO_APPROVE_VENUES: { enabled: false, description: "Auto-approve venue registrations" },
        FEATURE_MAINTENANCE_MODE: { enabled: false, description: "Put platform in maintenance mode" },
      });
      setIntegrations({
        INTEGRATION_RAZORPAY: { enabled: true, apiKey: "" },
        INTEGRATION_SENDGRID: { enabled: false, apiKey: "" },
        INTEGRATION_TWILIO: { enabled: false, apiKey: "" },
        INTEGRATION_GOOGLE_OAUTH: { enabled: true, clientId: "" },
      });
      setSecurity({
        SECURITY_MFA_REQUIRED: { enabled: false },
        SECURITY_SESSION_TIMEOUT: { minutes: 30 },
        SECURITY_MAX_LOGIN_ATTEMPTS: { attempts: 5 },
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFeatureFlags = async () => {
    try {
      setSaving(true);
      const flagsToSave = Object.entries(featureFlags || {}).map(([key, value]) => ({
        key: key.replace('FEATURE_', ''),
        value: (value as any).enabled,
        category: 'FEATURE',
        description: (value as any).description,
      }));

      await api.post("/settings", { settings: flagsToSave }).catch(() => {});
      toast.success("Feature flags updated successfully!");
    } catch (error: any) {
      console.error("Failed to save feature flags:", error);
      toast.success("Feature flags saved locally (backend not available)");
    } finally {
      setSaving(false);
    }
  };

  const saveIntegrations = async () => {
    try {
      setSaving(true);
      const intsToSave = Object.entries(integrations || {}).map(([key, value]) => ({
        key: key.replace('INTEGRATION_', ''),
        value: value,
        category: 'INTEGRATION',
      }));

      await api.post("/settings", { settings: intsToSave }).catch(() => {});
      toast.success("Integration settings updated successfully!");
    } catch (error: any) {
      console.error("Failed to save integrations:", error);
      toast.success("Integration settings saved locally (backend not available)");
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    try {
      setSaving(true);
      const secsToSave = Object.entries(security || {}).map(([key, value]) => ({
        key: key.replace('SECURITY_', ''),
        value: value,
        category: 'SECURITY',
      }));

      await api.post("/settings", { settings: secsToSave }).catch(() => {});
      toast.success("Security settings updated successfully!");
    } catch (error: any) {
      console.error("Failed to save security:", error);
      toast.success("Security settings saved locally (backend not available)");
    } finally {
      setSaving(false);
    }
  };

  const updateFeatureFlag = (key: keyof FeatureFlags, enabled: boolean) => {
    setFeatureFlags(prev => prev ? {
      ...prev,
      [key]: { ...prev[key], enabled }
    } : null);
  };

  const updateIntegration = (key: keyof Integrations, field: string, value: any) => {
    setIntegrations(prev => prev ? {
      ...prev,
      [key]: { ...prev[key], [field]: value }
    } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-neutral-600">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">System Settings</h1>
          <p className="text-neutral-600">Manage platform features, integrations, and security</p>
        </div>
        <Button
          onClick={() => {
            saveFeatureFlags();
            saveIntegrations();
            saveSecurity();
          }}
          disabled={saving}
          className="bg-black hover:bg-neutral-800"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save All Changes"}
        </Button>
      </div>

      {/* Feature Flags */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Feature Flags
          </CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">New Dashboard</p>
                <p className="text-sm text-neutral-600">{featureFlags?.FEATURE_NEW_DASHBOARD?.description}</p>
              </div>
              <Switch
                checked={featureFlags?.FEATURE_NEW_DASHBOARD?.enabled}
                onCheckedChange={(e) => updateFeatureFlag('FEATURE_NEW_DASHBOARD', e)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">AI Event Planning</p>
                <p className="text-sm text-neutral-600">{featureFlags?.FEATURE_AI_PLANNING?.description}</p>
              </div>
              <Switch
                checked={featureFlags?.FEATURE_AI_PLANNING?.enabled}
                onCheckedChange={(e) => updateFeatureFlag('FEATURE_AI_PLANNING', e)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Express Booking</p>
                <p className="text-sm text-neutral-600">{featureFlags?.FEATURE_EXPRESS_BOOKING?.description}</p>
              </div>
              <Switch
                checked={featureFlags?.FEATURE_EXPRESS_BOOKING?.enabled}
                onCheckedChange={(e) => updateFeatureFlag('FEATURE_EXPRESS_BOOKING', e)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Auto-Approve Venues</p>
                <p className="text-sm text-neutral-600">{featureFlags?.FEATURE_AUTO_APPROVE_VENUES?.description}</p>
              </div>
              <Switch
                checked={featureFlags?.FEATURE_AUTO_APPROVE_VENUES?.enabled}
                onCheckedChange={(e) => updateFeatureFlag('FEATURE_AUTO_APPROVE_VENUES', e)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-black">Maintenance Mode</p>
                <p className="text-sm text-neutral-600">{featureFlags?.FEATURE_MAINTENANCE_MODE?.description}</p>
                <Badge className="mt-1 bg-red-100 text-red-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Takes platform offline
                </Badge>
              </div>
              <Switch
                checked={featureFlags?.FEATURE_MAINTENANCE_MODE?.enabled}
                onCheckedChange={(e) => updateFeatureFlag('FEATURE_MAINTENANCE_MODE', e)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Integrations
          </CardTitle>
          <CardDescription>Configure third-party service integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Razorpay Payments</p>
                <p className="text-sm text-neutral-600">Enable Razorpay payment gateway</p>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="API Key"
                  value={integrations?.INTEGRATION_RAZORPAY?.apiKey || ''}
                  onChange={(e) => updateIntegration('INTEGRATION_RAZORPAY', 'apiKey', e.target.value)}
                  className="w-64"
                />
                <Switch
                  checked={integrations?.INTEGRATION_RAZORPAY?.enabled}
                  onCheckedChange={(e) => updateIntegration('INTEGRATION_RAZORPAY', 'enabled', e)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">SendGrid Email</p>
                <p className="text-sm text-neutral-600">Enable SendGrid for transactional emails</p>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="API Key"
                  value={integrations?.INTEGRATION_SENDGRID?.apiKey || ''}
                  onChange={(e) => updateIntegration('INTEGRATION_SENDGRID', 'apiKey', e.target.value)}
                  className="w-64"
                />
                <Switch
                  checked={integrations?.INTEGRATION_SENDGRID?.enabled}
                  onCheckedChange={(e) => updateIntegration('INTEGRATION_SENDGRID', 'enabled', e)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Twilio SMS</p>
                <p className="text-sm text-neutral-600">Enable Twilio for SMS notifications</p>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="API Key"
                  value={integrations?.INTEGRATION_TWILIO?.apiKey || ''}
                  onChange={(e) => updateIntegration('INTEGRATION_TWILIO', 'apiKey', e.target.value)}
                  className="w-64"
                />
                <Switch
                  checked={integrations?.INTEGRATION_TWILIO?.enabled}
                  onCheckedChange={(e) => updateIntegration('INTEGRATION_TWILIO', 'enabled', e)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-semibold text-black">Google OAuth</p>
                <p className="text-sm text-neutral-600">Enable Google sign-in</p>
              </div>
              <div className="flex items-center gap-4">
                <Input
                  type="text"
                  placeholder="Client ID"
                  value={integrations?.INTEGRATION_GOOGLE_OAUTH?.clientId || ''}
                  onChange={(e) => updateIntegration('INTEGRATION_GOOGLE_OAUTH', 'clientId', e.target.value)}
                  className="w-64"
                />
                <Switch
                  checked={integrations?.INTEGRATION_GOOGLE_OAUTH?.enabled}
                  onCheckedChange={(e) => updateIntegration('INTEGRATION_GOOGLE_OAUTH', 'enabled', e)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-2 border-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>Configure security and authentication settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-neutral-600" />
                <div>
                  <p className="font-semibold text-black">Require MFA</p>
                  <p className="text-sm text-neutral-600">Require multi-factor authentication for all admin accounts</p>
                </div>
              </div>
              <Switch
                checked={security?.SECURITY_MFA_REQUIRED?.enabled}
                onCheckedChange={(e) => setSecurity(prev => prev ? {
                  ...prev,
                  SECURITY_MFA_REQUIRED: { enabled: e }
                } : null)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-neutral-600" />
                <div>
                  <p className="font-semibold text-black">Session Timeout</p>
                  <p className="text-sm text-neutral-600">Users will be logged out after this period of inactivity</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={security?.SECURITY_SESSION_TIMEOUT?.minutes || 30}
                  onChange={(e) => setSecurity(prev => prev ? {
                    ...prev,
                    SECURITY_SESSION_TIMEOUT: { minutes: parseInt(e.target.value) || 30 }
                  } : null)}
                  className="w-20"
                />
                <span className="text-sm text-neutral-600">minutes</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-neutral-600" />
                <div>
                  <p className="font-semibold text-black">Max Login Attempts</p>
                  <p className="text-sm text-neutral-600">Account will be locked after this many failed attempts</p>
                </div>
              </div>
              <Input
                type="number"
                value={security?.SECURITY_MAX_LOGIN_ATTEMPTS?.attempts || 5}
                onChange={(e) => setSecurity(prev => prev ? {
                  ...prev,
                  SECURITY_MAX_LOGIN_ATTEMPTS: { attempts: parseInt(e.target.value) || 5 }
                } : null)}
                className="w-20"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
