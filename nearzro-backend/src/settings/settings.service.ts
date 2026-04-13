import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsCategory } from '@prisma/client';

export interface FeatureFlag {
  key: string;
  value: boolean;
  description?: string;
}

export interface IntegrationConfig {
  key: string;
  value: {
    enabled: boolean;
    apiKey?: string;
    clientId?: string;
  };
}

export interface SecuritySetting {
  key: string;
  value: {
    enabled?: boolean;
    minutes?: number;
    attempts?: number;
  };
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // GET SETTINGS
  // ============================================================================

  async getAllSettings() {
    const settings = await this.prisma.settings.findMany();

    const featureFlags: FeatureFlag[] = [];
    const integrations: IntegrationConfig[] = [];
    const security: SecuritySetting[] = [];

    settings.forEach((setting) => {
      const item = {
        key: setting.key,
        value: setting.value as any,
        description: setting.description,
        id: Number(setting.id),
      };

      if (setting.key.startsWith('FEATURE_')) {
        featureFlags.push(item as FeatureFlag);
      } else if (setting.key.startsWith('INTEGRATION_')) {
        integrations.push(item as IntegrationConfig);
      } else if (setting.key.startsWith('SECURITY_')) {
        security.push(item as SecuritySetting);
      }
    });

    return { featureFlags, integrations, security };
  }

  async getFeatureFlags() {
    const settings = await this.prisma.settings.findMany({
      where: {
        key: {
          startsWith: 'FEATURE_',
        },
      },
    });

    // Defensive: handle case where findMany returns undefined/null
    return (settings ?? []).map((s) => ({
      key: s.key,
      value: s.value as boolean,
      description: s.description,
      id: Number(s.id),
    }));
  }

  // ============================================================================
  // UPDATE SETTINGS
  // ============================================================================

  async updateSettings(settings: Record<string, any>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.settings.upsert({
        where: { key },
        update: { value },
        create: {
          key,
          value,
          category: 'FEATURE' as any,
        },
      }),
    );

    await Promise.all(updates);
    return this.getAllSettings();
  }

  async updateFeatureFlags(flags: Record<string, boolean>) {
    // Defensive: handle null/undefined input
    if (!flags || typeof flags !== 'object') {
      throw new Error('Feature flags must be a valid object');
    }
    const entries = Object.entries(flags);
    if (entries.length === 0) {
      return this.getFeatureFlags();
    }
    const updates = entries.map(([key, value]) => {
      // Ensure key has FEATURE_ prefix but prevent double-wrapping
      const cleanKey = key.startsWith('FEATURE_') ? key : `FEATURE_${key}`;
      return this.prisma.settings.upsert({
        where: { key: cleanKey },
        update: { 
          value,
          category: 'FEATURE',
        },
        create: {
          key: cleanKey,
          value,
          category: 'FEATURE',
          description: key.startsWith('FEATURE_') ? key.substring(8) : key,
        },
      });
    });

    await Promise.all(updates);
    return this.getFeatureFlags();
  }

  async getIntegrations() {
    const settings = await this.prisma.settings.findMany({
      where: {
        key: {
          startsWith: 'INTEGRATION_',
        },
      },
    });
    return (settings ?? []).map((s) => ({
      key: s.key,
      value: s.value as any,
      id: Number(s.id),
    }));
  }

  async updateIntegrations(integrations: Record<string, any>) {
    // Defensive: handle null/undefined input
    if (!integrations || typeof integrations !== 'object') {
      throw new Error('Integrations must be a valid object');
    }
    const entries = Object.entries(integrations);
    if (entries.length === 0) {
      return this.getIntegrations();
    }
    const updates = entries.map(([key, value]) =>
      this.prisma.settings.upsert({
        where: { key: `INTEGRATION_${key}` },
        update: { value },
        create: {
          key: `INTEGRATION_${key}`,
          value,
          category: 'INTEGRATION',
        },
      }),
    );

    await Promise.all(updates);
    return this.getIntegrations();
  }

  async getSecuritySettings() {
    const settings = await this.prisma.settings.findMany({
      where: {
        key: {
          startsWith: 'SECURITY_',
        },
      },
    });

    return settings.map((s) => ({
      key: s.key,
      value: s.value as any,
      id: Number(s.id),
    }));
  }

  async updateSecuritySettings(settings: Record<string, any>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      this.prisma.settings.upsert({
        where: { key: `SECURITY_${key}` },
        update: { value },
        create: {
          key: `SECURITY_${key}`,
          value,
          category: 'SECURITY',
        },
      }),
    );

    await Promise.all(updates);
    return this.getSecuritySettings();
  }

  async getSettingByKey(key: string) {
    const setting = await this.prisma.settings.findUnique({
      where: { key },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key "${key}" not found`);
    }

    return {
      ...setting,
      id: Number(setting.id),
    };
  }

  async initializeDefaultSettings() {
    // First, clean up corrupted entries
    const allSettings = await this.prisma.settings.findMany();
    const corruptedKeys: string[] = [];
    const wrapperPattern = /^(FEATURE|INTEGRATION|SECURITY)_\d+$/;

    for (const setting of allSettings) {
      const value = setting.value as any;
      // Check if value is corrupted (nested object with id/key)
      if (
        typeof value === 'object' &&
        value !== null &&
        (value.id || value.key) &&
        typeof value.id === 'number'
      ) {
        corruptedKeys.push(setting.key);
      }
      // Check if it's a wrapper entry
      if (wrapperPattern.test(setting.key)) {
        corruptedKeys.push(setting.key);
      }
    }

    // Delete corrupted entries
    if (corruptedKeys.length > 0) {
      await this.prisma.settings.deleteMany({
        where: { key: { in: corruptedKeys } },
      });
    }

    // Now initialize clean defaults
    const defaultSettings: Array<{
      key: string;
      value: any;
      description?: string;
      category: SettingsCategory;
    }> = [
      // Feature Flags
      { key: 'FEATURE_NEW_DASHBOARD', value: false, description: 'Enable new dashboard UI', category: SettingsCategory.FEATURE },
      { key: 'FEATURE_AI_PLANNING', value: true, description: 'Enable AI event planning', category: SettingsCategory.FEATURE },
      { key: 'FEATURE_EXPRESS_BOOKING', value: true, description: 'Enable express booking flow', category: SettingsCategory.FEATURE },
      { key: 'FEATURE_AUTO_APPROVE_VENUES', value: false, description: 'Auto-approve venue listings', category: SettingsCategory.FEATURE },
      { key: 'FEATURE_MAINTENANCE_MODE', value: false, description: 'Enable maintenance mode', category: SettingsCategory.FEATURE },

      // Integrations
      { key: 'INTEGRATION_RAZORPAY', value: { enabled: false, apiKey: '' }, category: SettingsCategory.INTEGRATION },
      { key: 'INTEGRATION_SENDGRID', value: { enabled: false, apiKey: '' }, category: SettingsCategory.INTEGRATION },
      { key: 'INTEGRATION_TWILIO', value: { enabled: false, apiKey: '' }, category: SettingsCategory.INTEGRATION },
      { key: 'INTEGRATION_GOOGLE_OAUTH', value: { enabled: false, clientId: '' }, category: SettingsCategory.INTEGRATION },

      // Security
      { key: 'SECURITY_MFA_REQUIRED', value: { enabled: false }, category: SettingsCategory.SECURITY },
      { key: 'SECURITY_SESSION_TIMEOUT', value: { minutes: 30 }, category: SettingsCategory.SECURITY },
      { key: 'SECURITY_MAX_LOGIN_ATTEMPTS', value: { attempts: 5 }, category: SettingsCategory.SECURITY },
    ];

    for (const setting of defaultSettings) {
      await this.prisma.settings.upsert({
        where: { key: setting.key },
        update: setting,
        create: setting,
      });
    }
  }
}
