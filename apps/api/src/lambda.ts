import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExpressAdapter } from '@nestjs/platform-express';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpAdapterHost } from '@nestjs/core';

// DEBUG PRISMA
try {
    const prismaClient = require('@prisma/client');
    console.log('PRISMA CLIENT KEYS:', Object.keys(prismaClient));
    console.log('PRISMA ENUM ROLE:', prismaClient.Role);
} catch (e) {
    console.error('ERROR REQUIRING PRISMA CLIENT:', e);
}


let cachedServer: any;
const logger = new Logger('Lambda');

async function bootstrap(): Promise<any> {
    const expressApp = express();
    const adapter = new ExpressAdapter(expressApp);

    const app = await NestFactory.create(AppModule, adapter, {
        logger: ['error', 'warn', 'log'],
    });

    // Global exception filter
    const httpAdapterHost = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

    const configService = app.get(ConfigService);
    const sessionSecret = configService.get<string>('SESSION_SECRET') || 'dev-secret-change-in-production';

    // Global prefix
    app.setGlobalPrefix('api', {
        exclude: ['health', ''],
    });

    // Cookie parser
    app.use(cookieParser(sessionSecret));

    // Session configuration
    app.use(
        session({
            secret: sessionSecret,
            name: 'session',
            resave: false,
            saveUninitialized: false,
            cookie: {
                maxAge: 24 * 60 * 60 * 1000,
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
            },
        }),
    );

    // Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Trust proxy (behind API Gateway)
    (app.getHttpAdapter().getInstance() as any).set('trust proxy', 1);

    // CORS
    app.enableCors({
        origin: [/\.upllyft\.com$/],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
        exposedHeaders: ['Set-Cookie'],
    });

    // Validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Health check
    app.getHttpAdapter().get('/health', (req, res) => {
        res.json({
            status: 'ok',
            environment: 'lambda',
            timestamp: new Date().toISOString(),
        });
    });

    // Swagger
    const config = new DocumentBuilder()
        .setTitle('Upllyft API')
        .setDescription('Upllyft Platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });

    await app.init();
    logger.log('NestJS application initialized for Lambda');

    return serverlessExpress({ app: expressApp });
}

export const handler = async (event: any, context: any) => {
    if (!cachedServer) {
        cachedServer = await bootstrap();
    }
    return cachedServer(event, context);
};
