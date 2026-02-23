"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const serverless_express_1 = __importDefault(require("@vendia/serverless-express"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const core_2 = require("@nestjs/core");
try {
    const prismaClient = require('@prisma/client');
    console.log('PRISMA CLIENT KEYS:', Object.keys(prismaClient));
    console.log('PRISMA ENUM ROLE:', prismaClient.Role);
}
catch (e) {
    console.error('ERROR REQUIRING PRISMA CLIENT:', e);
}
let cachedServer;
const logger = new common_1.Logger('Lambda');
async function bootstrap() {
    const expressApp = (0, express_1.default)();
    const adapter = new platform_express_1.ExpressAdapter(expressApp);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter, {
        logger: ['error', 'warn', 'log'],
    });
    const httpAdapterHost = app.get(core_2.HttpAdapterHost);
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter(httpAdapterHost));
    const configService = app.get(config_1.ConfigService);
    const sessionSecret = configService.get('SESSION_SECRET') || 'dev-secret-change-in-production';
    app.setGlobalPrefix('api', {
        exclude: ['health', ''],
    });
    app.use((0, cookie_parser_1.default)(sessionSecret));
    app.use((0, express_session_1.default)({
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
    }));
    app.use(passport_1.default.initialize());
    app.use(passport_1.default.session());
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    app.enableCors({
        origin: [/\.upllyft\.com$/],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
        exposedHeaders: ['Set-Cookie'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.getHttpAdapter().get('/health', (req, res) => {
        res.json({
            status: 'ok',
            environment: 'lambda',
            timestamp: new Date().toISOString(),
        });
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Upllyft API')
        .setDescription('Upllyft Platform API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
    });
    await app.init();
    logger.log('NestJS application initialized for Lambda');
    return (0, serverless_express_1.default)({ app: expressApp });
}
const handler = async (event, context) => {
    if (!cachedServer) {
        cachedServer = await bootstrap();
    }
    return cachedServer(event, context);
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map