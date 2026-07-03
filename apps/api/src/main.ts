import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 10 * 1024 * 1024, // 10 MB default
      trustProxy: true,
    }),
    { bufferLogs: true },
  );

  // Use pino logger
  const logger = new Logger("Bootstrap");
  app.useLogger(app.get(Logger));

  // Global prefix
  app.setGlobalPrefix("api");

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-internal-secret",
    ],
  });

  // Global validation pipe (Zod-based validation handled per-route)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter with Sentry integration
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger (dev only)
  const configService = app.get(ConfigService);
  if (configService.get("NODE_ENV") !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Arch Systems API")
      .setDescription("Backend API for Arch Systems Portal")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = configService.get("PORT") ?? 3001;
  await app.listen(port, "0.0.0.0");
  logger.log(`API server running on http://0.0.0.0:${port}`);
}

bootstrap();
