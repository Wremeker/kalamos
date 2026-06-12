/**
 * Extract a human-readable message from an unknown error. Prefers an explicit
 * `code`/`message`, then a provided fallback, then a generic message.
 */
export function getErrorMessage(error: unknown, _fallbackKey?: string, fallbackDefault?: string): string {
  const e = error as { code?: string; message?: string } | null | undefined;
  if (e?.code) return e.code;
  if (e?.message) return e.message;
  return fallbackDefault || 'An unexpected error occurred. Please try again.';
}

export function showErrorToast(
  error: unknown,
  toast: { error: (message: string) => void },
  fallbackKey?: string,
  fallbackDefault?: string,
): void {
  toast.error(getErrorMessage(error, fallbackKey, fallbackDefault));
}
