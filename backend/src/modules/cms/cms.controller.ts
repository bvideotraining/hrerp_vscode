import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpException,
  HttpStatus,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CmsService } from './cms.service';
import { CreateCmsPageDto, UpdateCmsPageDto, MenuConfigDto } from './dto/cms-page.dto';
import { PixabayService } from './services/pixabay.service';
import { FirebasePixabayStorageService } from './services/firebase-pixabay-storage.service';
import { PixabaySearchParams, SavePixabayItemDto } from './dto/pixabay.dto';

@ApiTags('CMS')
@Controller('api/cms')
export class CmsController {
  constructor(
    private cmsService: CmsService,
    private pixabayService: PixabayService,
    private firebasePixabayStorageService: FirebasePixabayStorageService,
  ) {}

  // ── Pixabay endpoints (placed BEFORE generic routes) ─────────────────

  @Get('pixabay/status')
  @ApiOperation({ summary: 'Check Pixabay API availability and config' })
  getPixabayStatus() {
    return { success: true, data: this.pixabayService.getStatus() };
  }

  @Post('pixabay/search')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Search Pixabay for images, videos, or music' })
  async searchPixabay(
    @Body() body: { query: string; page?: number; mediaType?: string; filters?: Partial<PixabaySearchParams> },
  ) {
    if (!body.query?.trim()) {
      throw new HttpException({ success: false, message: 'Please enter a search term' }, HttpStatus.BAD_REQUEST);
    }

    const params: PixabaySearchParams = {
      query: body.query.trim(),
      page: body.page || 1,
      ...body.filters,
    };

    try {
      let result: any;
      const mediaType = body.mediaType || 'image';

      if (mediaType === 'video') {
        result = await this.pixabayService.searchVideos(params);
      } else if (mediaType === 'music') {
        result = await this.pixabayService.searchMusic(params);
      } else {
        result = await this.pixabayService.searchImages(params);
      }

      return { success: true, data: result };
    } catch (err: any) {
      const status = err?.status || 500;
      throw new HttpException({ success: false, code: err?.code || 'SEARCH_FAILED', message: err?.message || 'Search failed' }, status);
    }
  }

  @Post('pixabay/save-item')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Download a Pixabay item, optionally compress, and save to Firebase Storage' })
  async savePixabayItem(@Body() dto: SavePixabayItemDto) {
    try {
      const saved = await this.firebasePixabayStorageService.savePixabayItem(dto);
      return { success: true, data: saved };
    } catch (err: any) {
      throw new HttpException({ success: false, message: err?.message || 'Failed to save item' }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('pixabay/saved-items')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get previously saved Pixabay items from Firebase' })
  async getSavedPixabayItems(
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const result = await this.firebasePixabayStorageService.getSavedItems(
      type,
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 20,
    );
    return { success: true, data: result };
  }

  @Delete('pixabay/saved-items/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a saved Pixabay item from Firebase' })
  async deleteSavedPixabayItem(@Param('id') id: string) {
    await this.firebasePixabayStorageService.deleteSavedItem(id);
    return { success: true, message: 'Item deleted' };
  }

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
