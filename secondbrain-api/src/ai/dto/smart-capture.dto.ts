import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SmartCaptureDto {
  @IsString()
  @IsNotEmpty()
  input!: string;

  @IsOptional()
  @IsString()
  entityName?: string;
}
