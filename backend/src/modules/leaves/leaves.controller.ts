import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Request, HttpCode, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';

@ApiTags('Leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/leaves')
export class LeavesController {
  constructor(private leavesService: LeavesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a leave request' })
  async create(@Body() dto: CreateLeaveDto, @Request() req: any) {
    const createdBy = req.user?.sub || req.user?.id || dto.employeeId;
    return this.leavesService.create(dto, createdBy);
  }

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get leave requests (filter by employeeId and/or status)' })
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Request() req: any = {},
  ) {
    const role = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    const userId = req.user?.sub || req.user?.id || '';
    return this.leavesService.findAll(employeeId, status, role, userId, accessType);
  }

  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string) {
    return this.leavesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update leave (admin/hr/application-admin can approve/reject; approvers can approve/reject; employees edit own pending)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeaveDto,
    @Request() req: any,
  ) {
    const requesterId = req.user?.sub || req.user?.id || '';
    const requesterRole = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    return this.leavesService.update(id, dto, requesterId, requesterRole, accessType);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id') id: string, @Request() req: any) {
    const requesterId = req.user?.sub || req.user?.id || '';
    const requesterRole = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    return this.leavesService.remove(id, requesterId, requesterRole, accessType);
  }
}
