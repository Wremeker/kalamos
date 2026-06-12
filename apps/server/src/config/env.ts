import dotenv from 'dotenv';

dotenv.config();

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  apiToken: process.env.API_TOKEN ?? '',

  db: {
    dialect: (process.env.DB_DIALECT ?? 'postgres') as 'postgres' | 'sqlite',
    url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/block_editor',
    sqliteStorage: process.env.SQLITE_STORAGE ?? './data/dev.sqlite',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER ?? 'local') as 'local' | 's3',
    uploadDir: process.env.UPLOAD_DIR ?? './uploads',
    s3: {
      bucket: process.env.S3_BUCKET ?? '',
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
      forcePathStyle: bool(process.env.S3_FORCE_PATH_STYLE),
    },
  },
} as const;

export type Env = typeof env;
