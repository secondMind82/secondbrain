import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface SmartCaptureResult {
  intent:
    | 'PURCHASE'
    | 'MEETING'
    | 'REMINDER'
    | 'NOTE'
    | 'UNKNOWN';
  title?: string;
  description?: string;
  entityHint?: string;
  eventDate?: string;
  purchaseItems?: {
    name: string;
    price: number;
    quantity: number;
  }[];
}

const SMART_CAPTURE_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: [
        'PURCHASE',
        'MEETING',
        'REMINDER',
        'NOTE',
        'UNKNOWN',
      ],
    },
    title: { type: 'string' },
    description: { type: 'string' },
    entityHint: { type: 'string' },
    eventDate: { type: 'string' },
    purchaseItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          quantity: { type: 'number' },
        },
        required: ['name', 'price', 'quantity'],
      },
    },
  },
  required: ['intent'],
};

@Injectable()
export class GeminiService {
  private ai: GoogleGenAI;
  private model = 'gemini-3.6-flash';

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async smartCapture(
    input: string,
    entityName?: string,
  ): Promise<SmartCaptureResult> {
    const systemInstruction =
      'You are a smart capture engine for a personal "second brain" app. ' +
      'Parse the user input and determine its intent. ' +
      'Intents: PURCHASE (user bought/spent money, possibly listing items with prices), ' +
      'MEETING (met someone / appointment), REMINDER (todo/reminder to do something later), ' +
      'NOTE (any other idea/thought/memory). ' +
      'For PURCHASE, extract each item with its price (in INR) and quantity. ' +
      'Set entityHint to a person/company name if clearly mentioned (e.g. "Rahul", "Acme"). ' +
      'Set eventDate as an ISO date if a time/date is given, else omit. ' +
      'title is a short title, description is the full natural text.';

    const prompt = entityName
      ? `User has selected entity "${entityName}". Input: "${input}"`
      : `Input: "${input}"`;

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: SMART_CAPTURE_SCHEMA,
        temperature: 0.2,
      },
    });

    const text =
      response.text?.trim() ?? response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!text) {
      return { intent: 'UNKNOWN' };
    }

    try {
      return JSON.parse(text) as SmartCaptureResult;
    } catch {
      return { intent: 'UNKNOWN' };
    }
  }
}
