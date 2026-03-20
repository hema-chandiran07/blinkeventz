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

    return settings.map((s) => ({
      key: s.key,
      value: s.value as boolean,
      description: s.description,
    }));
  }

  async updateFeatureFlags(flags: Record<string, boolean>) {
    const updates = Object.entries(flags).map(([key, value]) =>
      this.prisma.settings.upsert({
        where: { key: `FEATURE_${key}` },
        update: { value },
        create: {
          key: `FEATURE_${key}`,
          value,
          category: 'FEATURE',
        },
      }),
    );

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

    return settings.map((s) => ({
      key: s.key,
      value: s.value as any,
    }));
  }

  async updateIntegrations(integrations: Record<string, any>) {
    const updates = Object.entries(integrations).map(([key, value]) =>
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

    return setting;
  }

  async initializeDefaultSettings() {
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
        update: {},
        create: setting,
      });
    }
  }
}
