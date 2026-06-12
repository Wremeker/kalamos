import { useState, useCallback, useEffect, useRef } from 'react';
import { Block } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';
import { useBlockDragSelection } from './useBlockDragSelection';
import { createBlock, setCaretToStart, setCaretToEnd, getTargetIndexAfterDeletion, copyBlocksToClipboard, parseBlocksFromClipboard } from '../../utils/editorUtils';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_EXERCISE,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
  isNonTextBlockType,
} from '../../constants/blockTypes';

interface UseBlockSelectionProps {
  handleChange: (blocks: Block[]) => void;
  scrollTopOffset?: number;
  onExerciseDelete?: (exerciseDbId: number) => void;
}

export const useBlockSelection = ({ handleChange, scrollTopOffset, onExerciseDelete }: UseBlockSelectionProps) => {
  const { blocks, editorRef } = useEditorContext();

  const [justFinishedSelecting, setJustFinishedSelecting] = useState(false);
  const justFinishedRef = useRef(false);
  const justFinishedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const blockClickedRef = useRef(false);

  // Set synchronously from the mouseup path (via onDragEnd callback) so
  // the click handler that fires immediately after mouseup can read it.
  const handleDragEnd = useCallback(() => {
    justFinishedRef.current = true;
    setJustFinishedSelecting(true);
    clearTimeout(justFinishedTimerRef.current);
    justFinishedTimerRef.current = setTimeout(() => {
      justFinishedRef.current = false;
      setJustFinishedSelecting(false);
    }, 150);
  }, []);

  const {
    selectedBlockIds,
    setSelectedBlockIds,
    isSelecting,
    anchorIndex: dragAnchor,
    cursorPosition,
    selectionStartPos,
    setSelectionRange,
    startTracking,
    beginDrag,
  } = useBlockDragSelection(editorRef, blocks, { scrollTopOffset, onDragEnd: handleDragEnd });

  const getBlockIndexFromY = useCallback((y: number): number => {
    const blockElements = editorRef.current?.querySelectorAll('[data-block-id]') ?? [];
    let closestIndex = 0;
    let minDistance = Infinity;

    blockElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      const blockCenter = rect.top + rect.height / 2;
      const distance = Math.abs(y - blockCenter);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, [editorRef]);

  const handleBlockMouseDown = useCallback((e: React.MouseEvent, index: number, blockId: string) => {
    const target = e.target as HTMLElement;

    if (e.button !== 0) return;

    if (target.tagName === 'CANVAS' || target.closest('canvas') || target.closest('[data-drawing-canvas]')) {
      return;
    }

    const block = blocks[index];
    if (block && (block.type === BLOCK_TYPE_CODE || block.type === BLOCK_TYPE_EXERCISE)) {
      if (selectedBlockIds.size > 0) {
        setSelectedBlockIds(new Set());
      }
      return;
    }

    if (justFinishedSelecting) {
      setJustFinishedSelecting(false);
      e.preventDefault();
      return;
    }

    if (isSelecting) {
      return;
    }

    // Shift-click: extend range from current anchor (or existing selection bounds)
    if (e.shiftKey && selectedBlockIds.size > 0) {
      e.preventDefault();
      blockClickedRef.current = true;

      const anchor = dragAnchor ?? (() => {
        const selectedIndices = blocks
          .map((b, i) => selectedBlockIds.has(b.id) ? i : -1)
          .filter(i => i !== -1);
        return Math.min(...selectedIndices);
      })();

      setSelectionRange(anchor, index);
      return;
    }

    // Ctrl/Meta-click: toggle individual block
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      blockClickedRef.current = true;
      const newSelected = new Set(selectedBlockIds);
      if (newSelected.has(blockId)) {
        newSelected.delete(blockId);
      } else {
        newSelected.add(blockId);
      }
      setSelectedBlockIds(newSelected);
      return;
    }

    // Determine if started on editable content
    const isDirectlyOnEditableContent = target.isContentEditable ||
      (target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true');

    const activeElement = document.activeElement as HTMLElement;
    const hasActiveCaret = activeElement && (
      activeElement.isContentEditable ||
      activeElement.hasAttribute('contenteditable')
    );

    const startedOnEditable = !!(isDirectlyOnEditableContent || hasActiveCaret);

    if (startedOnEditable) {
      if (selectedBlockIds.size > 0) {
        setSelectedBlockIds(new Set());
      }
    } else {
      setSelectedBlockIds(new Set([blockId]));
      blockClickedRef.current = true;
    }

    // Delegate to drag hook for potential drag tracking
    startTracking(index, e.clientX, e.clientY, startedOnEditable);

    if (!startedOnEditable) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [blocks, selectedBlockIds, isSelecting, justFinishedSelecting, dragAnchor, setSelectedBlockIds, setSelectionRange, startTracking]);

  const handleBlockMouseEnter = useCallback((_index: number, _e?: React.MouseEvent) => {
    // During drag, the drag hook handles hit-testing via mousemove.
    // This handler is kept for API compatibility but no longer drives selection.
  }, []);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (e.button !== 0) return;

    // Ignore events from portals (e.g. Mantine Select dropdowns) that bubble
    // through React's synthetic event system but are outside the editor DOM.
    if (!editorRef.current?.contains(target)) {
      return;
    }

    if (target.tagName === 'CANVAS' || target.closest('[data-drawing-canvas]')) {
      return;
    }

    if (justFinishedSelecting) {
      return;
    }

    if (isSelecting) {
      return;
    }

    const isContentEditable = target.isContentEditable ||
      target.closest('[contenteditable="true"]');

    if (isContentEditable) {
      return;
    }

    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' ||
        target.closest('button') || target.closest('input')) {
      return;
    }

    // Don't trigger selection inside exercise blocks
    const closestBlockContainer = target.closest('[id^="block-container-"]');
    if (closestBlockContainer) {
      const blockId = closestBlockContainer.id.replace('block-container-', '');
      const block = blocks.find(b => b.id === blockId);
      if (block && block.type === BLOCK_TYPE_EXERCISE) {
        return;
      }
    }

    const blockElements = editorRef.current?.querySelectorAll('[data-block-id]') ?? [];

    // Handle click in completely empty editor
    if (blockElements.length === 0) {
      e.preventDefault();
      const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
      handleChange([newBlock]);

      setTimeout(() => {
        const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
        if (newBlockElement) {
          newBlockElement.focus();
          setCaretToStart(newBlockElement);
        }
      }, 0);
      return;
    }

    // Handle click below all blocks
    if (blockElements.length > 0) {
      const lastBlockElement = blockElements[blockElements.length - 1] as HTMLElement;
      const lastBlockRect = lastBlockElement.getBoundingClientRect();

      if (e.clientY > lastBlockRect.bottom) {
        const mouseDownPos = { x: e.clientX, y: e.clientY };
        let hasMoved = false;

        const handleMoveCheck = (moveEvent: MouseEvent) => {
          const dx = Math.abs(moveEvent.clientX - mouseDownPos.x);
          const dy = Math.abs(moveEvent.clientY - mouseDownPos.y);
          if (dx > 5 || dy > 5) {
            hasMoved = true;
            document.removeEventListener('mousemove', handleMoveCheck);
            document.removeEventListener('mouseup', handleClickBelowBlocks);

            const lastBlockIndex = blocks.length - 1;
            startTracking(lastBlockIndex, e.clientX, e.clientY, false);
            beginDrag(lastBlockIndex);
          }
        };

        const handleClickBelowBlocks = () => {
          document.removeEventListener('mouseup', handleClickBelowBlocks);
          document.removeEventListener('mousemove', handleMoveCheck);

          if (!hasMoved) {
            const lastBlock = blocks[blocks.length - 1];
            const isLastBlockEmpty = !lastBlock.text || lastBlock.text.trim() === '';
            const isNonTextBlock = isNonTextBlockType(lastBlock.type);

            if (!isLastBlockEmpty || isNonTextBlock) {
              const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
              const newBlocks = [...blocks, newBlock];
              handleChange(newBlocks);

              setTimeout(() => {
                const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
                if (newBlockElement) {
                  newBlockElement.focus();
                  setCaretToStart(newBlockElement);
                }
              }, 0);
            } else {
              lastBlockElement.focus();
              setCaretToStart(lastBlockElement);
            }
          }
        };

        document.addEventListener('mousemove', handleMoveCheck);
        document.addEventListener('mouseup', handleClickBelowBlocks, { once: true });

        return;
      }
    }

    // Handle click in gap between blocks
    if (!closestBlockContainer) {
      const blockContainers = Array.from(
        editorRef.current?.querySelectorAll('[id^="block-container-"]') ?? []
      );

      if (blockContainers.length > 0) {
        let insertIndex = blocks.length;

        for (let i = 0; i < blockContainers.length; i++) {
          const rect = blockContainers[i].getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            insertIndex = i;
            break;
          }
        }

        const mouseDownPos = { x: e.clientX, y: e.clientY };
        let hasMoved = false;

        const handleGapMoveCheck = (moveEvent: MouseEvent) => {
          const dx = Math.abs(moveEvent.clientX - mouseDownPos.x);
          const dy = Math.abs(moveEvent.clientY - mouseDownPos.y);
          if (dx > 5 || dy > 5) {
            hasMoved = true;
            document.removeEventListener('mousemove', handleGapMoveCheck);
            document.removeEventListener('mouseup', handleGapClick);

            const nearestBlockIndex = getBlockIndexFromY(e.clientY);
            startTracking(nearestBlockIndex, e.clientX, e.clientY, false);
            beginDrag(nearestBlockIndex);
          }
        };

        const handleGapClick = (upEvent: MouseEvent) => {
          document.removeEventListener('mouseup', handleGapClick);
          document.removeEventListener('mousemove', handleGapMoveCheck);

          if (!hasMoved) {
            const prevBlock = insertIndex > 0 ? blocks[insertIndex - 1] : null;
            const nextBlock = insertIndex < blocks.length ? blocks[insertIndex] : null;
            const isListType = (b: Block) => b.type === BLOCK_TYPE_BULLETED || b.type === BLOCK_TYPE_NUMBERED;
            const isBetweenLists = prevBlock !== null && nextBlock !== null && isListType(prevBlock) && isListType(nextBlock);

            if (!isBetweenLists) {
              upEvent.preventDefault();
              const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
              const newBlocks = [...blocks];
              newBlocks.splice(insertIndex, 0, newBlock);
              handleChange(newBlocks);

              setTimeout(() => {
                const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
                if (newBlockElement) {
                  newBlockElement.focus();
                  setCaretToStart(newBlockElement);
                }
              }, 0);
            }
          }
        };

        document.addEventListener('mousemove', handleGapMoveCheck);
        document.addEventListener('mouseup', handleGapClick, { once: true });

        e.preventDefault();
        return;
      }
    }

    // Fallback: start drag from nearest block
    const blockIndex = getBlockIndexFromY(e.clientY);

    if (blockIndex >= 0 && blockIndex < blocks.length) {
      startTracking(blockIndex, e.clientX, e.clientY, false);
      beginDrag(blockIndex);
    }
  }, [blocks, justFinishedSelecting, isSelecting, getBlockIndexFromY, handleChange, editorRef, startTracking, beginDrag]);

  // Click outside to clear selection
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (blockClickedRef.current) {
      blockClickedRef.current = false;
      return;
    }

    if (selectedBlockIds.size === 0) {
      return;
    }

    const target = e.target as HTMLElement;

    if (justFinishedRef.current || justFinishedSelecting) {
      return;
    }

    if (!editorRef.current?.contains(target)) {
      setSelectedBlockIds(new Set());
      return;
    }

    if (
      target.closest('button') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[role="menu"]') ||
      target.closest('[data-selected]')
    ) {
      return;
    }

    const isContentEditable = target.isContentEditable ||
      target.closest('[contenteditable="true"]');

    if (isContentEditable) {
      return;
    }

    setSelectedBlockIds(new Set());
  }, [justFinishedSelecting, editorRef, setSelectedBlockIds, selectedBlockIds.size]);

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Keyboard shortcuts: Delete, Backspace, Copy, Cut
  useEffect(() => {
    const deleteSelectedBlocks = () => {
      if (onExerciseDelete) {
        for (const block of blocks) {
          if (selectedBlockIds.has(block.id) && block.type === BLOCK_TYPE_EXERCISE && block.exerciseDbId) {
            onExerciseDelete(block.exerciseDbId);
          }
        }
      }

      const newBlocks = blocks.filter(b => !selectedBlockIds.has(b.id));

      if (newBlocks.length === 0) {
        handleChange([createBlock(BLOCK_TYPE_PARAGRAPH, '')]);
      } else {
        handleChange(newBlocks);
      }

      setSelectedBlockIds(new Set());

      setTimeout(() => {
        const targetIndex = getTargetIndexAfterDeletion(blocks, selectedBlockIds, newBlocks);

        if (targetIndex >= 0 && newBlocks[targetIndex]) {
          const targetElement = editorRef.current?.querySelector(`[data-block-id="${newBlocks[targetIndex].id}"]`) as HTMLElement;
          if (targetElement) {
            targetElement.focus();
            setCaretToEnd(targetElement);
          }
        }
      }, 0);
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (selectedBlockIds.size === 0) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
        copyBlocksToClipboard(selectedBlocks);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
        copyBlocksToClipboard(selectedBlocks);
        deleteSelectedBlocks();
        return;
      }

      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedBlocks();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedBlockIds, blocks, handleChange, editorRef, setSelectedBlockIds]);

  // Paste over selected blocks
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (selectedBlockIds.size === 0) return;

      const clipboardText = e.clipboardData?.getData('text/plain');
      if (!clipboardText) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      let pastedBlocks = parseBlocksFromClipboard(clipboardText);
      if (!pastedBlocks || pastedBlocks.length === 0) {
        pastedBlocks = [createBlock(BLOCK_TYPE_PARAGRAPH, clipboardText.trim())];
      }

      const firstSelectedIndex = blocks.findIndex(b => selectedBlockIds.has(b.id));
      const insertAt = firstSelectedIndex >= 0 ? firstSelectedIndex : blocks.length;

      const remaining = blocks.filter(b => !selectedBlockIds.has(b.id));
      const adjustedIndex = Math.min(insertAt, remaining.length);
      remaining.splice(adjustedIndex, 0, ...pastedBlocks);

      handleChange(remaining);
      setSelectedBlockIds(new Set());

      setTimeout(() => {
        const lastPastedBlock = pastedBlocks![pastedBlocks!.length - 1];
        const lastElement = editorRef.current?.querySelector(`[data-block-id="${lastPastedBlock.id}"]`) as HTMLElement;
        if (lastElement) {
          lastElement.focus();
          setCaretToEnd(lastElement);
        }
      }, 0);
    };

    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [selectedBlockIds, blocks, handleChange, editorRef, setSelectedBlockIds]);

  // Nested block handlers
  const handleNestedBlockMouseDown = useCallback((e: React.MouseEvent, blockId: string) => {
    if (e.button !== 0) return;

    if (justFinishedSelecting) {
      setJustFinishedSelecting(false);
      e.preventDefault();
      return;
    }

    if (isSelecting) {
      return;
    }

    if (e.shiftKey && selectedBlockIds.size > 0) {
      e.preventDefault();
      const newSelected = new Set(selectedBlockIds);
      newSelected.add(blockId);
      setSelectedBlockIds(newSelected);
      return;
    }

    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const newSelected = new Set(selectedBlockIds);
      if (newSelected.has(blockId)) {
        newSelected.delete(blockId);
      } else {
        newSelected.add(blockId);
      }
      setSelectedBlockIds(newSelected);
      return;
    }

    const target = e.target as HTMLElement;
    const isDirectlyOnEditableContent = target.isContentEditable ||
      (target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true');

    const activeElement = document.activeElement as HTMLElement;
    const hasActiveCaret = activeElement && (
      activeElement.isContentEditable ||
      activeElement.hasAttribute('contenteditable')
    );

    if (selectedBlockIds.size > 0) {
      setSelectedBlockIds(new Set());
    }

    if (isDirectlyOnEditableContent || hasActiveCaret) {
      return;
    }

    setSelectedBlockIds(new Set([blockId]));
    e.preventDefault();
    e.stopPropagation();
  }, [selectedBlockIds, isSelecting, justFinishedSelecting, setSelectedBlockIds]);

  const handleNestedBlockMouseEnter = useCallback((_e: React.MouseEvent, blockId: string) => {
    if (!isSelecting) return;

    const newSelected = new Set(selectedBlockIds);
    newSelected.add(blockId);
    setSelectedBlockIds(newSelected);
  }, [isSelecting, selectedBlockIds, setSelectedBlockIds]);

  return {
    selectedBlockIds,
    setSelectedBlockIds,
    isSelecting,
    cursorPosition,
    selectionStartPos,
    handleBlockMouseDown,
    handleBlockMouseEnter,
    handleContainerMouseDown,
    handleNestedBlockMouseDown,
    handleNestedBlockMouseEnter,
  };
};
