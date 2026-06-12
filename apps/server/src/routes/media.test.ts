import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

process.env.DB_DIALECT = 'sqlite';
process.env.SQLITE_STORAGE = ':memory:';
process.env.API_TOKEN = '';

import request from 'supertest';
import type Koa from 'koa';

let server: import('node:http').Server;
let uploadDir: string;

beforeAll(async () => {
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kalamos-uploads-'));
  const { LocalStorageDriver } = await import('../storage/localDriver');
  const { setStorageDriver } = await import('../storage');
  setStorageDriver(new LocalStorageDriver(uploadDir));

  const { initDatabase } = await import('../db/sequelize');
  const { createApp } = await import('../app');
  await initDatabase({ force: true });
  const app: Koa = createApp();
  server = app.listen();
});

afterAll(async () => {
  const { closeDatabase } = await import('../db/sequelize');
  server?.close();
  await closeDatabase();
  await fs.rm(uploadDir, { recursive: true, force: true });
});

describe('media upload API', () => {
  it('stores an uploaded image and returns a url', async () => {
    const res = await request(server)
      .post('/api/v1/media/image')
      .attach('file', Buffer.from('fake-image-bytes'), { filename: 'pic.png', contentType: 'image/png' })
      .expect(201);

    expect(res.body.url).toContain('/uploads/');
    expect(res.body.key).toBeTruthy();

    const files = await fs.readdir(uploadDir);
    expect(files.length).toBe(1);
    expect(files[0]).toContain('pic.png');
  });

  it('rejects a non-image upload to the image endpoint', async () => {
    await request(server)
      .post('/api/v1/media/image')
      .attach('file', Buffer.from('not an image'), { filename: 'note.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('accepts any type on the generic file endpoint', async () => {
    const res = await request(server)
      .post('/api/v1/media/file')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'doc.pdf', contentType: 'application/pdf' })
      .expect(201);
    expect(res.body.url).toContain('doc.pdf');
  });
});
