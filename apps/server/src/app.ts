import 'reflect-metadata';
import path from 'node:path';
import Koa from 'koa';
import cors from '@koa/cors';
import serve from 'koa-static';
import mount from 'koa-mount';
import { koaBody } from 'koa-body';
import { env } from './config/env';
import { bearerAuth } from './middleware/auth';
import { documentsRouter } from './routes/documents';
import { mediaRouter } from './routes/media';

export function createApp(): Koa {
  const app = new Koa();

  app.use(
    cors({
      origin: (ctx) => {
        const requestOrigin = ctx.get('Origin');
        if (env.corsOrigin === '*') return requestOrigin || '*';
        const allowed = env.corsOrigin.split(',').map((o) => o.trim());
        return allowed.includes(requestOrigin) ? requestOrigin : allowed[0] ?? '';
      },
      credentials: false,
    })
  );

  // Error boundary -> JSON.
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      ctx.status = (err as { status?: number }).status ?? 500;
      ctx.body = { error: (err as Error).message ?? 'Internal Server Error' };
    }
  });

  // Health check (unauthenticated).
  app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
      ctx.body = { ok: true };
      return;
    }
    await next();
  });

  // Serve locally-stored uploads under /uploads.
  app.use(mount('/uploads', serve(path.resolve(env.storage.uploadDir))));

  app.use(bearerAuth);

  app.use(
    koaBody({
      multipart: true,
      json: true,
      jsonLimit: '8mb',
      formidable: { maxFileSize: 200 * 1024 * 1024 },
    })
  );

  app.use(documentsRouter.routes());
  app.use(documentsRouter.allowedMethods());
  app.use(mediaRouter.routes());
  app.use(mediaRouter.allowedMethods());

  return app;
}
