import OpenAI from 'openai';
import { AIProvider } from './ai-provider.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(config: ConfigService) {
    this.client = new OpenAI({
      apiKey: config.get<string>('OPENAI_API_KEY'),
    });
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert event planner. Always respond with VALID JSON ONLY. No markdown.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });

    return response.choices[0].message.content!;
  }
}
