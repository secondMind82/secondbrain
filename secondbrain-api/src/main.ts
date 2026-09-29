import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  // bodyParser: false — Express' default parser caps request bodies at 100kb,
  // which any real backup exceeds. The parsers with the correct limit are
  // installed in configureApp() instead (see src/app.setup.ts).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  configureApp(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
