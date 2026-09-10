import { Injectable } from '@nestjs/common';
import { GeminiService, SmartCaptureResult } from './gemini.service';

@Injectable()
export class AiService {
  constructor(private readonly geminiService: GeminiService) {}

  async smartCapture(
    input: string,
    entityName?: string,
  ): Promise<SmartCaptureResult> {
    return this.geminiService.smartCapture(input, entityName);
  }
}
