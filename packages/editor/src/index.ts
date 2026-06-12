// Public API for @kalamos/editor.

// Editor surfaces
export { BlockEditor } from './components/editor/BlockEditor';
export { InlineEditor } from './components/editor/InlineEditor';
export { BlocksList } from './components/editor/BlocksList';
export { FixedToolbar } from './components/editor/FixedToolbar';

// Configuration provider (adapters + strings + user)
export { EditorProvider } from './components/EditorProvider';
export type { EditorProviderProps } from './components/EditorProvider';

// Internal block/onChange context (advanced use)
export {
  EditorProvider as EditorStateProvider,
  useEditorContext,
} from './contexts/EditorContext';

// Block registry plugin API
export {
  registerBlock,
  unregisterBlock,
  getBlockPlugin,
  getRegisteredBlocks,
  subscribeToRegistry,
} from './registry/blockRegistry';
export type { BlockPlugin, BlockPluginSlashMenu } from './registry/blockRegistry';
export type { BlockRendererProps } from './components/editor/blocks/types';

// Upload adapter
export { setUploadAdapter, getUploadAdapter, noopUploadAdapter } from './adapters/registry';
export type {
  UploadAdapter,
  UploadResult,
  UnsplashImage,
  UnsplashSearchResult,
} from './adapters/types';

// i18n
export { defaultStrings } from './i18n/strings';
export type { EditorStrings } from './i18n/strings';
export { setEditorStrings, getEditorStrings } from './i18n/runtime';
export type { StringsTree, DeepPartial } from './i18n/runtime';

// User
export { setCurrentUser } from './hooks/useAuth';
export type { EditorUser } from './hooks/useAuth';

// Bookmark / link preview
export { setLinkPreviewFetcher } from './services/api';
export type { LinkPreviewFetcher, LinkPreviewMetadata } from './services/api';

// Types
export type {
  Block,
  BlockType,
  BlockComment,
  InlineComment,
  DrawingStroke,
  DrawingPoint,
} from './types/editor';
