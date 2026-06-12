import type { UploadAdapter, UnsplashSearchResult } from './types';

const EMPTY_UNSPLASH: UnsplashSearchResult = { total: 0, total_pages: 0, results: [] };

/**
 * Fallback adapter used when the consumer has not supplied one. Uploads throw a
 * clear error; optional integrations degrade gracefully.
 */
export const noopUploadAdapter: UploadAdapter = {
  async uploadImage() {
    throw new Error('No UploadAdapter configured. Pass `uploadAdapter` to <EditorProvider> to enable image uploads.');
  },
  async uploadVideo() {
    throw new Error('No UploadAdapter configured. Pass `uploadAdapter` to <EditorProvider> to enable video uploads.');
  },
  async uploadAudio() {
    throw new Error('No UploadAdapter configured. Pass `uploadAdapter` to <EditorProvider> to enable audio uploads.');
  },
  async uploadFile() {
    throw new Error('No UploadAdapter configured. Pass `uploadAdapter` to <EditorProvider> to enable file uploads.');
  },
  async searchUnsplash() {
    return EMPTY_UNSPLASH;
  },
  async trackUnsplashDownload() {
    /* no-op */
  },
  proxyImageUrl(url: string) {
    return url;
  },
};

let current: UploadAdapter = noopUploadAdapter;

export function setUploadAdapter(adapter: UploadAdapter | undefined | null): void {
  current = adapter ?? noopUploadAdapter;
}

export function getUploadAdapter(): UploadAdapter {
  return current;
}
