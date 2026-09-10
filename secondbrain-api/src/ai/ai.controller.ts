import { Body, Controller, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { SmartCaptureDto } from './dto/smart-capture.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('smart-capture')
  smartCapture(@Body() dto: SmartCaptureDto) {
    return this.aiService.smartCapture(dto.input, dto.entityName);
  }
}
