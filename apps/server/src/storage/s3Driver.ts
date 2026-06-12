import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env';
import type { PutObjectInput, StorageDriver, StoredFile } from './types';

function sanitizeFilename(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.length > 0 ? base : 'file';
}

/**
 * S3-compatible storage driver (AWS S3, Cloudflare R2, MinIO, etc.). Requires
 * the optional `@aws-sdk/client-s3` dependency. The client is imported lazily so
 * the server runs with the local driver without the AWS SDK installed.
 */
export class S3StorageDriver implements StorageDriver {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any;
  private readonly bucket = env.storage.s3.bucket;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(S3Client: any) {
    this.client = new S3Client({
      region: env.storage.s3.region,
      endpoint: env.storage.s3.endpoint,
      forcePathStyle: env.storage.s3.forcePathStyle,
      credentials: {
        accessKeyId: env.storage.s3.accessKeyId,
        secretAccessKey: env.storage.s3.secretAccessKey,
      },
    });
  }

  static async create(): Promise<S3StorageDriver> {
    if (!env.storage.s3.bucket) {
      throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET to be configured.');
    }
    let mod: any;
    try {
      mod = await import('@aws-sdk/client-s3');
    } catch {
      throw new Error(
        'STORAGE_DRIVER=s3 requires the optional dependency "@aws-sdk/client-s3". Install it to use S3 storage.'
      );
    }
    const driver = new S3StorageDriver(mod.S3Client);
    driver.PutObjectCommand = mod.PutObjectCommand;
    driver.DeleteObjectCommand = mod.DeleteObjectCommand;
    return driver;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private PutObjectCommand: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private DeleteObjectCommand: any;

  async put(input: PutObjectInput): Promise<StoredFile> {
    const safe = sanitizeFilename(input.filename);
    const key = `${randomUUID()}-${safe}`;
    await this.client.send(
      new this.PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      })
    );
    return { key, url: this.urlFor(key) };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new this.DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      );
    } catch {
      // best-effort
    }
  }

  urlFor(key: string): string {
    const base = env.storage.s3.publicBaseUrl
      ? env.storage.s3.publicBaseUrl.replace(/\/$/, '')
      : env.storage.s3.endpoint
        ? `${env.storage.s3.endpoint.replace(/\/$/, '')}/${this.bucket}`
        : `https://${this.bucket}.s3.${env.storage.s3.region}.amazonaws.com`;
    return `${base}/${encodeURIComponent(key)}`;
  }
}
