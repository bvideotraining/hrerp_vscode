import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { CreateRoleDto } from './dto/role.dto';
import { SystemConfigDto } from './dto/config.dto';
import { NotificationConfigDto, ResetSystemDto } from './dto/notification-config.dto';
import { SaveDashboardLayoutDto } from './dto/dashboard-layout.dto';

@Controller('api/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ─── System Users ──────────────────────────────────────
  @Get('users')
  getUsers() { return this.settingsService.getUsers(); }

  @Post('users')
  createUser(@Body() dto: CreateUserDto) { return this.settingsService.createUser(dto); }

  @Put('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.settingsService.updateUser(id, dto);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) { return this.settingsService.deleteUser(id); }

  // ─── Roles ─────────────────────────────────────────────
  @Get('roles')
  getRoles() { return this.settingsService.getRoles(); }

  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) { return this.settingsService.createRole(dto); }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: CreateRoleDto) {
    return this.settingsService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) { return this.settingsService.deleteRole(id); }

  // ─── System Config ─────────────────────────────────────
  @Get('config')
  getConfig() { return this.settingsService.getConfig(); }

  @Put('config')
  updateConfig(@Body() dto: SystemConfigDto) { return this.settingsService.updateConfig(dto); }

  // ─── Backup & Restore ──────────────────────────────────
  @Get('backup')
  generateBackup() { return this.settingsService.generateBackup(); }

  @Post('restore')
  restoreBackup(@Body() body: any) { return this.settingsService.restoreBackup(body); }

  // ─── Notification Config ───────────────────────────────
  @Get('notifications/config')
  getNotificationConfig() { return this.settingsService.getNotificationConfig(); }

  @Put('notifications/config')
  updateNotificationConfig(@Body() dto: NotificationConfigDto) {
    return this.settingsService.updateNotificationConfig(dto);
  }

  // ─── User Notifications (bell) ─────────────────────────
  @Get('notifications/user/:userId')
  getUserNotifications(@Param('userId') userId: string) {
    return this.settingsService.getUserNotifications(userId);
  }

  @Put('notifications/:id/read')
  markRead(@Param('id') id: string) { return this.settingsService.markNotificationRead(id); }

  @Put('notifications/user/:userId/read-all')
  markAllRead(@Param('userId') userId: string) {
    return this.settingsService.markAllNotificationsRead(userId);
  }

  @Post('notifications')
  createNotification(@Body() body: any) { return this.settingsService.createNotification(body); }

  @Post('notifications/sync-pending-leaves')
  syncPendingLeaveNotifications() {
    return this.settingsService.syncPendingLeaveNotifications();
  }

  // ─── System Reset ──────────────────────────────────────
  @Post('reset')
  resetSystem(@Body() dto: ResetSystemDto) { return this.settingsService.resetSystem(dto); }

  // ─── Dashboard Layouts ─────────────────────────────────
  @Get('dashboard-layouts/:roleId')
  getDashboardLayout(@Param('roleId') roleId: string) {
    return this.settingsService.getDashboardLayout(roleId);
  }

  @Put('dashboard-layouts/:roleId')
  saveDashboardLayout(
    @Param('roleId') roleId: string,
    @Body() dto: SaveDashboardLayoutDto,
  ) {
    return this.settingsService.saveDashboardLayout(roleId, dto);
  }

  @Post('dashboard-layouts/:roleId/ai-suggest')
  aiSuggestWidgets(@Param('roleId') roleId: string, @Body() body: any) {
    return this.settingsService.aiSuggestWidgets(roleId, body.role);
  }
}
