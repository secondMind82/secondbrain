import { IsArray, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class AiChatDto {
  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  history?: Array<{ role: string; text: string }>;
}