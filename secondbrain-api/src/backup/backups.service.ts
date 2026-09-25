import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBackupDto } from './dto/create-backup.dto';

const SUPPORTED_BACKUP_VERSION = 1;
const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024;

type BackupMeta = {
  id: string;
  backupVersion: number;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class BackupsService {
  constructor(private prisma: PrismaService) {}

  // Creates a new logical backup for the authenticated user. Ownership is
  // always derived from req.user.id (passed in as userId); any userId inside
  // the payload is only cross-checked, never trusted for authorization.
  async create(userId: string, dto: CreateBackupDto) {
    const payload = dto.payload;

    if (payload.backupVersion !== SUPPORTED_BACKUP_VERSION) {
      throw new BadRequestException('Unsupported backup version');
    }

    if (typeof payload.userId === 'string' && payload.userId !== userId) {
      throw new ForbiddenException('Backup does not belong to the authenticated user');
    }

    const sizeBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (sizeBytes > MAX_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException('Backup is too large');
    }

    const backup = await this.prisma.backup.create({
      data: {
        userId,
        backupVersion: payload.backupVersion as number,
        payload: payload as Prisma.InputJsonValue,
        sizeBytes,
      },
    });

    return {
      id: backup.id,
      backupVersion: backup.backupVersion,
      sizeBytes: backup.sizeBytes,
      createdAt: backup.createdAt,
      updatedAt: backup.updatedAt,
    } satisfies BackupMeta;
  }

  // Returns the most recent backup owned by the authenticated user. The payload
  // is only included for restoration (includePayload=true), keeping the Settings
  // metadata call light.
  async findLatest(userId: string, includePayload: boolean) {
    const backup = await this.prisma.backup.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!backup) {
      throw new NotFoundException('No backup available');
    }

    if (!includePayload) {
      return {
        id: backup.id,
        backupVersion: backup.backupVersion,
        sizeBytes: backup.sizeBytes,
        createdAt: backup.createdAt,
        updatedAt: backup.updatedAt,
      } satisfies BackupMeta;
    }

    return {
      id: backup.id,
      backupVersion: backup.backupVersion,
      sizeBytes: backup.sizeBytes,
      createdAt: backup.createdAt,
      updatedAt: backup.updatedAt,
      payload: backup.payload,
    };
  }
}