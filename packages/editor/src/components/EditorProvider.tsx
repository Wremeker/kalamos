import React from 'react';
import { setUploadAdapter } from '../adapters/registry';
import type { UploadAdapter } from '../adapters/types';
import { setEditorStrings, type StringsTree, type DeepPartial } from '../i18n/runtime';
import { setCurrentUser, type EditorUser } from '../hooks/useAuth';
import { setLinkPreviewFetcher, type LinkPreviewFetcher } from '../services/api';

export interface EditorProviderProps {
  /** Storage backend for image/video/audio/file uploads. */
  uploadAdapter?: UploadAdapter;
  /** Localized string overrides, deep-merged over the bundled English defaults. */
  strings?: DeepPartial<StringsTree>;
  /** Current user, used for comment authorship and avatars. */
  user?: EditorUser | null;
  /** Optional server-side Open Graph fetcher for bookmark blocks. */
  linkPreviewFetcher?: LinkPreviewFetcher | null;
  children: React.ReactNode;
}

/**
 * Top-level configuration provider. Wires the injected adapters and string
 * table into the editor's module-level registries before the editor renders.
 * Configuration is applied synchronously so descendant editors observe it on
 * their first render.
 */
export function EditorProvider({
  uploadAdapter,
  strings,
  user,
  linkPreviewFetcher,
  children,
}: EditorProviderProps) {
  // Apply configuration synchronously during render. The setters are idempotent
  // and cheap, and the editor reads them lazily at call time.
  setUploadAdapter(uploadAdapter);
  setEditorStrings(strings);
  setCurrentUser(user ?? null);
  setLinkPreviewFetcher(linkPreviewFetcher ?? null);

  return <>{children}</>;
}
