import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Node environment (required)
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('production')
    .required(),

  // Server port
  PORT: Joi.number().default(3000),

  // Database - required for all environments
  DATABASE_URL: Joi.string().required(),

  // JWT - required for all environments
  JWT_SECRET: Joi.string().min(32).required(),

  // Encryption key — AES-256-GCM requires a 32-byte key stored as 64 hex characters
  ENCRYPTION_KEY: Joi.string().length(64).required(),

  // Redis configuration (optional - will fallback to in-memory if missing)
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  USE_REDIS: Joi.boolean().default(true),

  // App environment
  APP_ENV: Joi.string().default('production'),

  // ============================================
  // EMAIL CONFIGURATION (Gmail SMTP)
  // ============================================
  GMAIL_USER: Joi.string().email().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  GMAIL_APP_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  EMAIL_FROM: Joi.string().email().default('no-reply@nearzro.com'),

  // ============================================
  // TWILIO CONFIGURATION (SMS + WhatsApp)
  // ============================================
  TWILIO_ACCOUNT_SID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_AUTH_TOKEN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_SMS_FROM: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  TWILIO_WHATSAPP_FROM: Joi.string().pattern(/^whatsapp:\+[1-9]\d{1,14}$/).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),

  // ============================================
  // FIREBASE CONFIGURATION (Push Notifications)
  // ============================================
  FIREBASE_PROJECT_ID: Joi.string().optional(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().optional(),
  FIREBASE_PRIVATE_KEY: Joi.string().optional(),

  // ============================================
  // RATE LIMITING
  // ============================================
  RATE_LIMIT_TTL: Joi.number().default(60000), // 1 minute
  RATE_LIMIT_MAX: Joi.number().default(100), // 100 requests per minute

  // ============================================
  // CIRCUIT BREAKER
  // ============================================
  CIRCUIT_BREAKER_THRESHOLD: Joi.number().default(5),
  CIRCUIT_BREAKER_TIMEOUT: Joi.number().default(60000), // 1 minute
})
  .unknown(true); // Allow other environment variables to pass through
