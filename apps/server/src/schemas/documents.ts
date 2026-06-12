import { z } from 'zod';

// A block is an open object with a required string `type` and `id`. We keep the
// schema permissive so the document format can evolve without server changes,
// while still rejecting obviously malformed payloads.
export const blockSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
  })
  .passthrough();

export const documentContentSchema = z.object({
  blocks: z.array(blockSchema),
  // Optional Notion-style page emoji/icon. Stored alongside blocks in JSONB.
  icon: z.string().max(32).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: documentContentSchema.optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: documentContentSchema.optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
