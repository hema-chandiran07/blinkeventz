import Razorpay from 'razorpay';
import { ConfigService } from '@nestjs/config';
import { CircuitBreaker, CircuitBreakerRegistry } from '../../ai-planner/utils/circuit-breaker';
import { Logger } from '@nestjs/common';

export const RazorpayProvider = {
  provide: 'RAZORPAY_CLIENT',
  useFactory: (config: ConfigService) => {
    const logger = new Logger('RazorpayProvider');
    const key_id = config.get<string>('RAZORPAY_KEY_ID');
    const key_secret = config.get<string>('RAZORPAY_KEY_SECRET');
    
    // Create Razorpay instance with default headers
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    // Create circuit breaker for Razorpay
    const breakerRegistry = new CircuitBreakerRegistry();
    const razorpayBreaker = breakerRegistry.getBreaker('razorpay', {
      failureThreshold: 5,
      resetTimeoutSeconds: 60, // 60 seconds (60000ms)
      successThreshold: 1,
    });

    // Wrap Razorpay API with timeout and circuit breaker
    const timeoutWrapper = <T,>(fn: () => Promise<T>, timeoutMs: number = 10000): Promise<T> => {
      return Promise.race([
        fn(),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Razorpay timeout after 10 seconds')), timeoutMs);
        }),
      ]) as Promise<T>;
    };

    // Create a proxy that wraps all methods
    const createWrappedClient = () => {
      const client: any = {};
      
      // Wrap orders.create
      client.orders = {
        create: async (data: any) => {
          return razorpayBreaker.execute(async () => {
            return timeoutWrapper(() => razorpay.orders.create(data), 10000);
          });
        },
        fetch: async (orderId: string) => {
          return razorpayBreaker.execute(async () => {
            return timeoutWrapper(() => razorpay.orders.fetch(orderId), 10000);
          });
        },
      };
      
       // Wrap refunds.create
       client.refunds = {
         create: async (data: any) => {
           return razorpayBreaker.execute(async () => {
             return timeoutWrapper(() => razorpay.payments.refund(data.payment_id, { amount: data.amount }), 10000);
           });
         },
       };

      return client;
    };

    logger.log('Razorpay client initialized with 10s timeout and circuit breaker');
    return createWrappedClient();
  },
  inject: [ConfigService],
};
