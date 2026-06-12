import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import type { PutObjectInput, StorageDriver, StoredFile } from './types';

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 0 ? base : 'file';
}

/** Stores uploads on local disk under `UPLOAD_DIR`, served by koa-static at
 * `/uploads`. Default driver for the reference server and demo. */
export class LocalStorageDriver implements StorageDriver {
  private readonly dir: string;

  constructor(dir = env.storage.uploadDir) {
    this.dir = path.resolve(dir);
  }

  private async ensureDir(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async put(input: PutObjectInput): Promise<StoredFile> {
    await this.ensureDir();
    const safe = sanitizeFilename(input.filename);
    const key = `${randomUUID()}-${safe}`;
    await fs.writeFile(path.join(this.dir, key), input.body);
    return { key, url: this.urlFor(key) };
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(path.join(this.dir, path.basename(key)));
    } catch {
      // best-effort
    }
  }

  urlFor(key: string): string {
    return `${env.publicBaseUrl.replace(/\/$/, '')}/uploads/${encodeURIComponent(key)}`;
  }
}
