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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create new employee' })
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @Request() req: any
  ) {
    return this.employeesService.create(createEmployeeDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all employees with optional filters' })
  async findAll(@Query() filters: EmployeeFilterDto, @Request() req: any) {
    return this.employeesService.findAll(filters, {
      userId: req.user?.sub || req.user?.id || '',
      role: req.user?.role || '',
      accessType: req.user?.accessType || '',
      employeeId: req.user?.employeeId || '',
    });
  }

  @Get('search/:term')
  @ApiOperation({ summary: 'Search employees by name, email, or code' })
  async search(@Param('term') term: string) {
    return this.employeesService.search(term);
  }

  @Get('department/:department')
  @ApiOperation({ summary: 'Get employees by department' })
  async getByDepartment(@Param('department') department: string) {
    return this.employeesService.getByDepartment(department);
  }

  @Get('branch/:branch')
  @ApiOperation({ summary: 'Get employees by branch' })
  async getByBranch(@Param('branch') branch: string) {
    return this.employeesService.getByBranch(branch);
  }

  @Get('stats/active-count')
  @ApiOperation({ summary: 'Get count of active employees' })
  async getActiveCount() {
    return this.employeesService.getActiveCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  async findById(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }

  // NOTE: This route must be registered BEFORE @Put(':id') so NestJS does not
  // treat 'upload-photo' as an employee ID.
  @Post('upload-photo')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload a profile photo to Firebase Storage, returns URL' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.employeesService.uploadPhoto(file);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update employee' })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req: any
  ) {
    return this.employeesService.update(id, updateEmployeeDto, req.user.id);
  }

  @Put(':id/documents')
  @ApiOperation({ summary: 'Update employee documents only — bypasses DTO whitelist' })
  async updateDocuments(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any
  ) {
    const documents = Array.isArray(body.documents) ? body.documents : [];
    return this.employeesService.updateDocuments(id, documents, req.user.id);
  }

  @Post(':id/upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload a document file to Firebase Storage, returns URL' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.employeesService.uploadDocument(id, file);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete employee' })
  async delete(@Param('id') id: string) {
    return this.employeesService.delete(id);
  }

  @Post('batch/create')
  @HttpCode(201)
  @ApiOperation({ summary: 'Batch create multiple employees' })
  async batchCreate(
    @Body() employees: CreateEmployeeDto[],
    @Request() req: any
  ) {
    return this.employeesService.batchCreate(employees, req.user.id);
  }
}
