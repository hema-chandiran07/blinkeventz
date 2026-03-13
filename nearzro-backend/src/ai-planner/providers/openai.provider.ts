import OpenAI from 'openai';
import { AIProvider } from './ai-provider.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private client: OpenAI | null = null;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('OPENAI_API_KEY');
    // Only initialize if API key exists and is valid
    if (apiKey && apiKey.trim() !== '' && !apiKey.includes('YOUR_')) {
      try {
        this.client = new OpenAI({ apiKey });
        console.log('✅ OpenAI client initialized');
      } catch (error) {
        console.warn('⚠️  OpenAI client failed to initialize - AI features disabled');
        this.client = null;
      }
    } else {
      console.log('⚠️  OPENAI_API_KEY not configured - AI features disabled');
    }
  }

  async generate(prompt: string): Promise<string> {
    if (!this.client) {
      // Return a valid mock response instead of crashing
      return JSON.stringify({
        message: 'AI planner requires OPENAI_API_KEY. Using mock data.',
        budget: 50000,
        city: 'Delhi',
        guests: 100,
        venues: [],
        vendors: []
      });
    }

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
