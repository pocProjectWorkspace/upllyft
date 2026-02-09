// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
// Fastify platform
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
// Fastify plugins
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // const app = await NestFactory.create(AppModule, {
  //   logger: ['error', 'warn', 'log', 'debug'],
  // });

   // Create Fastify app
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      logger: ['error', 'warn', 'log', 'debug'],
    }
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);

  // Global prefix
  app.setGlobalPrefix('api', {
    exclude: ['health', ''],
  });


   // ✅ CRITICAL: Session secret must be strong
  const SESSION_SECRET = process.env.SESSION_SECRET || 'captcha-secret-key-dev-please-change-in-production';
  
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    logger.warn('⚠️ SESSION_SECRET is missing or weak. Set a 32+ character random string in your environment.');
  }

  // ✅ STEP 1: Register cookies FIRST
  await app.register(fastifyCookie, {
    secret: SESSION_SECRET,
  });

  // ✅ STEP 2: Register session plugin
  await app.register(fastifySession, {
    secret: SESSION_SECRET,
    cookieName: 'sessionId',
    cookie: {
      maxAge: 600000, // 10 minutes in milliseconds
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      path: '/',
    },
    saveUninitialized: true, // Create session even if empty
    rolling: true, // Reset expiration on each response
  });

  logger.log('✅ Session middleware configured');



  // CORS configuration

  app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001','https://upllyft.com', 'https://www.upllyft.com',
      
      configService.get<string>('FRONTEND_URL', 'http://localhost:3000')
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`❌ Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});

  // app.enableCors({
  //   origin: [
  //     'https://turbo-bassoon-wr65p7w9p9rc5q9-3001.app.github.dev',
  //     'http://localhost:3000',
  //     'http://localhost:3001',
  //     configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
  //   ],
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  // });

//   app.enableCors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// });

  // Global validation pipe
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

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Upllyft API')
      .setDescription('Healthcare Professional Community Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('posts', 'Posts and discussions')
      .addTag('comments', 'Comments on posts')
      .addTag('votes', 'Voting system')
      .addTag('bookmarks', 'Bookmark management')
      .addTag('ai', 'AI-powered features')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    
    logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  }

  await app.listen(port);
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 API endpoints available at: http://localhost:${port}/api`);
  logger.log(`🏥 Upllyft Backend Service Started Successfully`);
}

bootstrap();