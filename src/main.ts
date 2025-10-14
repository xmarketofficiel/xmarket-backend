import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationMiddleware } from './common/middleware/validation.middleware';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cookie parser middleware
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS configuration
  const allowedOrigins = [
    'http://localhost:3000', // Default frontend port (marketplace)
    'http://localhost:3002', // Alternative frontend port (admin panel)
    'http://localhost:3003', // Admin panel (dev port)
    'https://xmarket-frontend.vercel.app', // Production frontend
  ];

  // Add production frontend URLs from environment variables
  if (process.env.FRONTEND_URL) {
    // Handle comma-separated URLs or single URL
    const frontendUrls = process.env.FRONTEND_URL.split(',').map(url => url.trim());
    allowedOrigins.push(...frontendUrls);
  }

  // Add admin panel URL if specified
  if (process.env.ADMIN_PANEL_URL) {
    allowedOrigins.push(process.env.ADMIN_PANEL_URL);
  }

  // Log allowed origins in production for debugging
  if (process.env.NODE_ENV === 'production') {
    console.log('Production CORS allowed origins:', allowedOrigins);
  }

  app.enableCors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false, // Not needed for Bearer token auth
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3001;

  // Swagger documentation - only in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('University Marketplace API')
      .setDescription('API for university marketplace application')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('access_token')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    console.log(`Swagger documentation: http://localhost:${port}/api`);
  }

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch(error => {
  console.error('Error starting application:', error);
  process.exit(1);
});
