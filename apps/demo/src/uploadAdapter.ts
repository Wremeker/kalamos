import type { UploadAdapter, UploadResult } from '@kalamoss/editor';
import { API_BASE } from './config';

async function upload(endpoint: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/v1/media/${endpoint}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { url: string };
  return { url: data.url };
}

/** UploadAdapter that posts media to the reference server's /api/v1/media. */
export const httpUploadAdapter: UploadAdapter = {
  uploadImage: (file) => upload('image', file),
  uploadVideo: (file) => upload('video', file),
  uploadAudio: (file) => upload('audio', file),
  uploadFile: (file) => upload('file', file),
};
