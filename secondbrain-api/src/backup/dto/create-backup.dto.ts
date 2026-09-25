import { IsObject } from 'class-validator';

export class CreateBackupDto {
  @IsObject()
  payload!: Record<string, unknown>;
}