import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackupsService } from './backups.service';
import { CreateBackupDto } from './dto/create-backup.dto';

@Controller('backups')
@UseGuards(JwtAuthGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  // ==============================
  // CREATE BACKUP
  // POST /backups
  // ==============================

  @Post()
  create(@Req() req: any, @Body() dto: CreateBackupDto) {
    return this.backupsService.create(req.user.id, dto);
  }

  // ==============================
  // LATEST BACKUP
  // GET /backups/latest?includePayload=true
  // ==============================

  @Get('latest')
  findLatest(
    @Req() req: any,
    @Query('includePayload') includePayload?: string | boolean,
  ) {
    return this.backupsService.findLatest(
      req.user.id,
      includePayload === true || includePayload === 'true',
    );
  }
}