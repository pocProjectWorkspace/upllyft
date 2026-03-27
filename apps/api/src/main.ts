import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';

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
 // const sessionSecret = configService.get<string>('SESSION_SECRET') || 'dev-secret-change-in-production';
  const sessionSecret = configService.get<string>('SESSION_SECRET');
if (!sessionSecret && nodeEnv === 'production') {
  logger.error('❌ SESSION_SECRET is not set in production!');
  process.exit(1);
}

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
        secure: nodeEnv === 'production',
        sameSite: nodeEnv === 'production' ? 'none' : 'lax',
      },
    }),
  );
  logger.log('✅ Session middleware configured');

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Passport serialization (required for Google OAuth session flow)
  passport.serializeUser((user: any, done: any) => {
    done(null, user);
  });
  passport.deserializeUser((user: any, done: any) => {
    done(null, user);
  });

  // Enable trust proxy for secure cookies behind proxies (Heroku, Vercel, Nginx, etc.)
  // This is critical for 'secure: true' cookies and session handling in production
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

  // CORS - Restrict to Upllyft origins + Vercel previews + Railway
  app.enableCors({
    origin: [
      /\.upllyft\.com$/,
      /\.safehaven-upllyft\.com$/,
      /\.vercel\.app$/,
      /\.railway\.app$/,
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
  logger.log(`✅ CORS enabled for Upllyft origins (including localhost)`);

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

  const appUrl = nodeEnv === 'production' 
  ? 'https://upllyftapi-production.up.railway.app' 
  : `http://localhost:${port}`;
logger.log(`📚 Swagger documentation: ${appUrl}/api/docs`);
  logger.log(`📚 Swagger documentation: ${appUrl}/api/docs`);
  logger.log(`🔍 Environment check: PORT=${port}, NODE_ENV=${nodeEnv}, SESSION_SECRET=${sessionSecret ? 'SET' : 'MISSING'}`);

  // Start server
  try {
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Application listening on 0.0.0.0:${port}`);
  } catch (err) {
    logger.error(`❌ Failed to listen on port ${port}: ${err.message}`, err.stack);
    process.exit(1);
  }
app.enableShutdownHooks();
  // Change the final log lines to:
logger.log(`🚀 Application running on: ${appUrl}`);
logger.log(`📍 Environment: ${nodeEnv}`);
logger.log(`📚 API endpoints: ${appUrl}/api`);
logger.log(`🏥 Upllyft Backend Service Started Successfully`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
