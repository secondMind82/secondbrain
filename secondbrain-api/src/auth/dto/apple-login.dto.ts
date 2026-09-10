import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AppleLoginDto {
  @IsNotEmpty()
  identityToken!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}