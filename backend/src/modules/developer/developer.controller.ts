import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeveloperService } from './developer.service';
import { AuthSetupDto, AuthVerifyDto, CreateOwnerDto, UpdateResourceDto } from './dto/index';

@ApiTags('Developer')
@Controller('api/developer')
export class DeveloperController {
  constructor(private developerService: DeveloperService) {}

  /**
   * GET /api/developer/auth/status
   * Check if any owners exist
   */
  @Get('auth/status')
  @ApiOperation({ summary: 'Check if owners exist' })
  async getAuthStatus() {
    try {
      return await this.developerService.getAuthStatus();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to check auth status',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/developer/auth/setup
   * Create the first owner
   */
  @Post('auth/setup')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create first owner account' })
  async setupFirstOwner(@Body() dto: AuthSetupDto) {
    try {
      return await this.developerService.setupFirstOwner(dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to setup owner',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/developer/auth/verify
   * Verify owner credentials
   */
  @Post('auth/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify owner credentials' })
  async verifyOwner(@Body() dto: AuthVerifyDto) {
    try {
      return await this.developerService.verifyOwner(dto);
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to verify owner',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/developer/owners
   * List all owners (names only)
   */
  @Get('owners')
  @ApiOperation({ summary: 'Get all owners' })
  async listOwners() {
    try {
      return await this.developerService.listOwners();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to list owners',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/developer/owners
   * Add a new owner
   */
  @Post('owners')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add new owner account' })
  async addOwner(@Body() dto: CreateOwnerDto) {
    try {
      return await this.developerService.addOwner(dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to add owner',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /api/developer/owners/:id
   * Remove an owner
   */
  @Delete('owners/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove an owner account' })
  async removeOwner(@Param('id') id: string) {
    try {
      return await this.developerService.removeOwner(id);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to remove owner',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/developer/resources
   * Get all platform resources with current env values
   */
  @Get('resources')
  @ApiOperation({ summary: 'Get all platform resources' })
  async getResources() {
    try {
      return await this.developerService.getResources();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to get resources',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/developer/resources/:key
   * Update a resource value
   */
  @Put('resources/:key')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update a platform resource' })
  async updateResource(
    @Param('key') key: string,
    @Body() dto: UpdateResourceDto,
  ) {
    try {
      return await this.developerService.updateResource(key, dto);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to update resource',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/developer/firebase-client-config
   * PUBLIC endpoint — get Firebase client config
   */
  @Get('firebase-client-config')
  @ApiOperation({ summary: 'Get Firebase client configuration (public endpoint)' })
  async getFirebaseClientConfig() {
    try {
      return await this.developerService.getFirebaseClientConfig();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to get Firebase client config',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/developer/restart
   * Trigger server restart
   */
  @Post('restart')
  @HttpCode(200)
  @ApiOperation({ summary: 'Trigger graceful server restart' })
  async restartServer() {
    try {
      return await this.developerService.restartServer();
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to restart server',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
