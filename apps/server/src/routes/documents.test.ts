import { beforeAll, afterAll, describe, expect, it } from 'vitest';

// Configure an in-memory sqlite DB before any app module reads env.
process.env.DB_DIALECT = 'sqlite';
process.env.SQLITE_STORAGE = ':memory:';
process.env.API_TOKEN = '';

import request from 'supertest';
import type Koa from 'koa';

let server: import('node:http').Server;

beforeAll(async () => {
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
});

describe('documents API', () => {
  it('creates, reads, updates, lists and deletes a document', async () => {
    const created = await request(server)
      .post('/api/v1/documents')
      .send({ title: 'Test Doc', content: { blocks: [{ id: 'a', type: 'paragraph', text: 'hi' }] } })
      .expect(201);

    expect(created.body.id).toBeTruthy();
    expect(created.body.title).toBe('Test Doc');
    const id = created.body.id;

    const read = await request(server).get(`/api/v1/documents/${id}`).expect(200);
    expect(read.body.content.blocks).toHaveLength(1);

    await request(server)
      .put(`/api/v1/documents/${id}`)
      .send({ title: 'Updated', content: { blocks: [] } })
      .expect(200);

    const afterUpdate = await request(server).get(`/api/v1/documents/${id}`).expect(200);
    expect(afterUpdate.body.title).toBe('Updated');
    expect(afterUpdate.body.content.blocks).toHaveLength(0);

    const list = await request(server).get('/api/v1/documents').expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((d: { id: string }) => d.id === id)).toBe(true);

    await request(server).delete(`/api/v1/documents/${id}`).expect(204);
    await request(server).get(`/api/v1/documents/${id}`).expect(404);
  });

  it('rejects a malformed blocks payload with 400', async () => {
    await request(server)
      .post('/api/v1/documents')
      .send({ content: { blocks: [{ text: 'missing id and type' }] } })
      .expect(400);
  });

  it('returns 404 for an unknown document', async () => {
    await request(server).get('/api/v1/documents/does-not-exist').expect(404);
  });
});
