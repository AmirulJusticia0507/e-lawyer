import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  app.useWebSocketAdapter(new IoAdapter(app));

  // Security headers - OWASP hardening
  app.use((req: Request, res: Response, next: NextFunction) => {
    const forwardedProtocol = req.headers['x-forwarded-proto'];
    const isHttps = req.secure || forwardedProtocol === 'https';
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    // OWASP headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
    next();
  });

  // Rate limiting sederhana berdasarkan IP
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // batasi setiap IP maksimal 100 request per window
    message: 'Terlalu banyak request dari IP ini, coba lagi nanti',
  });
  app.use('/api/', limiter);

  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const forwardedProtocol = req.headers['x-forwarded-proto'];
    const isHttps = req.secure || forwardedProtocol === 'https';
    if (isHttps) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  const origins = config
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  const port = config.get<number>('APP_PORT', 3000);
  await app.listen(port);

  Logger.log(
    `e-Lawyer API berjalan di ${config.get('APP_URL', 'http://localhost:' + port)}/${prefix}`,
    'Bootstrap',
  );
}

void bootstrap();
