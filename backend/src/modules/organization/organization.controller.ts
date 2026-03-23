import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { OrganizationService } from './organization.service';
import { BrandingDto } from './dto/branding.dto';
import { BranchDto } from './dto/branch.dto';
import { DepartmentDto } from './dto/department.dto';
import { JobTitleDto } from './dto/job-title.dto';
import { MonthRangeDto } from './dto/month-range.dto';
import { AttendanceRuleDto } from './dto/attendance-rule.dto';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/organization')
export class OrganizationController {
  constructor(private orgService: OrganizationService) {}

  // ── Branding ────────────────────────────────────────
  @Get('branding')
  @ApiOperation({ summary: 'Get app branding' })
  getBranding() {
    return this.orgService.getBranding();
  }

  @Put('branding')
  @ApiOperation({ summary: 'Update app branding' })
  updateBranding(@Body() dto: BrandingDto) {
    return this.orgService.updateBranding(dto);
  }

  // ── Branches ─────────────────────────────────────────
  @Get('branches')
  @ApiOperation({ summary: 'Get all branches' })
  getBranches() {
    return this.orgService.getBranches();
  }

  @Post('branches')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create branch' })
  createBranch(@Body() dto: BranchDto) {
    return this.orgService.createBranch(dto);
  }

  @Put('branches/:id')
  @ApiOperation({ summary: 'Update branch' })
  updateBranch(@Param('id') id: string, @Body() dto: BranchDto) {
    return this.orgService.updateBranch(id, dto);
  }

  @Delete('branches/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete branch' })
  deleteBranch(@Param('id') id: string) {
    return this.orgService.deleteBranch(id);
  }

  // ── Departments ───────────────────────────────────────
  @Get('departments')
  @ApiOperation({ summary: 'Get all departments' })
  getDepartments() {
    return this.orgService.getDepartments();
  }

  @Post('departments')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create department' })
  createDepartment(@Body() dto: DepartmentDto) {
    return this.orgService.createDepartment(dto);
  }

  @Put('departments/:id')
  @ApiOperation({ summary: 'Update department' })
  updateDepartment(@Param('id') id: string, @Body() dto: DepartmentDto) {
    return this.orgService.updateDepartment(id, dto);
  }

  @Delete('departments/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete department' })
  deleteDepartment(@Param('id') id: string) {
    return this.orgService.deleteDepartment(id);
  }

  // ── Job Titles ────────────────────────────────────────
  @Get('job-titles')
  @ApiOperation({ summary: 'Get all job titles' })
  getJobTitles() {
    return this.orgService.getJobTitles();
  }

  @Post('job-titles')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create job title' })
  createJobTitle(@Body() dto: JobTitleDto) {
    return this.orgService.createJobTitle(dto);
  }

  @Put('job-titles/:id')
  @ApiOperation({ summary: 'Update job title' })
  updateJobTitle(@Param('id') id: string, @Body() dto: JobTitleDto) {
    return this.orgService.updateJobTitle(id, dto);
  }

  @Delete('job-titles/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete job title' })
  deleteJobTitle(@Param('id') id: string) {
    return this.orgService.deleteJobTitle(id);
  }

  // ── Month Ranges ──────────────────────────────────────
  @Get('month-ranges')
  @ApiOperation({ summary: 'Get all month ranges' })
  getMonthRanges() {
    return this.orgService.getMonthRanges();
  }

  @Post('month-ranges')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create month range' })
  createMonthRange(@Body() dto: MonthRangeDto) {
    return this.orgService.createMonthRange(dto);
  }

  @Put('month-ranges/:id')
  @ApiOperation({ summary: 'Update month range' })
  updateMonthRange(@Param('id') id: string, @Body() dto: MonthRangeDto) {
    return this.orgService.updateMonthRange(id, dto);
  }

  @Delete('month-ranges/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete month range' })
  deleteMonthRange(@Param('id') id: string) {
    return this.orgService.deleteMonthRange(id);
  }

  // ── Attendance Rules ──────────────────────────────────
  @Get('attendance-rules')
  @ApiOperation({ summary: 'Get attendance rules for all categories' })
  getAttendanceRules() {
    return this.orgService.getAttendanceRules();
  }

  @Put('attendance-rules/:category')
  @ApiOperation({ summary: 'Update attendance rule for a category' })
  updateAttendanceRule(
    @Param('category') category: string,
    @Body() dto: AttendanceRuleDto,
  ) {
    return this.orgService.updateAttendanceRule(category, dto);
  }
}
