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

  // ✅ Increase body size limit for large payloads (e.g., venue creation with many images)
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { limit: '50mb', extended: true });

  // ✅ CORS Configuration for Development
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL || 'http://localhost:3001',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // ✅ Set global API prefix
  app.setGlobalPrefix('api');

  // ✅ Enable cookies (needed for auth / refresh tokens if used later)
  app.use(cookieParser());

  // ✅ Serve static files for uploads
  app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
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

  // ✅ Swagger configuration
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
  SwaggerModule.setup('api', app, document, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ✅ Graceful shutdown
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  
  await app.listen(port, host);
  console.log('🚀 Server running at http://localhost:' + port);
  console.log('📘 Swagger available at http://localhost:' + port + '/api');
  console.log('📋 Environment:', process.env.APP_ENV || 'development');
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
