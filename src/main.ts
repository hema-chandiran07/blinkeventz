import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Enable cookies (needed for auth / refresh tokens if used later)
  app.use(cookieParser());

  // ✅ Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // ✅ Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('BlinkEventz API')
    .setDescription('Backend APIs for BlinkEventz')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig,);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('🚀 Server running at http://localhost:3000');
  console.log('📘 Swagger available at http://localhost:3000/api');
}

bootstrap();
