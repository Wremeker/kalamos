/**
 * The OSS editor serves media from plain public URLs returned by the
 * UploadAdapter, so URL signing is a no-op passthrough. The hook keeps the
 * original `{ signedUrl, loading }` shape so block components are unchanged.
 */
export function useSignedUrl(mediaUrl: string | undefined | null) {
  return { signedUrl: mediaUrl ?? null, loading: false };
}
