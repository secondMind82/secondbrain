import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface ChatTurn {
  role: string;
  text: string;
}

export interface ChatResult {
  reply: string;
}

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

  /**
   * Conversational, strictly read-only assistant.
   *
   * The `context` blob is an on-device, purpose-built snapshot the client builds
   * from its own local data — this service never touches the database, so there
   * is nothing here that can write. The model may only answer from what it is
   * given, and is explicitly barred from describing any action it performs.
   */
  async chat(
    message: string,
    context?: Record<string, unknown>,
    history?: ChatTurn[],
  ): Promise<ChatResult> {
    const systemInstruction =
      'You are Birbal, a friendly personal assistant inside the user\'s "second brain" app. ' +
      'You can READ the user\'s captured data (people, timeline events, notes, diary, expenses, ' +
      'and pending credits) and answer questions from it. ' +
      'You must be strictly READ-ONLY: you CANNOT create, update, or delete anything (no notes, ' +
      'no expenses, no timeline entries, no credits). If the user asks you to perform any action, ' +
      'say you cannot yet — such actions will be available in a future Birbal AI update. ' +
      'Only answer from the context you are given; if the data you need is missing or not present, ' +
      'say so plainly instead of guessing. ' +
      'Keep answers concise, warm and in the same language the user writes in. ' +
      'When money appears, format it in Indian rupees like ₹1,250.';

    const validHistory = (history ?? [])
      .filter((t) => t && typeof t.text === 'string' && t.text.trim().length > 0)
      .slice(-12)
      .map((t) => ({ role: t.role === 'user' ? 'user' : 'model', parts: [{ text: t.text }] }));

    const contextText =
      context && Object.keys(context).length > 0
        ? `Current read-only context (user's own data):\n${JSON.stringify(context)}\n\n`
        : '';

    const contents = [
      ...validHistory,
      { role: 'user', parts: [{ text: `${contextText}Question: ${message}` }] },
    ];

    const response = await this.ai.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
      },
    });

    const text =
      response.text?.trim() ??
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      '';

    return { reply: text || "Sorry, I couldn't come up with an answer right now. Please rephrase and try again." };
  }
}
