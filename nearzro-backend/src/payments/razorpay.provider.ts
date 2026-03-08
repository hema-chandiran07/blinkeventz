import Razorpay from 'razorpay';

export const RazorpayProvider = {
  provide: 'RAZORPAY_CLIENT',
  useFactory: () => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    // Return mock client if keys are not configured (for local dev)
    if (!keyId || !keySecret || keyId.includes('xxxxx') || keySecret.includes('xxxx')) {
      console.warn('⚠️  Razorpay keys not configured - Using mock client for local development');
      return {
        orders: {
          create: async () => ({ id: 'mock_order_id', currency: 'INR', amount: 0 }),
          fetch: async () => ({ id: 'mock_order_id', currency: 'INR', amount: 0 }),
        },
        payments: {
          fetch: async () => ({ id: 'mock_payment_id', status: 'captured' }),
        },
        utilities: {
          verifyPaymentSignature: async () => true,
        },
      };
    }
    
    return new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  },
};
