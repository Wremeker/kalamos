import { getUploadAdapter } from '../adapters/registry';

export interface UserMedia {
  filename: string;
  url: string;
  mediaType: 'video' | 'audio' | 'pdf';
}

/**
 * Adapter-backed replacement for the original app-specific media API. As with
 * images, `filename` carries the full public URL and `getMediaUrl` is the
 * identity so existing call sites resolve to a usable URL.
 */
export const mediaApi = {
  async uploadVideo(
    file: File,
    _contextType?: string,
    _contextId?: number,
    onProgress?: (percent: number) => void,
  ): Promise<UserMedia> {
    const { url } = await getUploadAdapter().uploadVideo(file, onProgress);
    return { filename: url, url, mediaType: 'video' };
  },

  async uploadAudio(file: File, _contextType?: string): Promise<UserMedia> {
    const { url } = await getUploadAdapter().uploadAudio(file);
    return { filename: url, url, mediaType: 'audio' };
  },

  async uploadPdf(file: File, _contextType?: string): Promise<UserMedia> {
    const { url } = await getUploadAdapter().uploadFile(file);
    return { filename: url, url, mediaType: 'pdf' };
  },

  getMediaUrl(filename: string): string {
    return filename;
  },

  async deleteMediaByFilename(filename: string): Promise<void> {
    const adapter = getUploadAdapter();
    if (adapter.deleteByUrl) await adapter.deleteByUrl(filename);
  },
};
