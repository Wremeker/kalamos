import Router from '@koa/router';
import { Document } from '../models/Document';
import { createDocumentSchema, updateDocumentSchema } from '../schemas/documents';

export const documentsRouter = new Router({ prefix: '/api/v1/documents' });

function serialize(doc: Document) {
  return {
    id: doc.id,
    title: doc.title,
    content: doc.content,
    ownerId: doc.ownerId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

// List documents (most-recently-updated first).
documentsRouter.get('/', async (ctx) => {
  const docs = await Document.findAll({ order: [['updatedAt', 'DESC']] });
  ctx.body = docs.map(serialize);
});

// Create a document.
documentsRouter.post('/', async (ctx) => {
  const parsed = createDocumentSchema.safeParse((ctx.request as { body?: unknown }).body ?? {});
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: 'Invalid document', details: parsed.error.flatten() };
    return;
  }

  const doc = await Document.create({
    title: parsed.data.title ?? 'Untitled',
    content: parsed.data.content ?? { blocks: [] },
  } as Partial<Document> as Document);

  ctx.status = 201;
  ctx.body = serialize(doc);
});

// Read a document.
documentsRouter.get('/:id', async (ctx) => {
  const doc = await Document.findByPk(ctx.params.id);
  if (!doc) {
    ctx.status = 404;
    ctx.body = { error: 'Document not found' };
    return;
  }
  ctx.body = serialize(doc);
});

// Update (save) a document.
documentsRouter.put('/:id', async (ctx) => {
  const parsed = updateDocumentSchema.safeParse((ctx.request as { body?: unknown }).body ?? {});
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: 'Invalid document', details: parsed.error.flatten() };
    return;
  }

  const doc = await Document.findByPk(ctx.params.id);
  if (!doc) {
    ctx.status = 404;
    ctx.body = { error: 'Document not found' };
    return;
  }

  if (parsed.data.title !== undefined) doc.title = parsed.data.title;
  if (parsed.data.content !== undefined) doc.content = parsed.data.content;
  await doc.save();

  ctx.body = serialize(doc);
});

// Delete a document.
documentsRouter.delete('/:id', async (ctx) => {
  const doc = await Document.findByPk(ctx.params.id);
  if (!doc) {
    ctx.status = 404;
    ctx.body = { error: 'Document not found' };
    return;
  }
  await doc.destroy();
  ctx.status = 204;
});
