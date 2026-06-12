import { Block, BlockType } from '@/types/editor.ts';
import { 
  createBlock, 
  setCaretToEnd, 
  setCaretToStart, 
  isCaretAtEnd, 
  isCaretAtStart,
  splitHTMLAtCaret,
  getTextContent,
  convertEmptyListToParagraph
} from '@/utils/editorUtils.ts';
import { 
  KEY_BACKSPACE, 
  KEY_DELETE, 
  KEY_ENTER, 
  KEY_ARROW_UP,
  KEY_ARROW_DOWN 
} from '@/constants/keyboard.ts';
import { 
  BLOCK_TYPE_PARAGRAPH, 
  BLOCK_TYPE_CODE, 
  BLOCK_TYPE_BULLETED, 
  BLOCK_TYPE_NUMBERED, 
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_CALLOUT,
  BLOCK_TYPE_H1,
  BLOCK_TYPE_H2,
  BLOCK_TYPE_H3,
  BLOCK_TYPE_H4,
  BLOCK_TYPE_H5,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
} from '../../constants/blockTypes';

interface NestedBlockKeyboardHandlerProps {
  blocks: Block[];
  parentBlockId: string;
  parentBlockType?: BlockType;
  onBlocksUpdate: (blocks: Block[]) => void;
  onExitToParent?: () => void;
  // For toggle blocks - pass contentProps.onKeyDown to handle parent deletion
  parentKeyDownHandler?: (e: React.KeyboardEvent) => void;
  // Optional ref to parent element for returning focus
  parentElementRef?: React.RefObject<HTMLElement | null>;
  // Callback to dissolve the parent block (e.g. callout) and replace it with a paragraph
  onDissolveParent?: () => void;
}

/**
 * Creates a keyboard handler for nested blocks
 * This is a regular function, not a hook, so it can be called from callbacks
 */
export const createNestedBlockKeyboardHandler = ({
  blocks,
  parentBlockId,
  parentBlockType,
  onBlocksUpdate,
  onExitToParent,
  parentKeyDownHandler,
  parentElementRef,
  onDissolveParent,
}: NestedBlockKeyboardHandlerProps) => {
  
  return (
    e: React.KeyboardEvent,
    blockId: string,
    blockIndex: number
  ) => {
    const currentBlock = blocks[blockIndex];
    const element = e.currentTarget as HTMLElement;
    const text = getTextContent(element);
    const isEmptyText = text.trim().length === 0;
    const isParentElement = element.getAttribute('data-block-id') === parentBlockId;

    if ((e.key === KEY_BACKSPACE || e.key === KEY_DELETE) && isEmptyText && parentBlockType === BLOCK_TYPE_CALLOUT) {
      if (blocks.length === 1 && onDissolveParent) {
        e.preventDefault();
        e.stopPropagation();
        onDissolveParent();
        return;
      }
    }

    if ((e.key === KEY_BACKSPACE || e.key === KEY_DELETE) && isEmptyText) {
      if (isParentElement && parentKeyDownHandler) {
        parentKeyDownHandler(e);
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // For empty lists, convert to paragraph
      if (convertEmptyListToParagraph(currentBlock, blockIndex, blocks, onBlocksUpdate)) {
        return;
      }
      
      const prevBlock = blockIndex > 0 ? blocks[blockIndex - 1] : null;
      const newBlocks = blocks.filter((b) => b.id !== blockId);
      
      if (newBlocks.length === 0) {
        newBlocks.push(createBlock(BLOCK_TYPE_PARAGRAPH, ''));
      }
      
      onBlocksUpdate(newBlocks);
      
      setTimeout(() => {
        if (blockIndex > 0 && newBlocks.length > 0) {
          const prevBlockId = newBlocks[blockIndex - 1]?.id;
          if (prevBlockId) {
            const prevElement = document.querySelector(`[data-block-id="${prevBlockId}"]`) as HTMLElement;
            if (prevElement) {
              if (prevBlock?.type === BLOCK_TYPE_IMAGE) {
                const focusableWrapper = prevElement.querySelector('[tabindex="0"]') as HTMLElement;
                if (focusableWrapper) {
                  focusableWrapper.focus();
                } else {
                  prevElement.focus();
                }
              } else {
                prevElement.focus();
                setCaretToEnd(prevElement);
              }
            }
          }
        } else if (newBlocks.length === 0 && parentElementRef?.current) {
          // Focus parent element if no children remain
          const parentElement = parentElementRef.current.querySelector('[data-block-id]') as HTMLElement;
          if (parentElement) {
            parentElement.focus();
            setCaretToEnd(parentElement);
          }
        } else {
          const firstElement = document.querySelector(`[data-block-id="${newBlocks[0]?.id}"]`) as HTMLElement;
          if (firstElement) {
            firstElement.focus();
            setCaretToStart(firstElement);
          }
        }
      }, 0);
      
      return;
    }
    
    if (e.key === KEY_BACKSPACE && isCaretAtStart(element) && text.length > 0 && blockIndex > 0) {
      e.preventDefault();
      e.stopPropagation();
      
      const prevBlock = blocks[blockIndex - 1];
      const prevText = prevBlock.text || '';
      const currentText = text;
      const mergedText = prevText + currentText;
      
      const newBlocks = [...blocks];
      newBlocks[blockIndex - 1] = { ...prevBlock, text: mergedText };
      newBlocks.splice(blockIndex, 1);
      onBlocksUpdate(newBlocks);
      
      setTimeout(() => {
        const prevBlockId = newBlocks[blockIndex - 1]?.id;
        if (prevBlockId) {
          const prevElement = document.querySelector(`[data-block-id="${prevBlockId}"]`) as HTMLElement;
          if (prevElement) {
            prevElement.focus();
            
            const sel = window.getSelection();
            if (sel) {
              const range = document.createRange();
              
              const findTextNodeAndOffset = (node: Node, targetOffset: number): { node: Node; offset: number } | null => {
                if (node.nodeType === Node.TEXT_NODE) {
                  const length = node.textContent?.length || 0;
                  if (targetOffset <= length) {
                    return { node, offset: targetOffset };
                  }
                  return { node, offset: length };
                }
                
                let currentOffset = 0;
                for (let i = 0; i < node.childNodes.length; i++) {
                  const child = node.childNodes[i];
                  const childLength = child.textContent?.length || 0;
                  
                  if (currentOffset + childLength >= targetOffset) {
                    return findTextNodeAndOffset(child, targetOffset - currentOffset);
                  }
                  currentOffset += childLength;
                }
                
                if (node.childNodes.length > 0) {
                  const lastChild = node.childNodes[node.childNodes.length - 1];
                  if (lastChild.nodeType === Node.TEXT_NODE) {
                    return { node: lastChild, offset: lastChild.textContent?.length || 0 };
                  }
                }
                
                return null;
              };
              
              const result = findTextNodeAndOffset(prevElement, prevText.length);
              if (result) {
                range.setStart(result.node, result.offset);
                range.setEnd(result.node, result.offset);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        }
      }, 0);
      
      return;
    }
    
    if (e.key === KEY_ENTER && !e.shiftKey) {
      if (currentBlock.type === BLOCK_TYPE_CODE) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // For empty lists, convert to paragraph
      if (text.trim().length === 0 && convertEmptyListToParagraph(currentBlock, blockIndex, blocks, onBlocksUpdate)) {
        return;
      }
      
      const [beforeHTML, afterHTML] = splitHTMLAtCaret(element);
      
      element.innerHTML = beforeHTML;
      
      const newBlocks = [...blocks];
      newBlocks[blockIndex] = { ...currentBlock, text: beforeHTML };
      
      // Determine new block type
      let newBlockType: BlockType = BLOCK_TYPE_PARAGRAPH;
      if ([BLOCK_TYPE_BULLETED, BLOCK_TYPE_NUMBERED, BLOCK_TYPE_TODO].includes(currentBlock.type)) {
        newBlockType = currentBlock.type;
      } else if ([
        BLOCK_TYPE_H1, BLOCK_TYPE_H2, BLOCK_TYPE_H3, BLOCK_TYPE_H4, BLOCK_TYPE_H5,
        BLOCK_TYPE_TOGGLE_H1, BLOCK_TYPE_TOGGLE_H2, BLOCK_TYPE_TOGGLE_H3, BLOCK_TYPE_TOGGLE_LIST,
        BLOCK_TYPE_DIVIDER, BLOCK_TYPE_IMAGE, BLOCK_TYPE_BOOKMARK, BLOCK_TYPE_EMBED, BLOCK_TYPE_CALLOUT,
        BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5
      ].includes(currentBlock.type)) {
        newBlockType = BLOCK_TYPE_PARAGRAPH;
      }
      
      const newBlock = createBlock(newBlockType, afterHTML);
      
      // Inherit colors for all blocks
      if (currentBlock.textColor) {
        newBlock.textColor = currentBlock.textColor;
      }
      if (currentBlock.backgroundColor) {
        newBlock.backgroundColor = currentBlock.backgroundColor;
      }
      
      newBlocks.splice(blockIndex + 1, 0, newBlock);
      onBlocksUpdate(newBlocks);
      
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
        if (newBlockElement) {
          newBlockElement.focus();
          setCaretToStart(newBlockElement);
        }
      }, 0);
      
      return;
    }
    
    // Arrow Up: move to previous block within the nested container
    if (e.key === KEY_ARROW_UP && isCaretAtStart(element) && blockIndex > 0) {
      e.preventDefault();
      e.stopPropagation();
      const prevBlockId = blocks[blockIndex - 1].id;
      const prevElement = document.querySelector(`[data-block-id="${prevBlockId}"]`) as HTMLElement;
      if (prevElement) {
        prevElement.focus();
        setCaretToEnd(prevElement);
      }
      return;
    }

    // Arrow Down: move to next block within the nested container
    if (e.key === KEY_ARROW_DOWN && isCaretAtEnd(element) && blockIndex < blocks.length - 1) {
      e.preventDefault();
      e.stopPropagation();
      const nextBlockId = blocks[blockIndex + 1].id;
      const nextElement = document.querySelector(`[data-block-id="${nextBlockId}"]`) as HTMLElement;
      if (nextElement) {
        nextElement.focus();
        setCaretToStart(nextElement);
      }
      return;
    }

    const isLastBlock = blockIndex === blocks.length - 1;
    const isEmpty = text.trim().length === 0;
    const isAtEnd = isCaretAtEnd(element);
    
    if (e.key === KEY_ARROW_DOWN && isLastBlock && (isEmpty || isAtEnd) && onExitToParent) {
      e.preventDefault();
      e.stopPropagation();
      onExitToParent();
      return;
    }
  };
};

/**
 * Hook wrapper for createNestedBlockKeyboardHandler
 * Used when it needs to be called at the component top level
 */
export const useNestedBlockKeyboard = (props: NestedBlockKeyboardHandlerProps) => {
  const handleKeyDown = createNestedBlockKeyboardHandler(props);
  return { handleKeyDown };
};

