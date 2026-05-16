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
import * as express from 'express';
import { VersioningType } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

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


  // ✅ Enable URI-based API versioning (all routes become /api/v1/...)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

   // ✅ Set global API prefix BEFORE route-specific middleware
   app.setGlobalPrefix('api');

   // SECURITY (HIGH-03): Trust first proxy so req.ip reflects real client IP (X-Forwarded-For)
   // Prevents rate-limit bypass via spoofed X-Forwarded-For
   app.set('trust proxy', 1);

   // SECURITY: CORS origins — fail fast if FRONTEND_URL unset in production
   const getCorsOrigins = (): string[] => {
     if (isProduction) {
       const frontendUrl = process.env.FRONTEND_URL;
       if (!frontendUrl) {
         throw new Error('FRONTEND_URL environment variable is required in production');
       }
       return [frontendUrl];
     }
     const devOrigins = [
       'http://localhost:3001',
       'http://localhost:3000',
       'http://127.0.0.1:3001',
       'http://127.0.0.1:3000',
     ];
     return process.env.FRONTEND_URL
       ? [...devOrigins, process.env.FRONTEND_URL]
       : devOrigins;
   };

   const allowedOrigins = getCorsOrigins();

   app.enableCors({
     origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
       if (!origin) return callback(null, true); // allow non-brower clients (Postman, etc.)
       if (allowedOrigins.includes(origin)) {
         return callback(null, true);
       }
       callback(new Error('Origin not allowed by CORS'));
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'idempotency-key'],
     exposedHeaders: ['Content-Type', 'Content-Length'],
   });

  // Security: Helmet.js HTTP security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
          connectSrc: ["'self'"],
        },
      } : false,  // ← disable CSP entirely in development
      hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true,
      },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Route-specific higher limits for file upload endpoints (for JSON fields)
  app.use('/api/auth/register-venue-owner', express.json({ limit: '50mb' }));
  app.use('/api/auth/register-vendor', express.json({ limit: '50mb' }));

  // Global body parser limit: 200KB for JSON to mitigate large payload attacks
  app.use(express.json({ limit: '200kb' }));
  app.use(express.urlencoded({ extended: true, limit: '200kb' }));

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

    const document =
      SwaggerModule.createDocument(app, swaggerConfig);

    // NOTE: use 'docs' because prefix already adds /api
    SwaggerModule.setup('api/docs', app, document, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // ================= START SERVER =================
  await app.listen(port, host);

  // ================= LOGS =================
  console.log(
    `🚀 Server running at http://localhost:${port}`,
  );
  console.log(`📋 Environment: ${appEnv}`);

  if (!isProduction) {
    console.log(
      `📘 Swagger available at http://localhost:${port}/api/docs`,
    );
  }
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});