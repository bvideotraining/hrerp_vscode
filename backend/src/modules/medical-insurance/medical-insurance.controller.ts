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
import { MedicalInsuranceService } from './medical-insurance.service';
import {
  CreateMedicalInsuranceDto,
  UpdateMedicalInsuranceDto,
} from './dto/medical-insurance.dto';

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

@ApiTags('Medical Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/medical-insurance')
export class MedicalInsuranceController {
  constructor(private readonly service: MedicalInsuranceService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Get all medical insurance policies (admin) or own policy (employee)',
  })
  findAll(
    @Req() req: any,
    @Query('employeeId') employeeId?: string,
    @Query('search') search?: string,
  ) {
    if (isAppAdmin(req.user)) {
      return this.service.findAll(
        employeeId || undefined,
        search || undefined,
      );
    }
    // Non-admin employees see only their own record
    const ownEmployeeId = req.user?.employeeId;
    if (!ownEmployeeId) return [];
    return this.service.findAll(ownEmployeeId);
  }

  @Get(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Get a single medical insurance policy' })
  findOne(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user) && req.user?.employeeId !== id) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a medical insurance policy (Application Admin only)',
  })
  create(@Body() dto: CreateMedicalInsuranceDto, @Req() req: any) {
    if (!isAppAdmin(req.user))
      throw new ForbiddenException('Insufficient permissions');
    return this.service.create(dto);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Update a medical insurance policy (Application Admin only)',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMedicalInsuranceDto,
    @Req() req: any,
  ) {
    if (!isAppAdmin(req.user))
      throw new ForbiddenException('Insufficient permissions');
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Delete a medical insurance policy (Application Admin only)',
  })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user))
      throw new ForbiddenException('Insufficient permissions');
    return this.service.remove(id);
  }
}
