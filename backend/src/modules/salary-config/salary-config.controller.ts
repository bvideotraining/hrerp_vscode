import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SalaryConfigService } from './salary-config.service';
import {
  CreateSalaryConfigDto,
  UpdateSalaryConfigDto,
} from './dto/salary-config.dto';

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

@ApiTags('Salary Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/salary-config')
export class SalaryConfigController {
  constructor(private readonly service: SalaryConfigService) {}

  // ─── List ──────────────────────────────────────────────────────────────

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List salary configs — admin sees all, employee sees own' })
  @ApiQuery({ name: 'employeeId', required: false })
  @ApiQuery({ name: 'month', required: false, description: 'Filter by YYYY-MM' })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('month') month?: string,
    @Query('search') search?: string,
  ) {
    if (isAppAdmin(req.user)) {
      return this.service.findAll(employeeId, month, search);
    }
    // Non-admin can only see their own record
    const ownId = req.user?.employeeId;
    if (!ownId) return [];
    return this.service.findAll(ownId, month, search);
  }

  // ─── Load by employee + month (for the editor panel) ───────────────────

  @Get('by-employee')
  @HttpCode(200)
  @ApiOperation({ summary: 'Load salary config for a specific employee + month' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'month', required: true })
  async findByEmployeeAndMonth(
    @Req() req: any,
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
  ) {
    if (!isAppAdmin(req.user) && employeeId !== req.user?.employeeId) {
      throw new ForbiddenException('Access denied');
    }
    // Returns null/undefined when no config exists → frontend initialises empty draft
    return this.service.findByEmployeeAndMonth(employeeId, month);
  }

  // ─── Import allowances from bonuses ────────────────────────────────────

  @Get('import-allowances')
  @HttpCode(200)
  @ApiOperation({ summary: 'Fetch importable allowance items from bonuses module' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'month', required: true })
  importAllowances(
    @Req() req: any,
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
  ) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.importAllowances(employeeId, month);
  }

  // ─── Import deductions from insurance sources ───────────────────────────

  @Get('import-deductions')
  @HttpCode(200)
  @ApiOperation({ summary: 'Fetch importable deduction items from insurance modules' })
  @ApiQuery({ name: 'employeeId', required: true })
  @ApiQuery({ name: 'month', required: true })
  importDeductions(
    @Req() req: any,
    @Query('employeeId') employeeId: string,
    @Query('month') month: string,
  ) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.importDeductions(employeeId, month);
  }

  // ─── Single ────────────────────────────────────────────────────────────

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a single salary config by document id' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const record = await this.service.findOne(id) as any;
    if (!isAppAdmin(req.user) && record.employeeId !== req.user?.employeeId) {
      throw new ForbiddenException('Access denied');
    }
    return record;
  }

  // ─── Create ────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create salary config for an employee + month (admin only)' })
  create(@Body() dto: CreateSalaryConfigDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.create(dto, req.user?.id, req.user?.email);
  }

  // ─── Update ────────────────────────────────────────────────────────────

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update salary config (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateSalaryConfigDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.update(id, dto, req.user?.id, req.user?.email);
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete salary config (admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.remove(id, req.user?.id, req.user?.email);
  }
}
