import { useCallback } from 'react';
import { Block, BlockType } from '../../types/editor';
import {
  setCaretToStart,
  getCaretCoordinates,
  isBulletListTrigger,
  getNumberedListTrigger,
} from '../../utils/editorUtils';
import {
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
} from '../../constants/blockTypes';
import { useNestedBlockKeyboard } from './useNestedBlockKeyboard';

interface UseNestedBlockHandlersProps {
  parentBlockId: string;
  parentBlockType?: BlockType;
  children: Block[] | undefined;
  onChildUpdate: (blockId: string, children: Block[]) => void;
  onSlashMenu?: (blockId: string, filter: string, position: { x: number; y: number }) => void;
  parentElementRef?: React.RefObject<HTMLElement | null>;
  onExitToParent?: () => void;
  onDissolveParent?: () => void;
}

export const useNestedBlockHandlers = ({
  parentBlockId,
  parentBlockType,
  children,
  onChildUpdate,
  onSlashMenu,
  parentElementRef,
  onExitToParent,
  onDissolveParent,
}: UseNestedBlockHandlersProps) => {
  const { handleKeyDown } = useNestedBlockKeyboard({
    blocks: children || [],
    parentBlockType,
    parentBlockId,
    onBlocksUpdate: (newBlocks) => onChildUpdate(parentBlockId, newBlocks),
    parentElementRef,
    onExitToParent,
    onDissolveParent,
  });

  const handleChildBlockUpdate = useCallback((childId: string, text: string) => {
    if (!children) return;
    
    const currentChild = children.find(child => child.id === childId);
    if (!currentChild) return;
    
    if (isBulletListTrigger(text)) {
      const element = document.querySelector(`[data-block-id="${childId}"]`) as HTMLElement;
      if (element) {
        element.innerHTML = '';
        element.textContent = '';
      }
      
      const updatedChildren = children.map(child =>
        child.id === childId ? { ...child, type: BLOCK_TYPE_BULLETED as BlockType, text: '' } : child
      );
      onChildUpdate(parentBlockId, updatedChildren);
      
      setTimeout(() => {
        const element = document.querySelector(`[data-block-id="${childId}"]`) as HTMLElement;
        if (element) {
          element.focus();
          setCaretToStart(element);
        }
      }, 0);
      return;
    }
    
    const startNumber = getNumberedListTrigger(text);
    if (startNumber !== null) {
      const element = document.querySelector(`[data-block-id="${childId}"]`) as HTMLElement;
      if (element) {
        element.innerHTML = '';
        element.textContent = '';
      }
      
      const updatedChildren = children.map(child =>
        child.id === childId ? { 
          ...child, 
          type: BLOCK_TYPE_NUMBERED as BlockType, 
          text: '', 
          ...(startNumber > 1 ? { startNumber } : {})
        } : child
      );
      onChildUpdate(parentBlockId, updatedChildren);
      
      setTimeout(() => {
        const element = document.querySelector(`[data-block-id="${childId}"]`) as HTMLElement;
        if (element) {
          element.focus();
          setCaretToStart(element);
        }
      }, 0);
      return;
    }
    
    // Check slash command
    if (text.includes('/') && onSlashMenu) {
      const slashIndex = text.lastIndexOf('/');
      const textBeforeSlash = text.slice(0, slashIndex).trim();
      
      if (textBeforeSlash.length === 0) {
        const filter = text.slice(slashIndex + 1);
        const coords = getCaretCoordinates();
        
        if (coords) {
          onSlashMenu(childId, filter, { x: coords.left, y: coords.bottom });
        }
      }
    }
    
    // Regular update
    const updatedChildren = children.map(child =>
      child.id === childId ? { ...child, text } : child
    );
    
    onChildUpdate(parentBlockId, updatedChildren);
  }, [children, parentBlockId, onChildUpdate, onSlashMenu]);

  return {
    handleChildBlockUpdate,
    handleChildKeyDown: handleKeyDown,
  };
};

