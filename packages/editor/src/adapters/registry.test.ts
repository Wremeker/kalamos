import { describe, it, expect, afterEach } from 'vitest';
import { getUploadAdapter, setUploadAdapter, noopUploadAdapter } from './registry';
import type { UploadAdapter } from './types';

afterEach(() => setUploadAdapter(null));

describe('upload adapter registry', () => {
  it('defaults to the noop adapter which throws on upload', async () => {
    expect(getUploadAdapter()).toBe(noopUploadAdapter);
    await expect(getUploadAdapter().uploadImage(new File([''], 'x.png'))).rejects.toThrow(
      /No UploadAdapter configured/
    );
  });

  it('uses an injected adapter', async () => {
    const adapter: UploadAdapter = {
      uploadImage: async () => ({ url: 'https://cdn/img.png' }),
      uploadVideo: async () => ({ url: 'https://cdn/v.mp4' }),
      uploadAudio: async () => ({ url: 'https://cdn/a.mp3' }),
      uploadFile: async () => ({ url: 'https://cdn/f.pdf' }),
    };
    setUploadAdapter(adapter);
    const result = await getUploadAdapter().uploadImage(new File([''], 'x.png'));
    expect(result.url).toBe('https://cdn/img.png');
  });

  it('resets to noop when set to null', () => {
    setUploadAdapter({
      uploadImage: async () => ({ url: '' }),
      uploadVideo: async () => ({ url: '' }),
      uploadAudio: async () => ({ url: '' }),
      uploadFile: async () => ({ url: '' }),
    });
    setUploadAdapter(null);
    expect(getUploadAdapter()).toBe(noopUploadAdapter);
  });
});
