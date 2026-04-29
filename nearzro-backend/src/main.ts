import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
<<<<<<< Updated upstream
=======
import * as express from 'express';
import { VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
>>>>>>> Stashed changes

// Load .env from multiple possible locations
const possiblePaths = [
  path.resolve('/app/.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
];

let envLoaded = false;
for (const envPath of possiblePaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed && Object.keys(result.parsed).length > 0) {
      console.log('📄 Loaded .env from:', envPath);
      envLoaded = true;
      break;
    }
  } catch (e) {
    // Try next path
  }
}

if (!envLoaded) {
  console.log('⚠️  No .env file found, using environment variables');
}

async function bootstrap() {
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const isProduction = appEnv === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: isProduction ? ['error', 'warn', 'log'] : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ✅ RESTORED 50MB LIMIT: (Fixes Broken Flow)
  // Venue and Vendor registrations allow multiple 5MB images. 
  // Limiting this to 20MB causes 413 Payload Too Large errors during registration.
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // FEATURE ADDED (SECURITY MED-08): Environment-conditional CORS origins
  const corsOrigins = isProduction
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : [
        'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL || 'http://localhost:3001',
      ];

<<<<<<< Updated upstream
  app.enableCors({
    origin: corsOrigins as string[],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'idempotency-key'],
  });

  // ✅ Set global API prefix
  app.setGlobalPrefix('api');
=======
    app.enableCors({
      origin: corsOrigins as string[],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'idempotency-key'],
    });

    // Security: Helmet.js HTTP security headers
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
            connectSrc: ["'self'"],
          },
        },
        hsts: {
          maxAge: 63072000,
          includeSubDomains: true,
          preload: true,
        },
      }),
    );

    // Route-specific higher limits for file upload endpoints (for JSON fields)
   app.use('/api/auth/register-venue-owner', express.json({ limit: '50mb' }));
   app.use('/api/auth/register-vendor', express.json({ limit: '50mb' }));
>>>>>>> Stashed changes

  // ✅ Enable cookies (needed for auth / refresh tokens if used later)
  app.use(cookieParser());

   // ✅ Global HTTP request timeout (120 seconds)
   app.use((req, res, next) => {
     req.setTimeout(120000, () => {
       res.status(408).json({ message: 'Request timeout' });
     });
     next();
   });

  // FEATURE ADDED: Static Assets - Root (Legacy/Direct) fallback
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // FEATURE ADDED: Static Assets - API (Standardized)
  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/api/uploads/',
  });

   // ✅ Global validation pipe
   app.useGlobalPipes(
     new ValidationPipe({
       whitelist: true,
       forbidNonWhitelisted: true,
       transform: true,
       transformOptions: {
         enableImplicitConversion: true,
       },
     }),
   );

   // ✅ Global response interceptor for standardized contracts
   app.useGlobalInterceptors(new ResponseInterceptor());

   // ✅ Global exception filter for structured 401 responses
   app.useGlobalFilters(new HttpExceptionFilter());

  // ✅ Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';

  // FEATURE ADDED (SECURITY HIGH-08): Only enable Swagger in non-production environments
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('NearZro API')
      .setDescription('Backend APIs for NearZro - Event Management SaaS Platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'User authentication and registration endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Venues', 'Venue management endpoints')
      .addTag('Vendors', 'Vendor management endpoints')
      .addTag('Events', 'Event management endpoints')
      .addTag('Cart', 'Shopping cart endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .addTag('AI Planner', 'AI-powered event planning endpoints')
      .addTag('Notifications', 'Notification management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
    console.log('📘 Swagger available at http://localhost:' + port + '/api/docs');
  } else {
    console.log('📘 Swagger is DISABLED in production');
  }

  await app.listen(port, host);
  console.log('🚀 Server running at http://localhost:' + port);
  console.log('📋 Environment:', appEnv);
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});