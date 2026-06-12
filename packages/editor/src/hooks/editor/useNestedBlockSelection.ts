import { useState, useCallback, useEffect, useRef } from 'react';
import { Block } from '../../types/editor';
import { copyBlocksToClipboard, parseBlocksFromClipboard, createBlock, setCaretToEnd, getTargetIndexAfterDeletion } from '../../utils/editorUtils';
import { BLOCK_TYPE_PARAGRAPH } from '../../constants/blockTypes';
import { KEY_A, KEY_C, KEY_X, KEY_DELETE, KEY_BACKSPACE } from '../../constants/keyboard';

interface UseNestedBlockSelectionProps {
  // Unique container ID to isolate selection state
  containerId: string;
  // Child blocks in the container
  children: Block[];
  // Callback to update child blocks
  onChildrenUpdate: (blocks: Block[]) => void;
  // Container ref for boundary detection
  containerRef: React.RefObject<HTMLElement | null>;
}

export const useNestedBlockSelection = ({
  children,
  onChildrenUpdate,
  containerRef,
}: UseNestedBlockSelectionProps) => {
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStartBlockId, setSelectionStartBlockId] = useState<string | null>(null);
  const [justFinishedSelecting, setJustFinishedSelecting] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectionStartPos, setSelectionStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false); // Flag to track mouse button state
  
  // Use ref to track the active container
  const isActiveRef = useRef(false);
  const startedOnEditableRef = useRef(false);

  // Get block index by ID
  const getBlockIndex = useCallback((blockId: string): number => {
    return children.findIndex(b => b.id === blockId);
  }, [children]);

  const getBlockIndexAtPoint = useCallback((clientY: number): number => {
    if (!containerRef.current) return -1;
    let closestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < children.length; i++) {
      const el = containerRef.current.querySelector(`[data-block-id="${children[i].id}"]`);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(clientY - center);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }, [containerRef, children]);

  // mousedown handler for nested block
  const handleNestedMouseDown = useCallback((e: React.MouseEvent, blockId: string) => {
    const target = e.target as HTMLElement;
      
    // Always stop propagation to the parent editor
    e.stopPropagation();
    
    if (e.button !== 0) return;
    
    if (justFinishedSelecting) {
      setJustFinishedSelecting(false);
      e.preventDefault();
      return;
    }
    
    if (isSelecting) {
      return;
    }
    
    // Shift+Click: extend selection
    if (e.shiftKey && selectedBlockIds.size > 0) {
      e.preventDefault();
      
      const clickedIndex = getBlockIndex(blockId);
      const selectedIndices = Array.from(selectedBlockIds)
        .map(id => getBlockIndex(id))
        .filter(i => i !== -1);
      
      if (selectedIndices.length === 0) {
        setSelectedBlockIds(new Set([blockId]));
        return;
      }
      
      const minSelected = Math.min(...selectedIndices);
      const maxSelected = Math.max(...selectedIndices);
      
      const start = Math.min(minSelected, clickedIndex);
      const end = Math.max(maxSelected, clickedIndex);
      
      const newSelected = new Set<string>();
      for (let i = start; i <= end; i++) {
        if (children[i]) {
          newSelected.add(children[i].id);
        }
      }
      setSelectedBlockIds(newSelected);
      isActiveRef.current = true; // Activate to allow deletion
      return;
    }

    // Cmd/Ctrl+Click: toggle block selection
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      const newSelected = new Set(selectedBlockIds);
      if (newSelected.has(blockId)) {
        newSelected.delete(blockId);
      } else {
        newSelected.add(blockId);
      }
      setSelectedBlockIds(newSelected);
      isActiveRef.current = newSelected.size > 0; // Activate if there is a selection
      return;
    }

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
    
    setSelectionStartBlockId(blockId);
    setIsMouseDown(true);
    setSelectionStartPos({ x: e.clientX, y: e.clientY });
    
    if (isDirectlyOnEditableContent || hasActiveCaret) {
      startedOnEditableRef.current = true;
      return;
    }
    
    startedOnEditableRef.current = false;
    e.preventDefault();
  }, [children, selectedBlockIds, isSelecting, justFinishedSelecting, getBlockIndex]);

  // mouseenter handler for nested block
  const handleNestedMouseEnter = useCallback((e: React.MouseEvent, _blockId: string) => {
    // Stop event propagation to parent
    e.stopPropagation();
    
    // Update selection only if already selecting
    if (!isSelecting || !isActiveRef.current || selectionStartPos === null) {
      return;
    }
    
    // Update cursor position for the selection rectangle
    setCursorPosition({ x: e.clientX, y: e.clientY });
    
    const selectionRect = {
      left: Math.min(selectionStartPos.x, e.clientX),
      right: Math.max(selectionStartPos.x, e.clientX),
      top: Math.min(selectionStartPos.y, e.clientY),
      bottom: Math.max(selectionStartPos.y, e.clientY),
    };
    
    if (!containerRef.current) return;
    const blockElements = containerRef.current.querySelectorAll('[data-block-id]');
    const newSelected = new Set<string>();
    
    blockElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const elementBlockId = element.getAttribute('data-block-id');
      
      if (!elementBlockId) return;
      
      const intersects = !(
        rect.right < selectionRect.left ||
        rect.left > selectionRect.right ||
        rect.bottom < selectionRect.top ||
        rect.top > selectionRect.bottom
      );
      
      if (intersects) {
        newSelected.add(elementBlockId);
      }
    });
    
    setSelectedBlockIds(newSelected);
  }, [isSelecting, selectionStartPos, containerRef]);

  // mouseup handler
  const handleMouseUp = useCallback(() => {
    if (!isActiveRef.current && !isMouseDown) return;
    
    const wasSelecting = isSelecting;
    const hadSelection = selectedBlockIds.size > 0;
    
    // Keep isActiveRef.current = true if there are selected blocks
    // to allow keyboard delete/copy
    if (selectedBlockIds.size === 0) {
      isActiveRef.current = false;
    }
    
    setIsSelecting(false);
    setSelectionStartBlockId(null);
    setCursorPosition(null);
    setSelectionStartPos(null);
    setIsMouseDown(false);
    startedOnEditableRef.current = false;
    
    if (wasSelecting && hadSelection && cursorPosition && selectionStartPos) {
      const distanceMoved = Math.sqrt(
        Math.pow(cursorPosition.x - selectionStartPos.x, 2) + 
        Math.pow(cursorPosition.y - selectionStartPos.y, 2)
      );
      
      if (distanceMoved > 5) {
        setJustFinishedSelecting(true);
        setTimeout(() => {
          setJustFinishedSelecting(false);
        }, 100);
      }
    }
  }, [isMouseDown, isSelecting, selectedBlockIds, cursorPosition, selectionStartPos]);

  // Container mousedown handler (for empty-area selection)
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    if (e.button !== 0) return;
    
    if (justFinishedSelecting) {
      return;
    }
    
    if (isSelecting) {
      return;
    }
    
    // Check whether click was on the container itself, not a child element
    if (target !== containerRef.current && !target.classList.contains('space-y-1')) {
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
    
    // Clear selection on empty-area click
    if (selectedBlockIds.size > 0) {
      setSelectedBlockIds(new Set());
      isActiveRef.current = false;
      setIsSelecting(false);
      setSelectionStartBlockId(null);
      e.stopPropagation();
    }
  }, [justFinishedSelecting, isSelecting, selectedBlockIds, containerRef]);

  // Keyboard handler for delete and copy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      
      if (selectedBlockIds.size === 0 || !isActiveRef.current) {
        return;
      }

      const activeElement = document.activeElement as HTMLElement;
      
      // Check whether the active element is inside our container
      const isWithinContainer = containerRef.current && activeElement && containerRef.current.contains(activeElement);
      
      // If focus is on an editable element OUTSIDE our container, ignore
      if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        if (!isWithinContainer) {
          return;
        }
        // If inside container with selection, blur element and continue
        activeElement.blur();
      }

      // Select all blocks: Cmd/Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === KEY_A) {
        const selection = window.getSelection();
        
        // If inside container, select all blocks
        if (isWithinContainer) {
          e.preventDefault();
          e.stopPropagation();
          
          // Blur active element for selection visual effect
          if (activeElement) {
            activeElement.blur();
          }
          
          // Select all child blocks
          const allBlockIds = new Set(children.map(b => b.id));
          setSelectedBlockIds(allBlockIds);
          isActiveRef.current = true;
          
          // Clear text selection
          if (selection) {
            selection.removeAllRanges();
          }
          return;
        }
      }

      // Copy: Cmd/Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === KEY_C) {
        e.preventDefault();
        e.stopPropagation();
        const selectedBlocks = children.filter(b => selectedBlockIds.has(b.id));
        copyBlocksToClipboard(selectedBlocks);
        return;
      }

      // Cut: Cmd/Ctrl+X
      if ((e.ctrlKey || e.metaKey) && e.key === KEY_X) {
        e.preventDefault();
        e.stopPropagation();
        const selectedBlocks = children.filter(b => selectedBlockIds.has(b.id));
        copyBlocksToClipboard(selectedBlocks);

        const newBlocks = children.filter(b => !selectedBlockIds.has(b.id));
        if (newBlocks.length === 0) {
          onChildrenUpdate([createBlock(BLOCK_TYPE_PARAGRAPH, '')]);
        } else {
          onChildrenUpdate(newBlocks);
        }

        setSelectedBlockIds(new Set());

        setTimeout(() => {
          const targetIndex = getTargetIndexAfterDeletion(children, selectedBlockIds, newBlocks);
          if (targetIndex >= 0 && newBlocks[targetIndex]) {
            const targetElement = containerRef.current?.querySelector(`[data-block-id="${newBlocks[targetIndex].id}"]`) as HTMLElement;
            if (targetElement) {
              targetElement.focus();
              setCaretToEnd(targetElement);
            }
          }
        }, 0);
        return;
      }

      // Delete: Delete or Backspace
      if (e.key === KEY_DELETE || e.key === KEY_BACKSPACE) {
        e.preventDefault();
        e.stopPropagation();
        
        const newBlocks = children.filter(b => !selectedBlockIds.has(b.id));
        
        // If all blocks were deleted, create an empty paragraph
        if (newBlocks.length === 0) {
          onChildrenUpdate([createBlock(BLOCK_TYPE_PARAGRAPH, '')]);
        } else {
          onChildrenUpdate(newBlocks);
        }
        
        setSelectedBlockIds(new Set());
        
        setTimeout(() => {
          const targetIndex = getTargetIndexAfterDeletion(children, selectedBlockIds, newBlocks);
          
          if (targetIndex >= 0 && newBlocks[targetIndex]) {
            const targetElement = containerRef.current?.querySelector(`[data-block-id="${newBlocks[targetIndex].id}"]`) as HTMLElement;
            if (targetElement) {
              targetElement.focus();
              setCaretToEnd(targetElement);
            }
          }
        }, 0);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedBlockIds, children, onChildrenUpdate, containerRef]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (selectedBlockIds.size === 0 || !isActiveRef.current) return;

      const clipboardText = e.clipboardData?.getData('text/plain');
      if (!clipboardText) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      let pastedBlocks = parseBlocksFromClipboard(clipboardText);
      if (!pastedBlocks || pastedBlocks.length === 0) {
        pastedBlocks = [createBlock(BLOCK_TYPE_PARAGRAPH, clipboardText.trim())];
      }

      const firstSelectedIndex = children.findIndex(b => selectedBlockIds.has(b.id));
      const insertAt = firstSelectedIndex >= 0 ? firstSelectedIndex : children.length;

      const remaining = children.filter(b => !selectedBlockIds.has(b.id));
      const adjustedIndex = Math.min(insertAt, remaining.length);
      remaining.splice(adjustedIndex, 0, ...pastedBlocks);

      onChildrenUpdate(remaining);
      setSelectedBlockIds(new Set());
      isActiveRef.current = false;

      setTimeout(() => {
        const lastPastedBlock = pastedBlocks![pastedBlocks!.length - 1];
        const lastElement = containerRef.current?.querySelector(`[data-block-id="${lastPastedBlock.id}"]`) as HTMLElement;
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
  }, [selectedBlockIds, children, onChildrenUpdate, containerRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isMouseDown && !isSelecting && selectionStartBlockId !== null && selectionStartPos) {
      const distanceMoved = Math.sqrt(
        Math.pow(e.clientX - selectionStartPos.x, 2) + 
        Math.pow(e.clientY - selectionStartPos.y, 2)
      );
      
      if (distanceMoved > 5) {
        if (startedOnEditableRef.current) {
          const currentBlockIndex = getBlockIndexAtPoint(e.clientY);
          const startBlockIndex = getBlockIndex(selectionStartBlockId);

          if (currentBlockIndex !== -1 && startBlockIndex !== -1 && currentBlockIndex !== startBlockIndex) {
            const selection = window.getSelection();
            if (selection) selection.removeAllRanges();

            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && activeElement.blur) activeElement.blur();

            startedOnEditableRef.current = false;
            setIsSelecting(true);
            isActiveRef.current = true;
            setCursorPosition({ x: e.clientX, y: e.clientY });

            const startIdx = Math.min(startBlockIndex, currentBlockIndex);
            const endIdx = Math.max(startBlockIndex, currentBlockIndex);
            const newSelected = new Set<string>();
            for (let i = startIdx; i <= endIdx; i++) {
              if (children[i]) newSelected.add(children[i].id);
            }
            setSelectedBlockIds(newSelected);
          }
          return;
        }

        const selection = window.getSelection();
        const hasTextSelection = selection && !selection.isCollapsed && selection.toString().length > 0;
        
        if (hasTextSelection) {
          setIsMouseDown(false);
          setSelectionStartBlockId(null);
          setSelectionStartPos(null);
          return;
        }
        
        setIsSelecting(true);
        isActiveRef.current = true;
        setCursorPosition({ x: e.clientX, y: e.clientY });
        
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        if (selection) {
          selection.removeAllRanges();
        }
        
        const startIndex = getBlockIndex(selectionStartBlockId);
        if (startIndex !== -1 && children[startIndex]) {
          setSelectedBlockIds(new Set([children[startIndex].id]));
        }
      }
      return;
    }
    
    // If already selecting, update selection
    if (!isSelecting || !isActiveRef.current || selectionStartPos === null) return;
    
    setCursorPosition({ x: e.clientX, y: e.clientY });
    
    // Calculate selection rectangle bounds
    const selectionRect = {
      left: Math.min(selectionStartPos.x, e.clientX),
      right: Math.max(selectionStartPos.x, e.clientX),
      top: Math.min(selectionStartPos.y, e.clientY),
      bottom: Math.max(selectionStartPos.y, e.clientY),
    };
    
    // Check all blocks for intersection with selection rectangle
    if (!containerRef.current) return;
    const blockElements = containerRef.current.querySelectorAll('[data-block-id]');
    const newSelected = new Set<string>();
    
    blockElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      const elementBlockId = element.getAttribute('data-block-id');
      
      if (!elementBlockId) return;
      
      // Check if block rectangle intersects with selection rectangle
      const intersects = !(
        rect.right < selectionRect.left ||
        rect.left > selectionRect.right ||
        rect.bottom < selectionRect.top ||
        rect.top > selectionRect.bottom
      );
      
      if (intersects) {
        newSelected.add(elementBlockId);
      }
    });
    
    setSelectedBlockIds(newSelected);
  }, [isMouseDown, isSelecting, selectionStartBlockId, selectionStartPos, children, getBlockIndex, getBlockIndexAtPoint, containerRef]);

  // Global mouseup and mousemove handlers
  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseUp, handleMouseMove]);

  // Clear selection on click outside container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (justFinishedSelecting) {
        return;
      }
      
      // Check whether there is a selection
      if (selectedBlockIds.size === 0) return;
      
      // If click is outside container, clear selection
      if (containerRef.current && !containerRef.current.contains(target)) {
        setSelectedBlockIds(new Set());
        isActiveRef.current = false;
        setIsSelecting(false);
        setSelectionStartBlockId(null);
        setCursorPosition(null);
        setSelectionStartPos(null);
      }
    };

    // Use mousedown instead of click for faster response
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [justFinishedSelecting, containerRef, selectedBlockIds.size]);

  // Activate on selection
  useEffect(() => {
    if (selectedBlockIds.size > 0) {
      isActiveRef.current = true;
    }
  }, [selectedBlockIds]);

  // Function to check whether multiple blocks are selected
  const hasMultipleSelected = selectedBlockIds.size > 1;

  return {
    selectedBlockIds,
    setSelectedBlockIds,
    isSelecting,
    cursorPosition,
    selectionStartPos,
    handleNestedMouseDown,
    handleNestedMouseEnter,
    handleContainerMouseDown,
    hasMultipleSelected,
  };
};

