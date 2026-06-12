export interface LinkPreviewMetadata {
  title?: string;
  description?: string;
  favicon?: string;
  image?: string;
}

export type LinkPreviewFetcher = (url: string) => Promise<LinkPreviewMetadata>;

let fetcher: LinkPreviewFetcher | null = null;

/** Configure how bookmark metadata is fetched (e.g. via your own server). */
export function setLinkPreviewFetcher(fn: LinkPreviewFetcher | null): void {
  fetcher = fn;
}

function fallbackMetadata(url: string): LinkPreviewMetadata {
  try {
    const u = new URL(url);
    return {
      title: u.hostname.replace(/^www\./, ''),
      description: url,
      favicon: `${u.origin}/favicon.ico`,
    };
  } catch {
    return { title: url, description: '' };
  }
}

/**
 * Bookmark metadata provider. Without a configured fetcher it degrades to
 * deriving a title/favicon from the URL (link previews need a server-side
 * scraper for full Open Graph data).
 */
export const linkPreviewApi = {
  async fetchMetadata(url: string): Promise<LinkPreviewMetadata> {
    if (fetcher) {
      try {
        return await fetcher(url);
      } catch {
        return fallbackMetadata(url);
      }
    }
    return fallbackMetadata(url);
  },
};
