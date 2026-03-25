import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { BonusesService } from './bonuses.service';
import { CreateBonusDto, UpdateBonusDto, SyncSaturdaysDto } from './dto/bonus.dto';

const ADMIN_ROLES = ['admin', 'hr_manager'];

function isAdmin(user: any): boolean {
  return ADMIN_ROLES.includes(user?.role) || user?.accessType === 'full';
}

@Controller('api/bonuses')
@UseGuards(JwtAuthGuard)
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  @Get()
  findAll(
    @Query('monthId') monthId?: string,
    @Query('branch') branch?: string,
    @Query('category') category?: string,
  ) {
    return this.bonusesService.findAll(monthId, branch, category);
  }

  @Post()
  create(@Body() dto: CreateBonusDto, @Req() req: any) {
    if (!isAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.bonusesService.upsert(dto);
  }

  @Post('sync-saturdays')
  syncSaturdays(@Body() dto: SyncSaturdaysDto, @Req() req: any) {
    if (!isAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.bonusesService.syncSaturdays(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBonusDto, @Req() req: any) {
    if (!isAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.bonusesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    if (!isAdmin(req.user)) throw new ForbiddenException('Insufficient permissions');
    return this.bonusesService.remove(id);
  }
}
