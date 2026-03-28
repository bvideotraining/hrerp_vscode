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
import { SalaryIncreasesService } from './salary-increases.service';
import {
  CreateSalaryIncreaseDto,
  UpdateSalaryIncreaseDto,
} from './dto/salary-increase.dto';

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

@ApiTags('Salary Increases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/salary-increases')
export class SalaryIncreasesController {
  constructor(private readonly service: SalaryIncreasesService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'List salary increases (admin) or own (employee)' })
  findAll(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
  ) {
    if (isAppAdmin(req.user)) {
      return this.service.findAll(employeeId, search);
    }
    const ownId = req.user?.employeeId;
    if (!ownId) return [];
    return this.service.findAll(ownId);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a salary increase record' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const record = await this.service.findOne(id) as any;
    if (!isAppAdmin(req.user) && record.employeeId !== req.user?.employeeId) {
      throw new ForbiddenException('Access denied');
    }
    return record;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Add salary increase (admin only)' })
  create(@Body() dto: CreateSalaryIncreaseDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.create(dto);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update salary increase (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateSalaryIncreaseDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete salary increase (admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.remove(id);
  }
}
