import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBackupDto } from './dto/create-backup.dto';
import {
  ALLOWED_ENCODINGS,
  BACKUP_VERSION_MAX,
  BACKUP_VERSION_MIN,
  type BackupMetadata,
  checksumOfData,
  findForbiddenKeys,
  MAX_PAYLOAD_BYTES,
  readRecordCounts,
  toMetadata,
} from './backup-format';

// Cloud half of Birbal's Backup & Restore.
//
// Security model
// --------------
// The ONLY identity used is `req.user.id` (a verified JWT subject). A
// userId inside the request body is treated as an untrusted cross-check: a
// mismatch is rejected, never used for authorization. Reads are always
// `WHERE userId = <jwt subject>`, so one account can never see, overwrite or
// delete another account's backups regardless of what it sends.
//
// The payload is treated as opaque user content: it is size-capped, version
// checked, screened for credential-shaped keys and checksum-verified. It is
// never logged.

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── POST /backups ────────────────────────────────────────────────────────
  // Stores a new snapshot for the authenticated user. Every request creates a
  // new row (a backup history) so a user can always fall back to an earlier
  // snapshot; the mobile client reads the newest one.
  async create(userId: string, dto: CreateBackupDto): Promise<BackupMetadata> {
    const payload = dto.payload as Record<string, unknown>;
    const version = Number(payload.backupVersion);

    if (
      !Number.isInteger(version) ||
      version < BACKUP_VERSION_MIN ||
      version > BACKUP_VERSION_MAX
    ) {
      throw new BadRequestException(
        `Unsupported backup version (supported: ${BACKUP_VERSION_MIN}-${BACKUP_VERSION_MAX})`,
      );
    }

    // Cross-check only. Authorization is derived from the JWT above.
    if (typeof payload.userId === 'string' && payload.userId !== userId) {
      throw new ForbiddenException('Backup does not belong to the authenticated user');
    }

    const encoding = typeof payload.encoding === 'string' ? payload.encoding : 'json';
    if (!(ALLOWED_ENCODINGS as readonly string[]).includes(encoding)) {
      throw new BadRequestException('Unsupported backup encoding');
    }

    const sizeBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');
    if (sizeBytes > MAX_PAYLOAD_BYTES) {
      throw new PayloadTooLargeException('Backup is too large');
    }

    // Defence in depth: a backup must never carry credentials, even if a
    // future client build were to include them by mistake.
    const leaked = findForbiddenKeys(payload);
    if (leaked.length > 0) {
      this.logger.warn(
        `Rejected backup upload for user ${userId}: payload contained credential-shaped keys (${leaked.length})`,
      );
      throw new BadRequestException('Backup payload must not contain credentials');
    }

    // Integrity: if the client declared a checksum, it must match the data we
    // actually received, otherwise the snapshot is already corrupt in transit.
    let checksum: string | null = null;
    if (typeof payload.checksum === 'string' && payload.checksum.length > 0) {
      const actual = checksumOfData(payload.data);
      if (actual !== payload.checksum) {
        throw new BadRequestException('Backup integrity check failed');
      }
      checksum = actual;
    }

    const backup = await this.prisma.backup.create({
      data: {
        userId,
        backupVersion: version,
        payload: payload as Prisma.InputJsonValue,
        sizeBytes,
        checksum,
        appVersion: typeof payload.appVersion === 'string' ? payload.appVersion : null,
        encoding,
        recordCounts: readRecordCounts(payload.recordCounts) as Prisma.InputJsonValue,
      },
    });

    this.logger.log(
      `Stored backup ${backup.id} (v${version}, ${sizeBytes} bytes, ${encoding}) for user ${userId}`,
    );

    return toMetadata(backup);
  }

  // ─── GET /backups/latest?includePayload=true ─────────────────────────────
  // The most recent snapshot owned by the authenticated user. The payload is
  // only attached for an actual restore, keeping the Settings screen's status
  // check cheap.
  async findLatest(
    userId: string,
    includePayload: boolean,
  ): Promise<BackupMetadata & { payload?: Prisma.JsonValue }> {
    const backup = await this.prisma.backup.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!backup) {
      throw new NotFoundException('No backup available');
    }

    const metadata = toMetadata(backup);
    return includePayload ? { ...metadata, payload: backup.payload } : metadata;
  }

  // ─── GET /backups ────────────────────────────────────────────────────────
  // Backup history (metadata only, newest first) so a client can show when
  // data was last backed up without downloading anything.
  async list(userId: string, take = 20): Promise<BackupMetadata[]> {
    const rows = await this.prisma.backup.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 100),
    });
    return rows.map(toMetadata);
  }

  // ─── DELETE /backups/:id ─────────────────────────────────────────────────
  // Scoped by userId in the WHERE clause, so a guessed id belonging to another
  // account simply matches nothing (404) instead of deleting it.
  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    const result = await this.prisma.backup.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Backup not found');
    }

    this.logger.log(`Deleted backup ${id} for user ${userId}`);
    return { id, deleted: true };
  }
}
