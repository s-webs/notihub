import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupOpenApi } from './docs/openapi';

function corsOrigins(raw: string | undefined): string[] {
  const fallback = 'http://localhost:3041';
  return (raw ?? fallback)
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService);
  app.enableCors({
    origin: corsOrigins(config.get<string>('CORS_ORIGINS')),
    credentials: true,
  });

  const adminDist = join(process.cwd(), 'admin', 'dist');
  if (existsSync(adminDist)) {
    app.useStaticAssets(adminDist, { prefix: '/admin' });
  }

  setupOpenApi(app);

  const port = config.get<number>('PORT', 3040);
  await app.listen(port);
}

void bootstrap();
