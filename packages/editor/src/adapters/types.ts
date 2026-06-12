export interface UploadResult {
  /** Publicly fetchable URL of the stored file. */
  url: string;
}

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
    links: { html: string };
  };
  links: {
    html: string;
    download_location: string;
  };
  width: number;
  height: number;
}

export interface UnsplashSearchResult {
  total: number;
  total_pages: number;
  results: UnsplashImage[];
}

/**
 * Pluggable storage backend for editor media. Provide an implementation to
 * `EditorProvider` (or `setUploadAdapter`) to wire image/video/audio/file
 * uploads to your own server. Only the upload methods are required.
 */
export interface UploadAdapter {
  uploadImage(file: File): Promise<UploadResult>;
  uploadVideo(file: File, onProgress?: (percent: number) => void): Promise<UploadResult>;
  uploadAudio(file: File): Promise<UploadResult>;
  /** Generic file upload (used for PDFs and other attachments). */
  uploadFile(file: File): Promise<UploadResult>;

  /** Optional: import an image by remote URL (e.g. paste-from-web, Unsplash). */
  uploadImageFromUrl?(url: string): Promise<UploadResult>;
  /** Optional: best-effort delete of a previously uploaded file. */
  deleteByUrl?(url: string): Promise<void>;
  /** Optional: rewrite an external image URL through a CORS-safe proxy. */
  proxyImageUrl?(url: string): string;

  /** Optional: Unsplash integration for the image picker. */
  searchUnsplash?(query: string, page?: number, perPage?: number): Promise<UnsplashSearchResult>;
  trackUnsplashDownload?(downloadLocation: string): Promise<void>;
}
