import { useCallback } from 'react';
import { Block } from '../../types/editor';
import { createBlock, setCaretToStart, isCaretAtEnd, getTextContent } from '../../utils/editorUtils';
import { 
  BLOCK_TYPE_PARAGRAPH,
  isNonTextBlockType,
} from '../../constants/blockTypes';
import { KEY_BACKSPACE, KEY_ENTER, KEY_ARROW_DOWN } from '../../constants/keyboard';

interface UseToggleBlockKeyboardProps {
  block: Block;
  isOpen: boolean;
  childrenContainerRef: React.RefObject<HTMLDivElement | null>;
  onToggle?: (id: string, isOpen: boolean) => void;
  onChildUpdate?: (blockId: string, children: Block[]) => void;
  contentPropsOnKeyDown?: (e: React.KeyboardEvent) => void;
}

export const useToggleBlockKeyboard = ({
  block,
  isOpen,
  childrenContainerRef,
  onToggle,
  onChildUpdate,
  contentPropsOnKeyDown,
}: UseToggleBlockKeyboardProps) => {
  const focusFirstChildOrCreateParagraph = useCallback(() => {
    if (!block.children || block.children.length === 0) {
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
      const firstChild = block.children[0];
      if (isNonTextBlockType(firstChild.type)) {
        const newParagraph = createBlock(BLOCK_TYPE_PARAGRAPH, '');
        const updatedChildren = [newParagraph, ...block.children];
        
        if (onChildUpdate) {
          onChildUpdate(block.id, updatedChildren);
          
          setTimeout(() => {
            // Focus on the new paragraph block
            const firstChildElement = childrenContainerRef.current?.querySelector('[data-block-id]') as HTMLElement;
            if (firstChildElement) {
              firstChildElement.focus();
              setCaretToStart(firstChildElement);
            }
          }, 0);
        }
      } else {
        setTimeout(() => {
          const firstChildElement = childrenContainerRef.current?.querySelector('[data-block-id]') as HTMLElement;
          if (firstChildElement) {
            firstChildElement.focus();
            setCaretToStart(firstChildElement);
          }
        }, 0);
      }
    }
  }, [block, childrenContainerRef, onChildUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle backspace when toggle is empty - delete block and move to previous
    if (e.key === KEY_BACKSPACE) {
      const element = e.currentTarget as HTMLElement;
      const text = getTextContent(element);
      
      if (text.trim() === '') {
        // Block is empty, let parent handle deletion
        if (contentPropsOnKeyDown) {
          contentPropsOnKeyDown(e);
        }
        return;
      }
    }

    if (e.key === KEY_ENTER && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      
      if (!isOpen && onToggle) {
        onToggle(block.id, true);
      }
      
      focusFirstChildOrCreateParagraph();
    }

    if (e.key === KEY_ARROW_DOWN) {
      const element = e.currentTarget as HTMLElement;
      const isEmpty = !block.text || block.text.trim() === '';
      const atEnd = isCaretAtEnd(element);
      
      if (isEmpty || atEnd) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!isOpen && onToggle) {
          onToggle(block.id, true);
        }
        
        focusFirstChildOrCreateParagraph();
      }
    }
  }, [block, isOpen, childrenContainerRef, onToggle, contentPropsOnKeyDown, focusFirstChildOrCreateParagraph]);

  return { handleKeyDown };
};

