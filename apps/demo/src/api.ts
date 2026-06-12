import type { Block } from '@kalamoss/editor';
import { API_BASE } from './config';

export interface DocumentSummary {
  id: string;
  title: string;
  updatedAt: string;
  /** Notion-style page emoji, surfaced from `content.icon`. */
  icon?: string;
}

export interface DocumentContent {
  blocks: Block[];
  icon?: string;
}

export interface DocumentRecord extends DocumentSummary {
  content: DocumentContent;
  createdAt: string;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const documentsApi = {
  async list(): Promise<DocumentSummary[]> {
    // The list endpoint returns full records; surface each document's emoji
    // from `content.icon` so the sidebar/list can render it without an extra fetch.
    const records = await json<DocumentRecord[]>(await fetch(`${API_BASE}/api/v1/documents`));
    return records.map(({ id, title, updatedAt, content }) => ({
      id,
      title,
      updatedAt,
      icon: content?.icon,
    }));
  },

  async get(id: string): Promise<DocumentRecord> {
    return json(await fetch(`${API_BASE}/api/v1/documents/${id}`));
  },

  async create(title = 'Untitled'): Promise<DocumentRecord> {
    return json(
      await fetch(`${API_BASE}/api/v1/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: { blocks: [] } }),
      })
    );
  },

  async save(id: string, data: { title?: string; content?: DocumentContent }): Promise<DocumentRecord> {
    return json(
      await fetch(`${API_BASE}/api/v1/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    );
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/documents/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 204) throw new Error(`Failed to delete: ${res.status}`);
  },
};
