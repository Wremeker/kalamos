import { useState, useCallback, useRef, useEffect } from 'react';
import { Block } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';
import { BLOCK_TYPE_NUMBERED } from '../../constants/blockTypes';

interface DragState {
  draggingIndex: number | null;
  overIndex: number | null;
}

interface UseDragAndDropProps {
  handleChange: (blocks: Block[]) => void;
  scrollTopOffset?: number;
}

export const useDragAndDrop = ({ handleChange, scrollTopOffset = 0 }: UseDragAndDropProps) => {
  const { blocks } = useEditorContext();

  const [dragState, setDragState] = useState<DragState>({
    draggingIndex: null,
    overIndex: null,
  });
  
  // Use ref to avoid stale closures in handleDrop
  const dragStateRef = useRef<DragState>(dragState);
  
  // Keep ref in sync with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    if (dragState.draggingIndex === null) return;

    let animFrameId: number | null = null;
    let cursorY = 0;

    const EDGE_ZONE = 100;
    const MAX_SPEED = 22;

    const findScrollableAncestor = (): HTMLElement | null => {
      const blockEl = document.querySelector('[id^="block-container-"]');
      if (!blockEl) return null;
      let el = blockEl.parentElement;
      while (el && el !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(el);
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight
        ) {
          return el;
        }
        el = el.parentElement;
      }
      return null;
    };

    const scrollContainer = findScrollableAncestor();

    const onDragOver = (e: DragEvent) => {
      if (e.clientY !== 0) cursorY = e.clientY;
    };

    const tick = () => {
      const vh = window.innerHeight;
      const topBound = scrollContainer
        ? scrollContainer.getBoundingClientRect().top
        : scrollTopOffset;
      const bottomBound = scrollContainer
        ? scrollContainer.getBoundingClientRect().bottom
        : vh;
      const topEdge = topBound + EDGE_ZONE;
      const bottomEdge = bottomBound - EDGE_ZONE;

      if (cursorY > 0 && cursorY < topEdge) {
        const intensity = 1 - Math.max(0, cursorY - topBound) / EDGE_ZONE;
        const px = Math.ceil(MAX_SPEED * intensity * intensity);
        if (scrollContainer) scrollContainer.scrollTop -= px;
        else window.scrollBy(0, -px);
      } else if (cursorY > bottomEdge && cursorY < bottomBound) {
        const intensity = 1 - (bottomBound - cursorY) / EDGE_ZONE;
        const px = Math.ceil(MAX_SPEED * intensity * intensity);
        if (scrollContainer) scrollContainer.scrollTop += px;
        else window.scrollBy(0, px);
      }
      animFrameId = requestAnimationFrame(tick);
    };

    document.addEventListener('dragover', onDragOver);
    animFrameId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('dragover', onDragOver);
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
    };
  }, [dragState.draggingIndex]);

  const handleDragStart = useCallback((index: number) => {
    const newState = { draggingIndex: index, overIndex: null };
    setDragState(newState);
    dragStateRef.current = newState;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragState((prev) => {
      const newState = { ...prev, overIndex: index };
      dragStateRef.current = newState;
      return newState;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({ draggingIndex: null, overIndex: null });
    dragStateRef.current = { draggingIndex: null, overIndex: null };
  }, []);

  const handleDrop = useCallback(() => {
    const currentDragState = dragStateRef.current;
    
    if (currentDragState.draggingIndex === null || currentDragState.overIndex === null) {
      setDragState({ draggingIndex: null, overIndex: null });
      dragStateRef.current = { draggingIndex: null, overIndex: null };
      return;
    }

    if (currentDragState.draggingIndex === currentDragState.overIndex) {
      setDragState({ draggingIndex: null, overIndex: null });
      dragStateRef.current = { draggingIndex: null, overIndex: null };
      return;
    }

    const newBlocks = [...blocks];
    const [draggedBlock] = newBlocks.splice(currentDragState.draggingIndex, 1);
    
    // Adjust target index if dragging from before to after
    let targetIndex = currentDragState.overIndex;
    if (currentDragState.draggingIndex < currentDragState.overIndex) {
      targetIndex = currentDragState.overIndex - 1;
    }
    
    newBlocks.splice(targetIndex, 0, draggedBlock);

    // Recalculate startNumbers for numbered lists after move
    const recalculatedBlocks = newBlocks.map((block, index) => {
      if (block.type !== BLOCK_TYPE_NUMBERED) {
        return block;
      }

      // Check whether this is the first block in a numbered sequence
      const isFirstInSequence = index === 0 || newBlocks[index - 1].type !== BLOCK_TYPE_NUMBERED;
      
      if (isFirstInSequence) {
        if (block.startNumber && block.startNumber > 1) {
          return block;
        } else {
          const { startNumber, ...blockWithoutStartNumber } = block;
          return blockWithoutStartNumber;
        }
      } else {
        // Not first in sequence - clear startNumber for automatic calculation
        // if it does not create a non-sequential jump
        const prevBlock = newBlocks[index - 1];
        if (prevBlock.type === BLOCK_TYPE_NUMBERED) {
          // Determine what the automatically calculated number should be
          let expectedNumber = 1;
          
          // Find the first block in this sequence with startNumber
          for (let i = index - 1; i >= 0; i--) {
            if (newBlocks[i].type !== BLOCK_TYPE_NUMBERED) break;
            if (newBlocks[i].startNumber) {
              expectedNumber = newBlocks[i].startNumber! + (index - i);
              break;
            }
          }
          
          // If block has startNumber different from expected, keep it
          // This preserves intentional numbering jumps
          if (block.startNumber && block.startNumber !== expectedNumber) {
            return block;
          }
        }
        
        // Otherwise clear startNumber for automatic calculation
        const { startNumber, ...blockWithoutStartNumber } = block;
        return blockWithoutStartNumber as Block;
      }
    });

    handleChange(recalculatedBlocks);
    setDragState({ draggingIndex: null, overIndex: null });
    dragStateRef.current = { draggingIndex: null, overIndex: null };
  }, [blocks, handleChange]);

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  };
};

