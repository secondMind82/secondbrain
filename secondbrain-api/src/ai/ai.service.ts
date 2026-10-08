import { Injectable } from '@nestjs/common';
import { ChatTurn, GeminiService, SmartCaptureResult } from './gemini.service';

@Injectable()
export class AiService {
  constructor(private readonly geminiService: GeminiService) {}

  async smartCapture(
    input: string,
    entityName?: string,
  ): Promise<SmartCaptureResult> {
    return this.geminiService.smartCapture(input, entityName);
  }

  async chat(
    message: string,
    context?: Record<string, unknown>,
    history?: ChatTurn[],
  ): Promise<{ reply: string }> {
    return this.geminiService.chat(message, context, history);
  }
}
