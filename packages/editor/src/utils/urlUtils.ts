import { API_URL } from '../config/env';

/**
 * Convert a possibly-relative media URL to an absolute URL. Adapter-provided
 * URLs are already absolute and returned unchanged; relative paths are prefixed
 * with API_URL (empty by default).
 */
export function getFullMediaUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  return `${API_URL}${url}`;
}
