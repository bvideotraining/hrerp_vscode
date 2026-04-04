import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceFilterDto } from './dto/attendance-filter.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new attendance log' })
  async create(@Body() dto: CreateAttendanceDto, @Request() req: any) {
    return this.attendanceService.create(dto, req.user.id);
  }

  @Get('import-template')
  @ApiOperation({ summary: 'Get import column guide and example row' })
  getImportTemplate() {
    return this.attendanceService.getImportTemplate();
  }

  @Get('export')
  @ApiOperation({ summary: 'Get all records matching filters for file export (no pagination)' })
  async export(@Query() filters: AttendanceFilterDto, @Request() req: any) {
    return this.attendanceService.getExportData(filters, {
      userId: req.user?.sub || req.user?.id || '',
      role: req.user?.role || '',
      accessType: req.user?.accessType || '',
      employeeId: req.user?.employeeId || '',
    });
  }

  @Post('bulk-import')
  @HttpCode(201)
  @ApiOperation({ summary: 'Bulk import attendance records' })
  async bulkImport(
    @Body() body: { records: CreateAttendanceDto[] },
    @Request() req: any,
  ) {
    return this.attendanceService.bulkImport(body.records, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get attendance records with optional filters + pagination' })
  async findAll(@Query() filters: AttendanceFilterDto, @Request() req: any) {
    const userContext = {
      userId: req.user?.sub || req.user?.id || '',
      role: req.user?.role || '',
      accessType: req.user?.accessType || '',
      employeeId: req.user?.employeeId || '',
    };
    console.log('[AttendanceController] User context for attendance:', userContext);
    return this.attendanceService.findAll(filters, userContext);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single attendance record by ID' })
  async findById(@Param('id') id: string) {
    return this.attendanceService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an attendance record' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAttendanceDto,
    @Request() req: any,
  ) {
    return this.attendanceService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an attendance record' })
  async delete(@Param('id') id: string) {
    return this.attendanceService.delete(id);
  }
}
