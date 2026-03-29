import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CashAdvancesService } from './cash-advances.service';
import {
  CreateCashAdvanceDto,
  UpdateCashAdvanceDto,
  DecideCashAdvanceDto,
} from './dto/cash-advance.dto';

@ApiTags('Cash Advances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/cash-advances')
export class CashAdvancesController {
  constructor(private readonly cashAdvancesService: CashAdvancesService) {}

  // ── POST /api/cash-advances ─────────────────────────────────────────────
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Submit a cash advance request' })
  async create(@Body() dto: CreateCashAdvanceDto, @Request() req: any) {
    const createdBy = req.user?.sub || req.user?.id || req.user?.employeeId || '';
    return this.cashAdvancesService.create(dto, createdBy);
  }

  // ── GET /api/cash-advances ──────────────────────────────────────────────
  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List cash advance requests (role-scoped)' })
  async findAll(
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
    @Request() req: any = {},
  ) {
    const requesterId = req.user?.sub || req.user?.id || req.user?.employeeId || '';
    const requesterRole = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    return this.cashAdvancesService.findAll(requesterId, requesterRole, accessType, employeeId, status);
  }

  // ── GET /api/cash-advances/:id ──────────────────────────────────────────
  @Get(':id')
  @HttpCode(200)
  async findOne(@Param('id') id: string, @Request() req: any) {
    const requesterId = req.user?.sub || req.user?.id || req.user?.employeeId || '';
    const requesterRole = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    return this.cashAdvancesService.findOne(id, requesterId, requesterRole, accessType);
  }

  // ── PATCH /api/cash-advances/:id ───────────────────────────────────────
  @Patch(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Edit a cash advance request (admin: any; employee: own pending only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCashAdvanceDto,
    @Request() req: any,
  ) {
    const requesterId = req.user?.sub || req.user?.id || req.user?.employeeId || '';
    const requesterRole = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    return this.cashAdvancesService.update(id, dto, requesterId, requesterRole, accessType);
  }

  // ── POST /api/cash-advances/:id/decide ─────────────────────────────────
  @Post(':id/decide')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve or reject a cash advance request (application admin only)' })
  async decide(
    @Param('id') id: string,
    @Body() dto: DecideCashAdvanceDto,
    @Request() req: any,
  ) {
    const deciderId = req.user?.sub || req.user?.id || req.user?.employeeId || '';
    const accessType = req.user?.accessType || '';
    return this.cashAdvancesService.decide(id, dto, deciderId, accessType);
  }

  // ── DELETE /api/cash-advances/:id ──────────────────────────────────────
  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a cash advance request (admin: any; employee: own pending only)' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const requesterId = req.user?.sub || req.user?.id || req.user?.employeeId || '';
    const requesterRole = req.user?.role || '';
    const accessType = req.user?.accessType || '';
    return this.cashAdvancesService.remove(id, requesterId, requesterRole, accessType);
  }
}
