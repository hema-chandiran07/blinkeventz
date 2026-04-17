import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MaintenanceGuard } from './common/guards/maintenance.guard';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

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
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ✅ RESTORED 50MB LIMIT: (Fixes Broken Flow)
  // Venue and Vendor registrations allow multiple 5MB images. 
  // Limiting this to 20MB causes 413 Payload Too Large errors during registration.
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // FEATURE ADDED (SECURITY MED-08): Environment-conditional CORS origins
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'development';
  const isProduction = appEnv === 'production';
  const corsOrigins = isProduction
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : [
        'http://localhost:3001',
        'http://localhost:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:3000',
        process.env.FRONTEND_URL || 'http://localhost:3001',
      ];

  app.enableCors({
    origin: corsOrigins as string[],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ✅ Set global API prefix
  app.setGlobalPrefix('api');

  // ✅ Enable cookies (needed for auth / refresh tokens if used later)
  app.use(cookieParser());

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