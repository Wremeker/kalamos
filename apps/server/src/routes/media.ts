import fs from 'node:fs/promises';
import Router from '@koa/router';
import type { Context } from 'koa';
import { getStorageDriver } from '../storage';

export const mediaRouter = new Router({ prefix: '/api/v1/media' });

interface UploadedFile {
  filepath: string;
  originalFilename?: string | null;
  newFilename?: string;
  mimetype?: string | null;
  size?: number;
}

function pickFile(ctx: Context): UploadedFile | null {
  const files = (ctx.request as unknown as { files?: Record<string, UploadedFile | UploadedFile[]> }).files;
  if (!files) return null;
  const candidate = files.file ?? Object.values(files)[0];
  if (!candidate) return null;
  return Array.isArray(candidate) ? candidate[0] : candidate;
}

async function handleUpload(ctx: Context, allowedPrefix: string | null): Promise<void> {
  const file = pickFile(ctx);
  if (!file) {
    ctx.status = 400;
    ctx.body = { error: 'No file uploaded (expected multipart field "file").' };
    return;
  }

  const mimetype = file.mimetype ?? 'application/octet-stream';
  if (allowedPrefix && !mimetype.startsWith(allowedPrefix)) {
    ctx.status = 400;
    ctx.body = { error: `Expected a ${allowedPrefix.replace('/', '')} file, got ${mimetype}.` };
    return;
  }

  const body = await fs.readFile(file.filepath);
  const driver = await getStorageDriver();
  const stored = await driver.put({
    filename: file.originalFilename ?? file.newFilename ?? 'file',
    contentType: mimetype,
    body,
  });

  await fs.unlink(file.filepath).catch(() => undefined);

  ctx.status = 201;
  ctx.body = { url: stored.url, key: stored.key };
}

mediaRouter.post('/image', (ctx) => handleUpload(ctx, 'image/'));
mediaRouter.post('/video', (ctx) => handleUpload(ctx, 'video/'));
mediaRouter.post('/audio', (ctx) => handleUpload(ctx, 'audio/'));
mediaRouter.post('/file', (ctx) => handleUpload(ctx, null));
