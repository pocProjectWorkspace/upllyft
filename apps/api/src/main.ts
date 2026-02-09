import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Global exception filter for better logging
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Simple session secret
  const sessionSecret = configService.get<string>('SESSION_SECRET') || 'dev-secret-change-in-production';

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', ''],
  });

  // Cookie parser
  app.use(cookieParser(sessionSecret));

  // Session configuration - Simple and working
  app.use(
    session({
      secret: sessionSecret,
      name: 'session',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: false, // Set to true only if using HTTPS
        sameSite: 'lax',
      },
    }),
  );
  logger.log('✅ Session middleware configured');

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Enable trust proxy for secure cookies behind proxies (Heroku, Vercel, Nginx, etc.)
  // This is critical for 'secure: true' cookies and session handling in production
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  // CORS - Restrict to Upllyft origins
  app.enableCors({
    origin: nodeEnv === 'production'
      ? [/\.upllyft\.com$/]
      : [
          'http://localhost:3000',
          'http://localhost:3002',
          'http://localhost:3003',
          'http://localhost:3004',
          'http://localhost:3005',
          'http://localhost:3006',
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie'],
  });
  logger.log('✅ CORS enabled for Upllyft origins');

  // Simple validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  logger.log('✅ Global validation pipe configured');

  // Health check
  app.getHttpAdapter().get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Upllyft API')
    .setDescription('Upllyft Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('posts', 'Posts and discussions')
    .addTag('questions', 'Q&A system')
    .addTag('answers', 'Answers to questions')
    .addTag('comments', 'Comments on posts')
    .addTag('votes', 'Voting system')
    .addTag('bookmarks', 'Bookmark management')
    .addTag('ai', 'AI-powered features')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  logger.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);

  // Start server
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📍 Environment: ${nodeEnv}`);
  logger.log(`📚 API endpoints: http://localhost:${port}/api`);
  logger.log(`🏥 Upllyft Backend Service Started Successfully`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
