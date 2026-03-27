import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, HttpCode,
  UseGuards, UseInterceptors, UploadedFile, ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { SocialInsuranceService } from './social-insurance.service';
import {
  CreateSocialInsuranceDto,
  UpdateSocialInsuranceDto,
} from './dto/social-insurance.dto';

function isAppAdmin(user: any): boolean {
  return user?.accessType === 'full';
}

@ApiTags('Social Insurance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/social-insurance')
export class SocialInsuranceController {
  constructor(private readonly service: SocialInsuranceService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'Get all social insurance policies (admin) or own policy (employee)' })
  findAll(@Req() req: any, @Query('employeeId') employeeId?: string) {
    if (isAppAdmin(req.user)) {
      // Admin can optionally filter by employeeId
      return this.service.findAll(employeeId || undefined);
    }
    // Non-admin employees see only their own record
    const ownEmployeeId = req.user?.employeeId;
    if (!ownEmployeeId) return [];
    return this.service.findAll(ownEmployeeId);
  }

  @Get(':id')
  @HttpCode(200)
  findOne(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user) && req.user?.employeeId !== id) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a social insurance policy (Application Admin only)' })
  create(@Body() dto: CreateSocialInsuranceDto, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.create(dto);
  }

  /** Upload an attachment file before creating the policy (returns {url, name, mimeType}) */
  @Post('upload-attachment')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload a social insurance form attachment (Admin only)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.uploadAttachment(file);
  }

  /** Upload an attachment to an existing policy */
  @Post(':id/upload-attachment')
  @HttpCode(200)
  @ApiOperation({ summary: 'Upload a form attachment to an existing policy (Admin only)' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPolicyAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('formType') formType: string,
    @Req() req: any,
  ) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.uploadPolicyAttachment(id, file, formType);
  }

  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a social insurance policy (Application Admin only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSocialInsuranceDto,
    @Req() req: any,
  ) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete a social insurance policy (Application Admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isAppAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.service.remove(id);
  }
}
