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

  // Encryption key - required for all environments (exactly 32 chars)
  ENCRYPTION_KEY: Joi.string().length(32).required(),

  // Redis configuration (optional - will fallback to in-memory if missing)
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  USE_REDIS: Joi.boolean().default(true),

  // App environment
  APP_ENV: Joi.string().default('production'),
})
  .unknown(true); // Allow other environment variables to pass through
