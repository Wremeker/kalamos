import type { ReactNode } from 'react';
import type { BlockRendererProps } from '../components/editor/blocks/types';

export interface BlockPluginSlashMenu {
  /** Section label, e.g. "Custom". */
  group: string;
  /** Menu entry label. */
  label: string;
  /** Optional icon element. */
  icon?: ReactNode;
  /** Keywords for fuzzy search in the slash menu. */
  keywords?: string[];
}

export interface BlockPlugin {
  /** Unique block type discriminator stored on `block.type`. */
  type: string;
  /** Renders the block. Receives the same props as built-in block renderers. */
  render: (props: BlockRendererProps) => ReactNode;
  /** Optional slash-menu entry used to insert this block. */
  slashMenu?: BlockPluginSlashMenu;
  /** Optional factory for the initial block data when inserted. */
  initialData?: () => Partial<Record<string, unknown>>;
}

const registry = new Map<string, BlockPlugin>();
const listeners = new Set<() => void>();

/** Register (or replace) a custom block plugin. */
export function registerBlock(plugin: BlockPlugin): void {
  registry.set(plugin.type, plugin);
  listeners.forEach((l) => l());
}

export function unregisterBlock(type: string): void {
  registry.delete(type);
  listeners.forEach((l) => l());
}

export function getBlockPlugin(type: string): BlockPlugin | undefined {
  return registry.get(type);
}

export function getRegisteredBlocks(): BlockPlugin[] {
  return Array.from(registry.values());
}

/** Subscribe to registry changes (used by menus that list custom blocks). */
export function subscribeToRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
