import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);

  // MUST be registered before any global JSON body parser (Nest adds
  // its own internally on app.listen/init). Billing provider webhooks
  // (Razorpay/Stripe) require the raw, unparsed request body to verify
  // HMAC signatures — once Express/Nest parses it to JSON, the exact
  // byte sequence needed for signature verification is lost.
  app.use('/webhooks/billing', express.raw({ type: 'application/json' }));

  app.use(helmet());
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') ?? '*',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
