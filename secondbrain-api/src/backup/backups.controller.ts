import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BackupsService } from './backups.service';
import { CreateBackupDto, ListBackupsQueryDto } from './dto/create-backup.dto';

// Every route is JWT-guarded and derives the acting user from req.user.id.
// No route accepts a userId from the client, so a user cannot address another
// account's backup by editing a request.
@Controller('backups')
@UseGuards(JwtAuthGuard)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  // POST /backups
  // Uploads a new snapshot. 201 Created, metadata only (no payload echo).
  @Post()
  create(@Req() req: any, @Body() dto: CreateBackupDto) {
    return this.backupsService.create(req.user.id, dto);
  }

  // GET /backups/latest?includePayload=true
  // The restore download. 404 when the account has no backup yet.
  @Get('latest')
  findLatest(
    @Req() req: any,
    @Query('includePayload', new ParseBoolPipe({ optional: true })) includePayload?: boolean,
  ) {
    return this.backupsService.findLatest(req.user.id, includePayload === true);
  }

  // GET /backups?take=20
  // Backup history (metadata only).
  @Get()
  list(@Req() req: any, @Query() query: ListBackupsQueryDto) {
    return this.backupsService.list(req.user.id, query.take ?? 20);
  }

  // DELETE /backups/:id
  // Scoped to the owner server-side; another account's id yields 404.
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Req() req: any, @Param('id') id: string) {
    return this.backupsService.remove(req.user.id, id);
  }
}
