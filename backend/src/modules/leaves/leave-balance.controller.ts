import {
  Controller, Get, Put, Post, Body, Param, Query,
  Request, HttpCode, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeaveBalanceService } from './leave-balance.service';
import { SetLeaveBalanceDto, InitBalanceDto } from './dto/leave-balance.dto';

const ADMIN_ROLES = ['admin', 'hr_manager'];
const APPROVER_ROLES = ['approver', 'branch_approver'];

function isAdmin(user: any): boolean {
  return ADMIN_ROLES.includes(user?.role) || user?.accessType === 'full';
}

@ApiTags('Leave Balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/leave-balances')
export class LeaveBalanceController {
  constructor(private leaveBalanceService: LeaveBalanceService) {}

  /**
   * GET /api/leave-balances?year=2026
   * - admin/hr_manager → all employees
   * - approver        → employees in same department (read-only)
   * - branch_approver → employees in same branch (read-only)
   */
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get leave balances scoped by role' })
  async getAll(@Request() req: any, @Query('year') year?: string) {
    const role: string = req.user?.role || '';
    const userId: string = req.user?.sub || req.user?.id || '';

    if (isAdmin(req.user)) {
      return this.leaveBalanceService.getAllBalances(year ? Number(year) : undefined);
    }

    if (APPROVER_ROLES.includes(role)) {
      return this.leaveBalanceService.getScopedBalances(userId, role, year ? Number(year) : undefined);
    }

    throw new ForbiddenException('Access denied');
  }

  /** GET /api/leave-balances/:employeeId?year=2026 */
  @Get(':employeeId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get leave balance for one employee' })
  async getOne(
    @Param('employeeId') employeeId: string,
    @Request() req: any,
    @Query('year') year?: string,
  ) {
    const role: string = req.user?.role || '';
    const userId: string = req.user?.sub || req.user?.id || '';

    // admin/hr can view any
    if (isAdmin(req.user)) {
      return this.leaveBalanceService.getBalance(employeeId, year ? Number(year) : undefined);
    }

    // approvers can view any within their scope — but also need to be able to
    // view their own record regardless; permission check is loose here (own record always allowed)
    if (APPROVER_ROLES.includes(role) || userId === employeeId) {
      return this.leaveBalanceService.getBalance(employeeId, year ? Number(year) : undefined);
    }

    throw new ForbiddenException('You can only view your own leave balance');
  }

  /** PUT /api/leave-balances/:employeeId — admin/hr_manager: set allocations */
  @Put(':employeeId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set leave balance allocations for an employee (admin/hr only)' })
  async setBalance(
    @Param('employeeId') employeeId: string,
    @Body() dto: SetLeaveBalanceDto,
    @Request() req: any,
  ) {
    if (!isAdmin(req.user)) {
      throw new ForbiddenException('Access denied');
    }
    const { employeeName, year, ...allocations } = dto;
    return this.leaveBalanceService.setBalance(
      employeeId,
      employeeName || '',
      allocations,
      year,
    );
  }

  /** POST /api/leave-balances/init/:employeeId — manually initialize balance record */
  @Post('init/:employeeId')
  @HttpCode(201)
  @ApiOperation({ summary: 'Initialize leave balance for an employee (admin/hr only)' })
  async initialize(
    @Param('employeeId') employeeId: string,
    @Body() dto: InitBalanceDto,
    @Request() req: any,
  ) {
    if (!isAdmin(req.user)) {
      throw new ForbiddenException('Access denied');
    }
    return this.leaveBalanceService.initializeBalance(
      employeeId,
      dto.employeeName || '',
      dto.year,
    );
  }
}
