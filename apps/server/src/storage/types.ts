export interface StoredFile {
  /** Stored object key / filename. */
  key: string;
  /** Publicly fetchable URL. */
  url: string;
}

export interface PutObjectInput {
  /** Suggested filename (sanitized + made unique by the driver). */
  filename: string;
  contentType: string;
  body: Buffer;
}

export interface StorageDriver {
  put(input: PutObjectInput): Promise<StoredFile>;
  /** Best-effort delete by stored key. */
  delete(key: string): Promise<void>;
  /** Resolve a public URL for a stored key. */
  urlFor(key: string): string;
}
