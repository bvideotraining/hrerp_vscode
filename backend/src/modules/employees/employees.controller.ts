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
  async findAll(@Query() filters: EmployeeFilterDto) {
    return this.employeesService.findAll(filters);
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

  @Put(':id')
  @ApiOperation({ summary: 'Update employee' })
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req: any
  ) {
    return this.employeesService.update(id, updateEmployeeDto, req.user.id);
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
