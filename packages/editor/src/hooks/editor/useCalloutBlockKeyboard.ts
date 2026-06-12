import { useCallback } from 'react';
import { Block } from '../../types/editor';
import { KEY_ENTER, KEY_BACKSPACE, KEY_ARROW_DOWN } from '../../constants/keyboard';
import { BLOCK_TYPE_PARAGRAPH } from '../../constants/blockTypes';
import { createBlock, setCaretToStart, isCaretAtEnd } from '../../utils/editorUtils';

interface UseCalloutBlockKeyboardProps {
  block: Block;
  childrenContainerRef: React.RefObject<HTMLDivElement | null>;
  onChildUpdate: ((blockId: string, children: Block[]) => void) | undefined;
  contentPropsOnKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * Hook for handling keyboard input in callout blocks
 * Manages creation of nested blocks on Enter or Arrow Down
 */
export const useCalloutBlockKeyboard = ({
  block,
  childrenContainerRef,
  onChildUpdate,
  contentPropsOnKeyDown,
}: UseCalloutBlockKeyboardProps) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle backspace when callout is empty - delete block and move to previous
    if (e.key === KEY_BACKSPACE) {
      const element = e.currentTarget as HTMLElement;
      const text = element.textContent || '';
      
      if (text.trim() === '') {
        // Block is empty, let parent handle deletion
        if (contentPropsOnKeyDown) {
          contentPropsOnKeyDown(e);
        }
        return;
      }
    }

    // Handle Enter - create nested block
    if (e.key === KEY_ENTER && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      if (!block.children || block.children.length === 0) {
        // Create first nested block
        const newChild = createBlock(BLOCK_TYPE_PARAGRAPH, '');
        if (onChildUpdate) {
          onChildUpdate(block.id, [newChild]);
          
          setTimeout(() => {
            const firstChildElement = childrenContainerRef.current?.querySelector('[data-block-id]') as HTMLElement;
            if (firstChildElement) {
              firstChildElement.focus();
              setCaretToStart(firstChildElement);
            }
          }, 0);
        }
      } else {
        // Move to first nested block
        setTimeout(() => {
          const firstChildElement = childrenContainerRef.current?.querySelector('[data-block-id]') as HTMLElement;
          if (firstChildElement) {
            firstChildElement.focus();
            setCaretToStart(firstChildElement);
          }
        }, 0);
      }
    }

    // Handle Arrow Down - move to nested blocks
    if (e.key === KEY_ARROW_DOWN) {
      const element = e.currentTarget as HTMLElement;
      const isEmpty = !block.text || block.text.trim() === '';
      const atEnd = isCaretAtEnd(element);
      
      if (isEmpty || atEnd) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!block.children || block.children.length === 0) {
          // Create first nested block
          const newChild = createBlock(BLOCK_TYPE_PARAGRAPH, '');
          if (onChildUpdate) {
            onChildUpdate(block.id, [newChild]);
            
            setTimeout(() => {
              const firstChildElement = childrenContainerRef.current?.querySelector('[data-block-id]') as HTMLElement;
              if (firstChildElement) {
                firstChildElement.focus();
                setCaretToStart(firstChildElement);
              }
            }, 0);
          }
        } else {
          // Move to first nested block
          setTimeout(() => {
            const firstChildElement = childrenContainerRef.current?.querySelector('[data-block-id]') as HTMLElement;
            if (firstChildElement) {
              firstChildElement.focus();
              setCaretToStart(firstChildElement);
            }
          }, 0);
        }
      }
    }
  }, [block, childrenContainerRef, onChildUpdate, contentPropsOnKeyDown]);

  return { handleKeyDown };
};

