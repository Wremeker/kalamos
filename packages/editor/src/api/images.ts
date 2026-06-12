import { getUploadAdapter } from '../adapters/registry';
import type { UnsplashSearchResult } from '../adapters/types';

export type { UnsplashImage, UnsplashSearchResult } from '../adapters/types';

/**
 * Adapter-backed replacement for the original app-specific images API. Method
 * signatures are preserved so editor call sites are unchanged. Internally,
 * `filename` carries the full public URL and `getImageUrl` is the identity, so
 * the existing `getImageUrl(result.filename)` pattern resolves to the URL.
 */
export const imagesApi = {
  async uploadImage({ file }: { file: File }): Promise<{ id: string; filename: string; url: string }> {
    const { url } = await getUploadAdapter().uploadImage(file);
    return { id: url, filename: url, url };
  },

  async uploadImagePublic({ file }: { file: File; publicHash?: string }): Promise<{ id: string; filename: string; url: string }> {
    const { url } = await getUploadAdapter().uploadImage(file);
    return { id: url, filename: url, url };
  },

  async uploadImageFromUrl(remoteUrl: string): Promise<{ id: string; filename: string; url: string }> {
    const adapter = getUploadAdapter();
    const { url } = adapter.uploadImageFromUrl ? await adapter.uploadImageFromUrl(remoteUrl) : { url: remoteUrl };
    return { id: url, filename: url, url };
  },

  getImageUrl(filename: string): string {
    return filename;
  },

  getProxiedImageUrl(url: string): string {
    const adapter = getUploadAdapter();
    return adapter.proxyImageUrl ? adapter.proxyImageUrl(url) : url;
  },

  getAvatarUrl(path: string): string {
    return path;
  },

  async searchUnsplash(query: string, page = 1, perPage = 20): Promise<UnsplashSearchResult> {
    const adapter = getUploadAdapter();
    if (!adapter.searchUnsplash) return { total: 0, total_pages: 0, results: [] };
    return adapter.searchUnsplash(query, page, perPage);
  },

  async trackUnsplashDownload(downloadLocation: string): Promise<void> {
    const adapter = getUploadAdapter();
    if (adapter.trackUnsplashDownload) await adapter.trackUnsplashDownload(downloadLocation);
  },
};
