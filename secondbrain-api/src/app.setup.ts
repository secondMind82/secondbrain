import { json, urlencoded } from 'express';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import { MAX_PAYLOAD_BYTES } from './backup/backup-format';

/**
 * Shared application wiring, used by main.ts AND by the e2e specs so the tests
 * exercise the exact production configuration.
 *
 * Body parsers
 * ------------
 * `NestFactory.create` installs Express' default `json()` parser during
 * creation, with its 100kb limit. Registering another parser afterwards is
 * useless because the first one already rejected the request — so main.ts
 * creates the app with `bodyParser: false` and the parsers are installed here,
 * before anything else. Without this, any real backup (a few thousand records
 * is comfortably over 100kb) is rejected with HTTP 413.
 */
export function configureBodyParsers(app: NestExpressApplication): void {
  app.use(json({ limit: MAX_PAYLOAD_BYTES }));
  app.use(urlencoded({ extended: true, limit: MAX_PAYLOAD_BYTES }));
}

export function configureValidation(app: NestExpressApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

export function configureCors(app: NestExpressApplication): void {
  const allowedOrigins = ['http://localhost:4200', process.env.CORS_ORIGIN].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser clients (the mobile app) send no Origin header.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });
}

export function configureStaticAssets(app: NestExpressApplication): void {
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
}

/** Everything main.ts applies, in order. */
export function configureApp(app: NestExpressApplication): void {
  configureBodyParsers(app);
  configureCors(app);
  configureValidation(app);
  configureStaticAssets(app);
}
