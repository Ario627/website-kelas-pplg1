import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { join } from "path";
import cookieParser from 'cookie-parser';
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http.filter";
import { IoAdapter } from "@nestjs/platform-socket.io";
import helmet from "helmet";

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'verbose'],
  });

  app.use(cookieParser());

  app.use(helmet())

  const configService = app.get(ConfigService);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableCircularCheck: true,
    },
  }));

  if (isProduction || configService.get<string>('TRUST_PROXY') === 'true') {
    app.set('trust proxy', 1);
    logger.log('Trust proxy enabled');
  }

  app.useGlobalFilters(new HttpExceptionFilter());

  const allowedOrigins = [
    'http://localhost:3001',
    'https://ideone.dev',
    'https://www.ideone.dev',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.setGlobalPrefix('api');

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  // Set WebSocket adapter AFTER app.listen() so the HTTP server is available
  // This fixes Express 5 incompatibility where app instance doesn't expose
  // a proper http.Server with EventEmitter methods like .listeners()
  const httpServer = app.getHttpServer();
  app.useWebSocketAdapter(new IoAdapter(httpServer));
  logger.log('WebSocket adapter set to IoAdapter');

  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();
