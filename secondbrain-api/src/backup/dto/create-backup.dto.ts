import { Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class CreateBackupDto {
  // The versioned snapshot envelope (see backup-format.ts). Structure is
  // checked here; semantics (version range, ownership, size, integrity,
  // credential screening) are enforced in BackupsService against the
  // authenticated user id.
  @IsObject()
  payload!: Record<string, unknown>;
}

export class LatestBackupQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsIn(['true', 'false'])
  includePayload?: string;
}

export class ListBackupsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
