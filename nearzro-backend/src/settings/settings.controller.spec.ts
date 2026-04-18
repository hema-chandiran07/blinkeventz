import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('SettingsController', () => {
  let controller: SettingsController;
  let service: SettingsService;

  const mockPrismaService = {
    settings: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockSettingsService = {
    getAllSettings: jest.fn(),
    getFeatureFlags: jest.fn(),
    updateFeatureFlags: jest.fn(),
    getIntegrations: jest.fn(),
    updateIntegrations: jest.fn(),
    getSecuritySettings: jest.fn(),
    updateSecuritySettings: jest.fn(),
    initializeDefaultSettings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllSettings', () => {
    it('should return all settings grouped by category', async () => {
      const mockSettings = {
        featureFlags: [
          { key: 'FEATURE_NEW_DASHBOARD', value: false, description: 'Enable new dashboard UI' },
        ],
        integrations: [
          { key: 'INTEGRATION_RAZORPAY', value: { enabled: false, apiKey: '' } },
        ],
        security: [
          { key: 'SECURITY_MFA_REQUIRED', value: { enabled: false } },
        ],
      };

      mockSettingsService.getAllSettings.mockResolvedValue(mockSettings);

      const result = await controller.getAllSettings();
      expect(result).toEqual(mockSettings);
      expect(service.getAllSettings).toHaveBeenCalled();
    });
  });

  describe('getFeatureFlags', () => {
    it('should return all feature flags', async () => {
      const mockFlags = [
        { key: 'FEATURE_NEW_DASHBOARD', value: false, description: 'Enable new dashboard UI' },
        { key: 'FEATURE_AI_PLANNING', value: true, description: 'Enable AI event planning' },
      ];

      mockSettingsService.getFeatureFlags.mockResolvedValue(mockFlags);

      const result = await controller.getFeatureFlags();
      expect(result).toEqual(mockFlags);
      expect(service.getFeatureFlags).toHaveBeenCalled();
    });
  });

  describe('updateFeatureFlags', () => {
    it('should update feature flags successfully', async () => {
      const mockFlags = {
        NEW_DASHBOARD: false,
        AI_PLANNING: true,
      };

      const mockUpdatedFlags = [
        { key: 'FEATURE_NEW_DASHBOARD', value: false, description: 'Enable new dashboard UI' },
        { key: 'FEATURE_AI_PLANNING', value: true, description: 'Enable AI event planning' },
      ];

      const mockReq = { user: { userId: 1, email: 'admin@test.com' } };
      const result = await controller.updateFeatureFlags(mockReq, { flags: mockFlags });
      expect(result).toEqual(mockUpdatedFlags);
      expect(service.updateFeatureFlags).toHaveBeenCalledWith(
        mockFlags,
        mockReq.user.userId,
        mockReq.user.email,
      );
    });
  });

  describe('getIntegrations', () => {
    it('should return all integrations', async () => {
      const mockIntegrations = [
        { key: 'INTEGRATION_RAZORPAY', value: { enabled: false, apiKey: '' } },
        { key: 'INTEGRATION_SENDGRID', value: { enabled: false, apiKey: '' } },
      ];

      mockSettingsService.getIntegrations.mockResolvedValue(mockIntegrations);

      const result = await controller.getIntegrations();
      expect(result).toEqual(mockIntegrations);
      expect(service.getIntegrations).toHaveBeenCalled();
    });
  });

  describe('updateIntegrations', () => {
    it('should update integrations successfully', async () => {
      const mockIntegrations = {
        RAZORPAY: { enabled: true, apiKey: 'test_key' },
        SENDGRID: { enabled: false, apiKey: '' },
      };

      const mockUpdated = [
        { key: 'INTEGRATION_RAZORPAY', value: { enabled: true, apiKey: 'test_key' } },
        { key: 'INTEGRATION_SENDGRID', value: { enabled: false, apiKey: '' } },
      ];

      const mockReq = { user: { userId: 1, email: 'admin@test.com' } };
      mockSettingsService.updateIntegrations.mockResolvedValue(mockUpdated);
 
      const result = await controller.updateIntegrations(mockReq, { integrations: mockIntegrations });
      expect(result).toEqual(mockUpdated);
      expect(service.updateIntegrations).toHaveBeenCalledWith(
        mockIntegrations,
        mockReq.user.userId,
        mockReq.user.email,
      );
    });
  });

  describe('getSecuritySettings', () => {
    it('should return all security settings', async () => {
      const mockSecurity = [
        { key: 'SECURITY_MFA_REQUIRED', value: { enabled: false } },
        { key: 'SECURITY_SESSION_TIMEOUT', value: { minutes: 30 } },
        { key: 'SECURITY_MAX_LOGIN_ATTEMPTS', value: { attempts: 5 } },
      ];

      mockSettingsService.getSecuritySettings.mockResolvedValue(mockSecurity);

      const result = await controller.getSecuritySettings();
      expect(result).toEqual(mockSecurity);
      expect(service.getSecuritySettings).toHaveBeenCalled();
    });
  });

  describe('updateSecuritySettings', () => {
    it('should update security settings successfully', async () => {
      const mockSecurity = {
        MFA_REQUIRED: { enabled: true },
        SESSION_TIMEOUT: { minutes: 60 },
        MAX_LOGIN_ATTEMPTS: { attempts: 3 },
      };

      const mockUpdated = [
        { key: 'SECURITY_MFA_REQUIRED', value: { enabled: true } },
        { key: 'SECURITY_SESSION_TIMEOUT', value: { minutes: 60 } },
        { key: 'SECURITY_MAX_LOGIN_ATTEMPTS', value: { attempts: 3 } },
      ];

      const mockReq = { user: { userId: 1, email: 'admin@test.com' } };
      mockSettingsService.updateSecuritySettings.mockResolvedValue(mockUpdated);
 
      const result = await controller.updateSecuritySettings(mockReq, { security: mockSecurity });
      expect(result).toEqual(mockUpdated);
      expect(service.updateSecuritySettings).toHaveBeenCalledWith(
        mockSecurity,
        mockReq.user.userId,
        mockReq.user.email,
      );
    });
  });

  describe('initializeDefaultSettings', () => {
    it('should initialize default settings successfully', async () => {
      const mockReq = { user: { userId: 1, email: 'admin@test.com' } };
      mockSettingsService.initializeDefaultSettings.mockResolvedValue(undefined);
 
      const result = await controller.initializeDefaultSettings(mockReq);
      expect(result).toEqual({
        message: 'System protocols re-initialized to factory defaults',
        timestamp: expect.any(String),
      });
      expect(service.initializeDefaultSettings).toHaveBeenCalled();
    });
  });
});

describe('SettingsService', () => {
  let service: SettingsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    settings: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllSettings', () => {
    it('should return settings grouped by category', async () => {
      const mockSettings = [
        { key: 'FEATURE_NEW_DASHBOARD', value: false, description: 'Enable new dashboard', category: 'FEATURE' },
        { key: 'INTEGRATION_RAZORPAY', value: { enabled: true }, category: 'INTEGRATION' },
        { key: 'SECURITY_MFA_REQUIRED', value: { enabled: false }, category: 'SECURITY' },
      ];

      mockPrismaService.settings.findMany.mockResolvedValue(mockSettings);

      const result = await service.getAllSettings();
      expect(result.featureFlags).toHaveLength(1);
      expect(result.integrations).toHaveLength(1);
      expect(result.security).toHaveLength(1);
    });
  });

  describe('updateFeatureFlags', () => {
    it('should update feature flags using upsert', async () => {
      const flags = { NEW_DASHBOARD: true, AI_PLANNING: false };

      // Mock upsert for the update operations
      mockPrismaService.settings.upsert.mockResolvedValue({});
      
      // Mock findMany for the getFeatureFlags call at the end of updateFeatureFlags
      mockPrismaService.settings.findMany.mockResolvedValue([
        { key: 'FEATURE_NEW_DASHBOARD', value: true, description: 'New dashboard' },
        { key: 'FEATURE_AI_PLANNING', value: false, description: 'AI planning' },
      ]);

      const result = await service.updateFeatureFlags(flags, 1, 'admin@test.com');
      
      // Verify upsert was called for each flag
      expect(prismaService.settings.upsert).toHaveBeenCalledTimes(2);
      
      // Verify the result contains the updated flags
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('FEATURE_NEW_DASHBOARD');
    });
  });

  describe('initializeDefaultSettings', () => {
    it('should initialize all default settings', async () => {
      mockPrismaService.settings.upsert.mockResolvedValue({});

      await service.initializeDefaultSettings();
      
      // Should create multiple default settings
      expect(prismaService.settings.upsert).toHaveBeenCalled();
    });
  });
});

