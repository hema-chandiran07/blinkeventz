import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Returns all settings grouped by category' })
  async getAllSettings() {
    return this.settingsService.getAllSettings();
  }

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

  @Post('initialize')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Initialize default settings' })
  @ApiResponse({ status: 200, description: 'Default settings initialized' })
  async initializeDefaultSettings() {
    await this.settingsService.initializeDefaultSettings();
    return { message: 'Default settings initialized successfully' };
  }
}
