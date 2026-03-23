import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './modules/common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global middleware
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // Global filters
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter()
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle(process.env.API_TITLE || 'HR ERP API')
    .setDescription(process.env.API_DESCRIPTION || 'Enterprise HR Management System API')
    .setVersion(process.env.API_VERSION || '1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'User login and token management')
    .addTag('Employees', 'Employee management operations')
    .addTag('Attendance', 'Attendance tracking')
    .addTag('Leaves', 'Leave management')
    .addTag('Payroll', 'Payroll processing')
    .addTag('Organization', 'Organization structure')
    .addTag('Settings', 'System settings')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 HR ERP Backend running on port ${port}`);
  console.log(`📖 API Documentation available at http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Bootstrap error:', error);
  process.exit(1);
});
