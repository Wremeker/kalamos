import { useCallback, useEffect, useRef, useState } from 'react';
import { Block } from '../../types/editor';

export interface BlockSelection {
  anchorIndex: number;
  focusIndex: number;
}

const EDGE_THRESHOLD = 80;
const MAX_SCROLL_SPEED = 30;
const MOVE_THRESHOLD = 5;

function findScrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

function hitTestBlockIndex(
  clientX: number,
  clientY: number,
  blocks: Block[],
  editorEl: HTMLElement,
): number | null {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return fallbackClosestBlock(clientY, blocks, editorEl);

  let node: Element | null = el;
  while (node && node !== editorEl) {
    if (node instanceof HTMLElement && node.hasAttribute('data-block-id')) {
      const blockId = node.getAttribute('data-block-id');
      const idx = blocks.findIndex(b => b.id === blockId);
      if (idx !== -1) return idx;

      // Nested block — find its top-level container
      const container = node.closest('[id^="block-container-"]');
      if (container) {
        const containerId = container.id.replace('block-container-', '');
        const parentIdx = blocks.findIndex(b => b.id === containerId);
        if (parentIdx !== -1) return parentIdx;
      }
      break;
    }
    // Also check block-container elements directly
    if (node instanceof HTMLElement && node.id?.startsWith('block-container-')) {
      const containerId = node.id.replace('block-container-', '');
      const idx = blocks.findIndex(b => b.id === containerId);
      if (idx !== -1) return idx;
    }
    node = node.parentElement;
  }

  return fallbackClosestBlock(clientY, blocks, editorEl);
}

function fallbackClosestBlock(
  clientY: number,
  blocks: Block[],
  editorEl: HTMLElement,
): number | null {
  const containers = editorEl.querySelectorAll('[id^="block-container-"]');
  let closest = -1;
  let minDist = Infinity;

  containers.forEach((container) => {
    const blockId = container.id.replace('block-container-', '');
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return;

    const rect = container.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const dist = Math.abs(clientY - center);
    if (dist < minDist) {
      minDist = dist;
      closest = idx;
    }
  });

  return closest >= 0 ? closest : null;
}

interface UseBlockDragSelectionOptions {
  scrollTopOffset?: number;
  onDragEnd?: () => void;
}

export function useBlockDragSelection(
  editorRef: React.RefObject<HTMLDivElement | null>,
  blocks: Block[],
  options: UseBlockDragSelectionOptions = {},
) {
  const { scrollTopOffset = 0, onDragEnd: onDragEndCallback } = options;
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectionStartPos, setSelectionStartPos] = useState<{ x: number; y: number } | null>(null);

  const anchorIndexRef = useRef<number | null>(null);
  const focusIndexRef = useRef<number | null>(null);
  const isSelectingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const mouseDownIndexRef = useRef<number | null>(null);
  const mouseClientRef = useRef({ x: 0, y: 0 });
  const startedOnEditableRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const scrollTopOffsetRef = useRef(scrollTopOffset);
  scrollTopOffsetRef.current = scrollTopOffset;
  const onDragEndRef = useRef(onDragEndCallback);
  onDragEndRef.current = onDragEndCallback;

  const computeIdsFromRange = useCallback(
    (anchor: number, focus: number): Set<string> => {
      const start = Math.min(anchor, focus);
      const end = Math.max(anchor, focus);
      const ids = new Set<string>();
      for (let i = start; i <= end; i++) {
        if (blocksRef.current[i]) ids.add(blocksRef.current[i].id);
      }
      return ids;
    },
    [],
  );

  // --- Side-effects during drag ---

  const applySideEffects = useCallback(() => {
    document.body.style.userSelect = 'none';
    document.body.style.setProperty('-webkit-user-select', 'none');
    const editor = editorRef.current;
    if (editor) {
      editor.setAttribute('data-block-selecting', '');
    }
  }, [editorRef]);

  const removeSideEffects = useCallback(() => {
    document.body.style.userSelect = '';
    document.body.style.removeProperty('-webkit-user-select');
    const editor = editorRef.current;
    if (editor) {
      editor.removeAttribute('data-block-selecting');
    }
  }, [editorRef]);

  // --- Auto-scroll ---

  const stopRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const rafTick = useCallback(() => {
    if (!isSelectingRef.current) {
      rafRef.current = null;
      return;
    }

    const container = scrollContainerRef.current;
    const { y } = mouseClientRef.current;

    let containerTop: number;
    let containerBottom: number;

    if (container) {
      const rect = container.getBoundingClientRect();
      containerTop = rect.top;
      containerBottom = rect.bottom;
    } else {
      containerTop = scrollTopOffsetRef.current;
      containerBottom = window.innerHeight;
    }

    let speed = 0;
    const distFromTop = y - containerTop;
    const distFromBottom = containerBottom - y;

    if (distFromTop >= 0 && distFromTop < EDGE_THRESHOLD) {
      const ratio = 1 - distFromTop / EDGE_THRESHOLD;
      speed = -Math.round(MAX_SCROLL_SPEED * ratio * ratio);
    } else if (distFromBottom >= 0 && distFromBottom < EDGE_THRESHOLD) {
      const ratio = 1 - distFromBottom / EDGE_THRESHOLD;
      speed = Math.round(MAX_SCROLL_SPEED * ratio * ratio);
    }

    if (speed !== 0) {
      if (container) {
        container.scrollTop += speed;
      } else {
        window.scrollBy(0, speed);
      }
    }

    // Re-hit-test every frame (blocks shift under stationary cursor during scroll)
    const anchor = anchorIndexRef.current;
    if (anchor !== null) {
      const { x: cx, y: cy } = mouseClientRef.current;
      const newFocus = hitTestBlockIndex(cx, cy, blocksRef.current, editorRef.current!);
      if (newFocus !== null && newFocus !== focusIndexRef.current) {
        focusIndexRef.current = newFocus;
        setSelectedBlockIds(computeIdsFromRange(anchor, newFocus));
      }
    }

    rafRef.current = requestAnimationFrame(rafTick);
  }, [editorRef, computeIdsFromRange]);

  const startRaf = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(rafTick);
  }, [rafTick]);

  // --- Drag lifecycle ---

  const beginDrag = useCallback(
    (anchorIndex: number) => {
      anchorIndexRef.current = anchorIndex;
      focusIndexRef.current = anchorIndex;
      isSelectingRef.current = true;
      setIsSelecting(true);
      setSelectedBlockIds(computeIdsFromRange(anchorIndex, anchorIndex));

      const pos = mouseClientRef.current;
      setSelectionStartPos({ x: pos.x, y: pos.y });
      setCursorPosition({ x: pos.x, y: pos.y });

      scrollContainerRef.current = findScrollableAncestor(editorRef.current);
      applySideEffects();

      window.getSelection()?.removeAllRanges();
      (document.activeElement as HTMLElement)?.blur?.();

      startRaf();
    },
    [editorRef, applySideEffects, startRaf, computeIdsFromRange],
  );

  const endDrag = useCallback(() => {
    const hadSelection = isSelectingRef.current;
    isSelectingRef.current = false;
    setIsSelecting(false);
    setCursorPosition(null);
    setSelectionStartPos(null);
    stopRaf();
    removeSideEffects();
    mouseDownPosRef.current = null;
    mouseDownIndexRef.current = null;
    startedOnEditableRef.current = false;
    if (hadSelection) {
      onDragEndRef.current?.();
    }
  }, [stopRaf, removeSideEffects]);

  const clearSelection = useCallback(() => {
    anchorIndexRef.current = null;
    focusIndexRef.current = null;
    setSelectedBlockIds(new Set());
    if (isSelectingRef.current) {
      endDrag();
    }
  }, [endDrag]);

  const setSelectionRange = useCallback(
    (anchor: number, focus: number) => {
      anchorIndexRef.current = anchor;
      focusIndexRef.current = focus;
      setSelectedBlockIds(computeIdsFromRange(anchor, focus));
    },
    [computeIdsFromRange],
  );

  // --- Public tracking API (called by parent on mousedown) ---

  const startTracking = useCallback(
    (blockIndex: number, clientX: number, clientY: number, startedOnEditable: boolean) => {
      mouseDownPosRef.current = { x: clientX, y: clientY };
      mouseDownIndexRef.current = blockIndex;
      mouseClientRef.current = { x: clientX, y: clientY };
      startedOnEditableRef.current = startedOnEditable;
    },
    [],
  );

  const cancelTracking = useCallback(() => {
    mouseDownPosRef.current = null;
    mouseDownIndexRef.current = null;
    startedOnEditableRef.current = false;
  }, []);

  // --- Global mouse listeners ---

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseClientRef.current = { x: e.clientX, y: e.clientY };

      // Pre-drag: check movement threshold
      if (mouseDownPosRef.current && !isSelectingRef.current) {
        const dx = e.clientX - mouseDownPosRef.current.x;
        const dy = e.clientY - mouseDownPosRef.current.y;

        if (Math.sqrt(dx * dx + dy * dy) >= MOVE_THRESHOLD) {
          const anchorIndex = mouseDownIndexRef.current;
          if (anchorIndex === null || anchorIndex === undefined) return;

          if (startedOnEditableRef.current) {
            // Started on editable content — only switch to block selection
            // when the cursor crosses into a different block
            const currentIdx = hitTestBlockIndex(
              e.clientX,
              e.clientY,
              blocksRef.current,
              editorRef.current!,
            );
            if (currentIdx !== null && currentIdx !== anchorIndex) {
              beginDrag(anchorIndex);
              focusIndexRef.current = currentIdx;
              setSelectedBlockIds(computeIdsFromRange(anchorIndex, currentIdx));
            }
            return;
          }

          beginDrag(anchorIndex);
        }
        return;
      }

      // During active drag: update focus and cursor position
      if (isSelectingRef.current) {
        setCursorPosition({ x: e.clientX, y: e.clientY });
        const anchor = anchorIndexRef.current;
        if (anchor === null) return;
        const newFocus = hitTestBlockIndex(
          e.clientX,
          e.clientY,
          blocksRef.current,
          editorRef.current!,
        );
        if (newFocus !== null && newFocus !== focusIndexRef.current) {
          focusIndexRef.current = newFocus;
          setSelectedBlockIds(computeIdsFromRange(anchor, newFocus));
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    return () => document.removeEventListener('mousemove', onMouseMove);
  }, [editorRef, beginDrag, computeIdsFromRange]);

  useEffect(() => {
    const onMouseUp = () => {
      if (isSelectingRef.current) {
        endDrag();
      } else {
        mouseDownPosRef.current = null;
        mouseDownIndexRef.current = null;
        startedOnEditableRef.current = false;
      }
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, [endDrag]);

  // Cursor leaves the browser window — treat as mouseup
  useEffect(() => {
    const onMouseLeave = (e: MouseEvent) => {
      if (e.target === document.documentElement && isSelectingRef.current) {
        endDrag();
      }
    };

    document.documentElement.addEventListener('mouseleave', onMouseLeave);
    return () =>
      document.documentElement.removeEventListener('mouseleave', onMouseLeave);
  }, [endDrag]);

  // Escape clears selection
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isSelectingRef.current || anchorIndexRef.current !== null)) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clearSelection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRaf();
      removeSideEffects();
    };
  }, [stopRaf, removeSideEffects]);

  const anchorIndex = anchorIndexRef.current;

  return {
    selectedBlockIds,
    setSelectedBlockIds,
    isSelecting,
    anchorIndex,
    cursorPosition,
    selectionStartPos,
    clearSelection,
    setSelectionRange,
    startTracking,
    cancelTracking,
    beginDrag,
    endDrag,
  };
}
