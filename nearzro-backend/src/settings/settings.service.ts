import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsCategory, AuditSeverity, Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import * as os from 'os';

export interface FeatureFlag {
  key: string;
  value: boolean;
  description?: string;
  id: number;
}

export interface IntegrationConfig {
  key: string;
  value: any;
  id: number;
}

export interface SecuritySetting {
  key: string;
  value: any;
  id: number;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) { }

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
      where: { key: { startsWith: 'FEATURE_' } },
    });
    return (settings ?? []).map((s) => ({
      key: s.key,
      value: s.value as boolean,
      description: s.description,
      id: Number(s.id),
    }));
  }

  async getIntegrations() {
    const settings = await this.prisma.settings.findMany({
      where: { key: { startsWith: 'INTEGRATION_' } },
    });
    return (settings ?? []).map((s) => ({
      key: s.key,
      value: s.value as any,
      id: Number(s.id),
    }));
  }

  async getSecuritySettings() {
    const settings = await this.prisma.settings.findMany({
      where: { key: { startsWith: 'SECURITY_' } },
    });
    return (settings ?? []).map((s) => ({
      key: s.key,
      value: s.value as any,
      id: Number(s.id),
    }));
  }

  // ============================================================================
  // UPDATE SETTINGS (INDUSTRIALIZED)
  // ============================================================================

  async updateFeatureFlags(flags: Record<string, boolean>, actorId?: number, actorEmail?: string) {
    return this.processBatchUpdate(flags, 'FEATURE' as SettingsCategory, actorId, actorEmail);
  }

  async updateIntegrations(integrations: Record<string, any>, actorId?: number, actorEmail?: string) {
    return this.processBatchUpdate(integrations, 'INTEGRATION' as SettingsCategory, actorId, actorEmail);
  }

  async updateSecuritySettings(settings: Record<string, any>, actorId?: number, actorEmail?: string) {
    return this.processBatchUpdate(settings, 'SECURITY' as SettingsCategory, actorId, actorEmail);
  }

  private async processBatchUpdate(
    data: Record<string, any>,
    category: SettingsCategory,
    actorId?: number,
    actorEmail?: string
  ) {
    if (!data || typeof data !== 'object') {
      throw new Error(`${category} settings must be a valid object`);
    }

    const updates = Object.entries(data).map(async ([key, value]) => {
      const cleanKey = this.getCleanKey(key, category);

      // Get old value for auditing
      const oldSetting = await this.prisma.settings.findUnique({ where: { key: cleanKey } });

      const newSetting = await this.prisma.settings.upsert({
        where: { key: cleanKey },
        update: { value },
        create: {
          key: cleanKey,
          value,
          category,
          description: `System ${category.toLowerCase()} setting: ${key}`,
        },
      });

      // 📝 Log to Audit Trail
      await this.auditService.record({
        entityType: 'SETTINGS',
        entityId: cleanKey,
        action: oldSetting ? 'UPDATE' : 'CREATE',
        severity: AuditSeverity.INFO,
        actorId,
        actorEmail,
        actorRole: Role.ADMIN,
        oldValue: oldSetting ? { value: oldSetting.value as any } : null,
        newValue: { value: newSetting.value as any },
        description: `Administrator ${actorEmail || 'System'} modified system setting: ${cleanKey}`,
      });

      return newSetting;
    });

    await Promise.all(updates);

    // Return the appropriate subset
    switch (category) {
      case 'FEATURE': return this.getFeatureFlags();
      case 'INTEGRATION': return this.getIntegrations();
      case 'SECURITY': return this.getSecuritySettings();
      default: return this.getAllSettings();
    }
  }

  private getCleanKey(key: string, category: SettingsCategory): string {
    const prefix = `${category}_`;
    return key.startsWith(prefix) ? key : `${prefix}${key}`;
  }

  // ============================================================================
  // UTILS
  // ============================================================================

  async isMaintenanceModeEnabled(): Promise<boolean> {
    try {
      const setting = await this.prisma.settings.findUnique({
        where: { key: 'FEATURE_MAINTENANCE_MODE' },
      });
      return setting ? Boolean(setting.value) : false;
    } catch {
      return false;
    }
  }

  async initializeDefaultSettings() {
    this.logger.log('Initializing industrialized system settings...');

    const defaultSettings: Array<{
      key: string;
      value: any;
      description?: string;
      category: SettingsCategory;
    }> = [
        // Protocols (Feature Flags)
        { key: 'FEATURE_NEW_DASHBOARD', value: false, description: 'Enable new laboratory dashboard UI', category: SettingsCategory.FEATURE },
        { key: 'FEATURE_AI_PLANNING', value: true, description: 'Enable AI-powered event planning protocols', category: SettingsCategory.FEATURE },
        { key: 'FEATURE_EXPRESS_BOOKING', value: true, description: 'Allow high-velocity booking flows', category: SettingsCategory.FEATURE },
        { key: 'FEATURE_AUTO_APPROVE_VENUES', value: false, description: 'Autonomous venue approval protocol', category: SettingsCategory.FEATURE },
        { key: 'FEATURE_MAINTENANCE_MODE', value: false, description: 'Lock platform for core maintenance', category: SettingsCategory.FEATURE },

        // Uplinks (Integrations)
        { key: 'INTEGRATION_RAZORPAY', value: { enabled: false, keyId: '', keySecret: '' }, category: SettingsCategory.INTEGRATION },
        { key: 'INTEGRATION_SENDGRID', value: { enabled: false, apiKey: '' }, category: SettingsCategory.INTEGRATION },
        { key: 'INTEGRATION_TWILIO', value: { enabled: false, accountSid: '', authToken: '', fromNumber: '' }, category: SettingsCategory.INTEGRATION },
        { key: 'INTEGRATION_GOOGLE_OAUTH', value: { enabled: false, clientId: '', clientSecret: '' }, category: SettingsCategory.INTEGRATION },
        { key: 'INTEGRATION_OPENAI', value: { enabled: false, apiKey: '', model: 'gpt-4o-mini' }, category: SettingsCategory.INTEGRATION },

        // Security (Kernel Defaults)
        { key: 'SECURITY_MFA_REQUIRED', value: { enabled: false }, category: SettingsCategory.SECURITY },
        { key: 'SECURITY_SESSION_TIMEOUT', value: { minutes: 30 }, category: SettingsCategory.SECURITY },
        { key: 'SECURITY_MAX_LOGIN_ATTEMPTS', value: { attempts: 5 }, category: SettingsCategory.SECURITY },
        { key: 'SECURITY_PASSWORD_MIN_LENGTH', value: { length: 8 }, category: SettingsCategory.SECURITY },
        { key: 'SECURITY_RATE_LIMITING', value: { enabled: true }, category: SettingsCategory.SECURITY },
        { key: 'SECURITY_RATE_LIMIT_MAX', value: { max: 100 }, category: SettingsCategory.SECURITY },
        { key: 'SECURITY_RATE_LIMIT_WINDOW', value: { window: 60 }, category: SettingsCategory.SECURITY },
      ];

    for (const setting of defaultSettings) {
      await this.prisma.settings.upsert({
        where: { key: setting.key },
        update: {
          category: setting.category,
          description: setting.description,
          value: setting.value,
        },
        create: setting,
      });
    }
  }

  async getKernelMetadata() {
    return {
      version: process.env.npm_package_version || '2.0.0',
      nodeVersion: process.version,
      platform: os.platform(),
      osRelease: os.release(),
      totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + ' GB',
      freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + ' GB',
      uptime: Math.round(os.uptime() / 3600) + ' hours',
      environment: process.env.NODE_ENV || 'development',
      database: 'PostgreSQL 15',
      cache: 'Redis 7',
      timestamp: new Date().toISOString()
    };
  }
}
