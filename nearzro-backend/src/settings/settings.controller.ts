import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

// ============================================================================
// DTO DEFINITIONS (Consolidated locally to respect "no new file" constraint)
// ============================================================================

export class UpdateFeatureFlagsDto {
  @ApiProperty({ example: { NEW_DASHBOARD: true, AI_PLANNING: false } })
  @IsObject()
  flags!: Record<string, boolean>;
}

export class IntegrationValueDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() apiKey?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() keyId?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() keySecret?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() clientId?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() clientSecret?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() accountSid?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() authToken?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() fromNumber?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() model?: string;
}

export class UpdateIntegrationsDto {
  @ApiProperty({ example: { RAZORPAY: { enabled: true, keyId: '...', keySecret: '...' } } })
  @IsObject()
  integrations!: Record<string, IntegrationValueDto>;
}

export class UpdateSecuritySettingsDto {
  @ApiProperty({ example: { MFA_REQUIRED: { enabled: true }, SESSION_TIMEOUT: { minutes: 30 } } })
  @IsObject()
  security!: Record<string, any>;
}

@ApiTags('Infrastructure Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) { }

  // ============================================================================
  // MAIN SETTINGS 
  // ============================================================================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Uplink: Synchronize all system settings' })
  @ApiResponse({ status: 200, description: 'Returns all settings grouped by operational category' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  // ============================================================================
  // PROTOCOLS (FEATURE FLAGS)
  // ============================================================================

  @Get('feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all active operational protocols' })
  async getFeatureFlags() {
    return this.settingsService.getFeatureFlags();
  }

  @Post('feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update operational protocols (Commit)' })
  async updateFeatureFlags(
    @Req() req: any,
    @Body() dto: UpdateFeatureFlagsDto
  ) {
    return this.settingsService.updateFeatureFlags(
      dto.flags,
      req.user.userId,
      req.user.email
    );
  }

  // ============================================================================
  // UPLINKS (INTEGRATIONS)
  // ============================================================================

  @Get('integrations')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all external uplink configurations' })
  async getIntegrations() {
    return this.settingsService.getIntegrations();
  }

  @Post('integrations')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update uplink configurations' })
  async updateIntegrations(
    @Req() req: any,
    @Body() dto: UpdateIntegrationsDto
  ) {
    return this.settingsService.updateIntegrations(
      dto.integrations,
      req.user.userId,
      req.user.email
    );
  }

  // ============================================================================
  // KERNEL SECURITY
  // ============================================================================

  @Get('security')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all kernel security parameters' })
  async getSecuritySettings() {
    return this.settingsService.getSecuritySettings();
  }

  @Post('security')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update kernel security parameters' })
  async updateSecuritySettings(
    @Req() req: any,
    @Body() dto: UpdateSecuritySettingsDto
  ) {
    return this.settingsService.updateSecuritySettings(
      dto.security,
      req.user.userId,
      req.user.email
    );
  }

  // ============================================================================
  // MAINTENANCE & INITIALIZATION
  // ============================================================================

  @Post('initialize')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Factory Reset: Initialize default system protocols' })
  async initializeDefaultSettings(@Req() req: any) {
    await this.settingsService.initializeDefaultSettings();
    return {
      message: 'System protocols re-initialized to factory defaults',
      timestamp: new Date().toISOString()
    };
  }

  @Get('kernel')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Retrieve core system diagnostics and metadata' })
  async getKernelMetadata() {
    return this.settingsService.getKernelMetadata();
  }
}
