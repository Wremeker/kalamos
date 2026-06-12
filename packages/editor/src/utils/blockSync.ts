import { Block } from '@/types/editor';

const SYNC_KEYS: (keyof Block)[] = [
  'text', 'type', 'checked',
  'imageUrl', 'imageFile', 'imageWidth', 'imageHeight', 'imageAlignment',
  'videoUrl', 'videoWidth', 'videoHeight', 'videoAlignment',
  'audioUrl', 'pdfUrl', 'pdfWidth', 'pdfHeight', 'pdfAlignment',
  'caption', 'language', 'url', 'title', 'description',
  'textColor', 'backgroundColor', 'alignment', 'emoji',
  'isOpen', 'exerciseName', 'startNumber', 'latexMode',
  'drawingData', 'columns', 'children', 'tableData',
  'exerciseData', 'comments', 'inlineComments', 'columnWidths',
];

function blockContentEqual(a: Block, b: Block): boolean {
  return SYNC_KEYS.every((key) => {
    const va = a[key];
    const vb = b[key];
    if (va === vb) return true;
    if (typeof va === 'object' || typeof vb === 'object') {
      return JSON.stringify(va) === JSON.stringify(vb);
    }
    return false;
  });
}

/**
 * Compares old and new blocks to determine what changed.
 * Returns the IDs of changed blocks and whether the structure (order/count) changed.
 */
export function computeChangedBlockIds(
  oldBlocks: Block[],
  newBlocks: Block[],
): { changedBlockIds: string[]; isStructuralChange: boolean } {
  if (oldBlocks.length !== newBlocks.length) {
    const changedBlockIds = newBlocks.map((b) => b.id);
    return { changedBlockIds, isStructuralChange: true };
  }

  for (let i = 0; i < oldBlocks.length; i++) {
    if (oldBlocks[i].id !== newBlocks[i].id) {
      const changedBlockIds = newBlocks.map((b) => b.id);
      return { changedBlockIds, isStructuralChange: true };
    }
  }

  const changedBlockIds: string[] = [];
  for (let i = 0; i < newBlocks.length; i++) {
    if (!blockContentEqual(oldBlocks[i], newBlocks[i])) {
      changedBlockIds.push(newBlocks[i].id);
    }
  }

  return { changedBlockIds, isStructuralChange: false };
}

/**
 * Returns the block ID that the user is currently focused on (editing).
 */
export function getFocusedBlockId(): string | null {
  const active = document.activeElement;
  if (!active) return null;
  let el: HTMLElement | null = active as HTMLElement;
  while (el && !el.hasAttribute('data-block-id')) {
    el = el.parentElement;
  }
  return el?.getAttribute('data-block-id') || null;
}

/**
 * Merges remote block changes into the local blocks state.
 * For structural changes: uses remote blocks as base, preserves the focused block.
 * For content changes: updates only the changed blocks, skips the focused block.
 */
export function mergeRemoteBlocks(
  localBlocks: Block[],
  remoteBlocks: Block[],
  changedBlockIds: string[],
  isStructuralChange: boolean,
  focusedBlockId?: string | null,
): Block[] {
  if (isStructuralChange) {
    if (focusedBlockId) {
      const localFocused = localBlocks.find((b) => b.id === focusedBlockId);
      if (localFocused) {
        return remoteBlocks.map((b) =>
          b.id === focusedBlockId ? localFocused : b,
        );
      }
    }
    return remoteBlocks;
  }

  const changedSet = new Set(changedBlockIds);
  const remoteMap = new Map(remoteBlocks.map((b) => [b.id, b]));

  return localBlocks.map((block) => {
    if (changedSet.has(block.id) && block.id !== focusedBlockId) {
      return remoteMap.get(block.id) || block;
    }
    return block;
  });
}
