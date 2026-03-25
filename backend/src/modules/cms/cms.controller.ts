import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CmsService } from './cms.service';
import { CreateCmsPageDto, UpdateCmsPageDto, MenuConfigDto } from './dto/cms-page.dto';

@ApiTags('CMS')
@Controller('api/cms')
export class CmsController {
  constructor(private cmsService: CmsService) {}

  // ── Public endpoints (no auth) ──────────────────────────────────

  @Get('public/pages')
  @ApiOperation({ summary: 'Get published pages for public site' })
  getPublishedPages() {
    return this.cmsService.getPublishedPages();
  }

  @Get('public/menu')
  @ApiOperation({ summary: 'Get published menu pages' })
  getMenu() {
    return this.cmsService.getPublishedMenuPages();
  }

  @Get('public/pages/:slug')
  @ApiOperation({ summary: 'Get a published page by slug' })
  getPageBySlug(@Param('slug') slug: string) {
    return this.cmsService.getPageBySlug(slug);
  }

  @Get('public/menu-config')
  @ApiOperation({ summary: 'Get menu configuration for public site' })
  getPublicMenuConfig() {
    return this.cmsService.getMenuConfig();
  }

  @Post('public/forms/submit')
  @HttpCode(200)
  @ApiOperation({ summary: 'Submit a CMS form (public, no auth)' })
  submitForm(
    @Body()
    body: {
      pageSlug: string;
      blockId: string;
      firestoreCollection: string;
      fields: Record<string, any>;
    },
  ) {
    return this.cmsService.submitForm(body);
  }

  // ── Admin endpoints (auth required) ─────────────────────────────

  @Get('pages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all CMS pages (admin)' })
  getAllPages() {
    return this.cmsService.getPages();
  }

  @Get('pages/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get CMS page by ID (admin)' })
  getPageById(@Param('id') id: string) {
    return this.cmsService.getPageById(id);
  }

  @Post('pages')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a CMS page' })
  createPage(@Body() dto: CreateCmsPageDto) {
    return this.cmsService.createPage(dto);
  }

  @Put('pages/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a CMS page' })
  updatePage(@Param('id') id: string, @Body() dto: UpdateCmsPageDto) {
    return this.cmsService.updatePage(id, dto);
  }

  @Delete('pages/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a CMS page' })
  deletePage(@Param('id') id: string) {
    return this.cmsService.deletePage(id);
  }

  @Post('upload-image')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Upload an image for CMS content' })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.cmsService.uploadImage(file.buffer, file.mimetype, file.originalname);
  }

  // ── Menu config endpoints ───────────────────────────────────────

  @Get('menu-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get menu configuration (admin)' })
  getMenuConfig() {
    return this.cmsService.getMenuConfig();
  }

  @Put('menu-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update menu configuration' })
  updateMenuConfig(@Body() dto: MenuConfigDto) {
    return this.cmsService.updateMenuConfig(dto);
  }
}
