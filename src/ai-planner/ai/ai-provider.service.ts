import { Injectable } from '@nestjs/common';

@Injectable()
export class AIProviderService {
  async generatePlan(payload: any) {
    return {
      summary: 'Optimized AI Event Plan',
      budgetSplit: payload.budgetSplit,
      suggestions: {
        venueType: 'Banquet Hall',
        catering: 'Premium Buffet',
        decorStyle: 'Minimal Elegant',
      },
    };
  }
}
