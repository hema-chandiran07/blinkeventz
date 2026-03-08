import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';

export const RazorpayProvider = {
  provide: 'RAZORPAY_CLIENT',
  useFactory: (config: ConfigService) => {
    return new Razorpay({
      key_id: config.get<string>('RAZORPAY_KEY_ID'),
      key_secret: config.get<string>('RAZORPAY_KEY_SECRET'),
    });
  },
  inject: [ConfigService],
};
