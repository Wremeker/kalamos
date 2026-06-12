import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Compatibility shim for the app's `useToast` hook, backed by `sonner`.
 * Supports the `toast({ title, description, variant })` call shape.
 */
export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const message = title ?? description ?? '';
    if (variant === 'destructive') {
      sonnerToast.error(message, description && title ? { description } : undefined);
    } else {
      sonnerToast(message, description && title ? { description } : undefined);
    }
  };
  return { toast };
}
