/**
 * Control-plane HTTP entrypoint.
 *
 * NestJS 11 over Fastify 5. Boot order:
 *   1. Validate environment.
 *   2. Build Nest app on FastifyAdapter (with our request-id genReqId).
 *   3. Register fastify plugins (helmet, cookie).
 *   4. Configure CORS from the validated config.
 *   5. Listen and log a one-line summary.
 *
 * The global exception filter is registered via DI in `AppModule`, not here,
 * so it can inject the logger.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import { nanoid } from 'nanoid';

import { AppModule } from './app.module.js';
import { loadAppConfig } from './config/app-config.js';

async function bootstrap() {
  const config = loadAppConfig();
  const logger = new Logger('Bootstrap');

  const adapter = new FastifyAdapter({
    logger:
      config.NODE_ENV === 'production'
        ? { level: config.LOG_LEVEL }
        : config.LOG_PRETTY
          ? {
              level: config.LOG_LEVEL,
              transport: { target: 'pino-pretty', options: { colorize: true } },
            }
          : { level: config.LOG_LEVEL },
    /**
     * Use header-supplied request-id when present, otherwise generate.
     * The id propagates to the global error filter and every log line.
     */
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      if (typeof incoming === 'string' && incoming.length > 0 && incoming.length < 200) {
        return incoming;
      }
      return `req_${nanoid(21)}`;
    },
    trustProxy: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // The dashboard sets its own CSP at the edge.
  });
  await app.register(fastifyCookie, {
    secret: config.SESSION_SECRET,
  });

  app.enableCors({
    origin: config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    credentials: true,
    exposedHeaders: ['x-request-id'],
  });

  app.enableShutdownHooks();

  // Echo the request id back on every response.
  adapter.getInstance().addHook('onSend', async (req, reply) => {
    reply.header('x-request-id', req.id);
  });

  await app.listen(config.PORT, config.HOST);
  logger.log(`control-plane listening on http://${config.HOST}:${config.PORT}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal during bootstrap:', err);
  process.exit(1);
});
