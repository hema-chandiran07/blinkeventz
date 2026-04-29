import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  JWT_SECRET: Joi.string().min(32).required(),

<<<<<<< Updated upstream
  // Encryption key - required for all environments (exactly 32 chars)
  ENCRYPTION_KEY: Joi.string().length(32).required(),
=======
  ENCRYPTION_KEY: Joi.string().length(64).required(),
>>>>>>> Stashed changes

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  USE_REDIS: Joi.boolean().default(true),

  APP_ENV: Joi.string().default('development'),

  FRONTEND_URL: Joi.string().uri().required(),

  // Email
  GMAIL_USER: Joi.string().email().optional(),
  GMAIL_APP_PASSWORD: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().default('no-reply@nearzro.com'),
  SENDGRID_API_KEY: Joi.string().optional(),

  // Twilio — required (your app uses OTP)
  TWILIO_ACCOUNT_SID: Joi.string().pattern(/^AC/).required(),
  TWILIO_AUTH_TOKEN: Joi.string().min(32).required(),
  TWILIO_SMS_FROM: Joi.string().optional(),
  TWILIO_WHATSAPP_FROM: Joi.string().optional(),

  // Firebase — all optional (graceful degradation if not configured)
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),

  // Payments
  RAZORPAY_KEY_ID: Joi.string().min(8).required(),
  RAZORPAY_KEY_SECRET: Joi.string().min(16).required(),
  RAZORPAY_WEBHOOK_SECRET: Joi.string().optional(),

  // OpenAI
  OPENAI_API_KEY: Joi.string().pattern(/^sk-/).required(),
  OPENAI_MODEL: Joi.string().default('gpt-4o-mini'),

  // AWS S3
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: Joi.string().min(16).required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().min(32).required(),
  AWS_S3_BUCKET: Joi.string().required(),

  // Google OAuth
  GOOGLE_CLIENT_ID: Joi.string().optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri().optional(),

  // Webhooks
  BANK_WEBHOOK_SECRET: Joi.string().optional(),

  // Rate Limiting
  RATE_LIMIT_TTL: Joi.number().default(60000),
  RATE_LIMIT_MAX: Joi.number().default(100),

  // Circuit Breaker
  CIRCUIT_BREAKER_THRESHOLD: Joi.number().default(5),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(60000),

  // Business Rules
  PLATFORM_FEE_PERCENTAGE: Joi.number().min(0).max(1).default(0.02),
  TAX_PERCENTAGE: Joi.number().min(0).max(1).default(0.18),
  EXPRESS_FEE: Joi.number().min(0).default(50000),
  MIN_ORDER_AMOUNT: Joi.number().min(0).default(0),
  PAYMENT_EXPIRY_MINUTES: Joi.number().default(30),
  PAYMENT_RECONCILIATION_ENABLED: Joi.boolean().default(true),
}).unknown(true);