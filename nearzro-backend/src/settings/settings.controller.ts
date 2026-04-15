import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')  // Changed from 'admin/settings' to 'settings' for frontend compatibility
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ============================================================================
  // MAIN SETTINGS ENDPOINTS
  // ============================================================================

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Returns all settings grouped by category' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update system settings' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(@Body() body: Record<string, any>) {
    return this.settingsService.updateSettings(body);
  }

  @Patch()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update system settings (PATCH)' })
  @ApiBody({ schema: { type: 'object' } })
  async updateSettingsPatch(@Body() body: Record<string, any>) {
    return this.settingsService.updateSettings(body);
  }

  // ============================================================================
  // FEATURE FLAGS
  // ============================================================================

  @Get('feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all feature flags' })
  @ApiResponse({ status: 200, description: 'Returns all feature flags' })
  async getFeatureFlags() {
    return this.settingsService.getFeatureFlags();
  }

  @Post('feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update feature flags' })
  @ApiResponse({ status: 200, description: 'Feature flags updated successfully' })
  async updateFeatureFlags(@Body() body: { flags: Record<string, boolean> }) {
    return this.settingsService.updateFeatureFlags(body.flags);
  }

  @Patch('feature-flags')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update feature flags (PATCH)' })
  @ApiResponse({ status: 200, description: 'Feature flags updated successfully' })
  async updateFeatureFlagsPatch(@Body() body: { flags: Record<string, boolean> }) {
    return this.settingsService.updateFeatureFlags(body.flags);
  }

  // ============================================================================
  // INTEGRATIONS
  // ============================================================================

  @Get('integrations')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all integration configurations' })
  @ApiResponse({ status: 200, description: 'Returns all integration settings' })
  async getIntegrations() {
    return this.settingsService.getIntegrations();
  }

  @Post('integrations')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update integration configurations' })
  @ApiResponse({ status: 200, description: 'Integrations updated successfully' })
  async updateIntegrations(@Body() body: { integrations: Record<string, any> }) {
    return this.settingsService.updateIntegrations(body.integrations);
  }

  // ============================================================================
  // SECURITY
  // ============================================================================

  @Get('security')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all security settings' })
  @ApiResponse({ status: 200, description: 'Returns all security settings' })
  async getSecuritySettings() {
    return this.settingsService.getSecuritySettings();
  }

  @Post('security')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update security settings' })
  @ApiResponse({ status: 200, description: 'Security settings updated successfully' })
  async updateSecuritySettings(@Body() body: Record<string, any>) {
    return this.settingsService.updateSecuritySettings(body);
  }

  @Patch('security')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update security settings (PATCH)' })
  @ApiResponse({ status: 200, description: 'Security settings updated successfully' })
  async updateSecuritySettingsPatch(@Body() body: Record<string, any>) {
    return this.settingsService.updateSecuritySettings(body);
  }

  // ============================================================================
  // INITIALIZE
  // ============================================================================

  @Post('initialize')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Initialize default settings' })
  @ApiResponse({ status: 200, description: 'Default settings initialized' })
  async initializeDefaultSettings() {
    await this.settingsService.initializeDefaultSettings();
    return { message: 'Default settings initialized successfully' };
  }
}

