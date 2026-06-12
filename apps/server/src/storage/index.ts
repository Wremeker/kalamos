import { env } from '../config/env';
import { LocalStorageDriver } from './localDriver';
import { S3StorageDriver } from './s3Driver';
import type { StorageDriver } from './types';

let driver: StorageDriver | null = null;

export async function getStorageDriver(): Promise<StorageDriver> {
  if (driver) return driver;
  driver = env.storage.driver === 's3' ? await S3StorageDriver.create() : new LocalStorageDriver();
  return driver;
}

/** Override the active driver (used by tests). */
export function setStorageDriver(custom: StorageDriver | null): void {
  driver = custom;
}

export type { StorageDriver } from './types';
