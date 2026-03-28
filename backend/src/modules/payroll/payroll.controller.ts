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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { PayrollService } from './payroll.service';
import {
  GeneratePayrollDto,
  UpdatePayrollDto,
  PayrollFilterDto,
} from './dto/payroll.dto';

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List payroll records (admin=all, employee=own)' })
  findAll(@Query() filters: PayrollFilterDto, @Req() req: any) {
    // Employee role is scoped to own records only
    const scopeEmployeeId = !isAppAdmin(req.user) ? req.user?.employeeId : undefined;
    return this.service.findAll(filters, scopeEmployeeId);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a single payroll record' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const record = await this.service.findOne(id) as any;
    if (!isAppAdmin(req.user) && record.employeeId !== req.user?.employeeId) {
      throw new ForbiddenException('Access denied');
    }
    return record;
  }

  /** Generate / regenerate a payroll record (admin only) */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Generate payroll for an employee/month (admin only)' })
  generate(@Body() dto: GeneratePayrollDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.generate(dto);
  }

  /** Recalculate draft payroll (admin only) */
  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Recalculate draft payroll with overrides (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePayrollDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.update(id, dto);
  }

  /** Publish a draft → lock it as final (admin only) */
  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish a draft payroll record (admin only)' })
  publish(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.publish(id);
  }

  /** Delete a payroll record (admin only; works on both draft and published) */
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete payroll record (admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.remove(id);
  }
}
