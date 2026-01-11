import { Injectable } from '@nestjs/common';

@Injectable()
export class AIProviderService {
 // ai-provider.service.ts
async generatePlan(payload: any) {
  return {
    summary: `Event for ${payload.guestCount} guests in ${payload.area}`,
    budgetSplit: payload.budgetSplit,
    recommendations: {
      venue: {
        type: 'Banquet Hall',
        capacity: payload.guestCount,
      },
      catering: {
        style: 'Premium Buffet',
        costPerGuest: payload.budgetSplit.perGuestCost,
      },
      decor: 'Minimal Elegant',
      photography: 'Candid + Traditional',
    },
    timeline: [
      'Venue booking',
      'Vendor confirmation',
      'Decor setup',
      'Event execution',
    ],
  };
}

}
