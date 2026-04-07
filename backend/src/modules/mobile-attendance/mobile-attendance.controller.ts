import {
  Controller, Post, Get, Delete, Patch, Body, Param, Query,
  HttpCode, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MobileAttendanceService } from './mobile-attendance.service';
import { MobileCheckinDto } from './dto/mobile-checkin.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { CreateBranchAssignmentDto } from './dto/branch-assignment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Mobile Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/mobile-attendance')
export class MobileAttendanceController {
  constructor(private readonly service: MobileAttendanceService) {}

  /** Public: verify employee code during signup (no auth required) */
  @Public()
  @Post('verify-employee-code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify employee code and return employee info (public)' })
  async verifyEmployeeCode(@Body() body: { employeeCode: string }) {
    return this.service.verifyEmployeeCode(body.employeeCode);
  }

  /** Employee: submit a check-in or check-out */
  @Post('checkin')
  @HttpCode(200)
  @ApiOperation({ summary: 'GPS-verified check-in / check-out from Android app' })
  async checkin(@Body() dto: MobileCheckinDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.service.checkin(dto, userId);
  }

  /** Employee: submit a check-in or check-out (alias used by Android app) */
  @Post('mobile/checkin')
  @HttpCode(200)
  @ApiOperation({ summary: 'GPS-verified check-in / check-out (mobile alias)' })
  async mobileCheckin(@Body() dto: MobileCheckinDto, @Request() req: any) {
    const userId = req.user?.sub || req.user?.id;
    return this.service.checkin(dto, userId);
  }

  /** Employee: today's attendance record */
  @Get('today/:employeeId')
  @ApiOperation({ summary: "Get today's attendance for an employee" })
  async today(@Param('employeeId') employeeId: string) {
    return this.service.getTodayRecord(employeeId);
  }

  /** Employee: last N mobile attendance records */
  @Get('history/:employeeId')
  @ApiOperation({ summary: 'Get mobile attendance history' })
  async history(
    @Param('employeeId') employeeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory(employeeId, limit ? parseInt(limit, 10) : 30);
  }

  /** Employee: get own attendance history using JWT (Android alias) */
  @Get('my-history')
  @ApiOperation({ summary: 'Get attendance history for the authenticated employee' })
  async myHistory(@Request() req: any, @Query('limit') limit?: string) {
    const employeeId = req.user?.employeeId || req.user?.sub || req.user?.id;
    return this.service.getHistory(employeeId, limit ? parseInt(limit, 10) : 30);
  }

  /** Employee: register Android device */
  @Post('devices/register')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register mobile device for an employee' })
  async registerDevice(@Body() dto: RegisterDeviceDto) {
    return this.service.registerDevice(dto);
  }

  /** Employee: register Android device (alias used by Android app) */
  @Post('register-device')
  @HttpCode(200)
  @ApiOperation({ summary: 'Register mobile device (alias)' })
  async registerDeviceAlias(@Body() dto: RegisterDeviceDto) {
    return this.service.registerDevice(dto);
  }

  /** Employee: fetch branches with GPS data */
  @Get('branches')
  @ApiOperation({ summary: 'List active branches with GPS geofence data' })
  async branches() {
    return this.service.getActiveBranches();
  }

  /** Employee: get assigned branch info (Android alias) */
  @Get('branch-info')
  @ApiOperation({ summary: "Get employee's assigned branch info" })
  async branchInfo(@Request() req: any) {
    return this.service.getEmployeeBranchInfo(req.user?.employeeId || req.user?.sub || req.user?.id);
  }

  /** Employee: get all branches assigned to the authenticated employee */
  @Get('my-branches')
  @ApiOperation({ summary: "Get all branches assigned to the authenticated employee with their per-branch codes" })
  async myBranches(@Request() req: any) {
    const userId = req.user?.employeeId || req.user?.sub || req.user?.id;
    return this.service.getMyBranches(userId);
  }

  // ── Admin endpoints ───────────────────────────────────────────────────────────────────────────

  /** Admin: get branch assignments for a specific employee */
  @Get('admin/branch-assignments/:employeeId')
  @ApiOperation({ summary: '[Admin] Get branch assignments for an employee' })
  async getEmployeeBranchAssignments(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeBranchAssignments(employeeId);
  }

  /** Admin: assign an employee to a branch with a branch-specific employee code */
  @Post('admin/branch-assignments/:employeeId')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Assign employee to a branch with branch-specific code' })
  async addBranchAssignment(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateBranchAssignmentDto,
  ) {
    return this.service.addBranchAssignment(employeeId, dto);
  }

  /** Admin: remove an employee's branch assignment */
  @Delete('admin/branch-assignments/:employeeId/:branchId')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Remove employee branch assignment' })
  async removeBranchAssignment(
    @Param('employeeId') employeeId: string,
    @Param('branchId') branchId: string,
  ) {
    return this.service.removeBranchAssignment(employeeId, branchId);
  }

  /** Admin: all mobile attendance records, optionally filtered by date */
  @Get('admin/records')
  @ApiOperation({ summary: '[Admin] List all mobile attendance records' })
  async adminRecords(@Query('date') date?: string) {
    return this.service.getAdminRecords(date);
  }

  /** Admin: list registered devices */
  @Get('admin/devices')
  @ApiOperation({ summary: '[Admin] List registered mobile devices' })
  async adminDevices() {
    return this.service.getAdminDevices();
  }

  /** Admin: list employees who signed up and registered via the Android app */
  @Get('admin/members')
  @ApiOperation({ summary: '[Admin] List employees who signed up via Android app' })
  async adminMembers() {
    return this.service.getRegisteredMobileMembers();
  }

  /** Admin: revoke a device */
  @Delete('admin/devices/:deviceId')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Revoke a mobile device' })
  async revokeDevice(@Param('deviceId') deviceId: string) {
    return this.service.revokeDevice(deviceId);
  }

  /** Admin: update an attendance record */
  @Patch('admin/records/:id')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Update a mobile attendance record' })
  async updateRecord(@Param('id') id: string, @Body() body: any) {
    return this.service.updateRecord(id, body);
  }

  /** Admin: delete an attendance record */
  @Delete('admin/records/:id')
  @HttpCode(200)
  @ApiOperation({ summary: '[Admin] Delete a mobile attendance record' })
  async deleteRecord(@Param('id') id: string) {
    return this.service.deleteRecord(id);
  }
}
