import { useCallback } from 'react';
import { Block } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';
import {
  createBlock,
  setCaretToEnd,
  setCaretToStart,
  getTextContent,
  isCaretAtStart,
  isCaretAtEnd,
  splitHTMLAtCaret,
  copyBlocksToClipboard,
  convertEmptyListToParagraph,
} from '../../utils/editorUtils';
import {
  KEY_ESCAPE,
  KEY_ENTER,
  KEY_ARROW_UP,
  KEY_ARROW_DOWN,
  KEY_DELETE,
  KEY_BACKSPACE,
  KEY_Z,
  KEY_C,
  KEY_A,
} from '../../constants/keyboard';
import type { MenuState, ActionMenuState } from './useMenuState';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_DIVIDER,
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
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_EXERCISE,
} from '../../constants/blockTypes';

interface UseKeyboardHandlersProps {
  handleChange: (blocks: Block[]) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  menuState: MenuState;
  setMenuState: React.Dispatch<React.SetStateAction<MenuState>>;
  actionMenu: ActionMenuState;
  setActionMenu: React.Dispatch<React.SetStateAction<ActionMenuState>>;
  selectedBlockIds: Set<string>;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onExerciseDelete?: (exerciseDbId: number) => void;
}

export const useKeyboardHandlers = ({
  handleChange,
  handleUndo,
  handleRedo,
  menuState,
  setMenuState,
  actionMenu,
  setActionMenu,
  selectedBlockIds,
  setSelectedBlockIds,
  onExerciseDelete,
}: UseKeyboardHandlersProps) => {
  const { blocks, editorRef } = useEditorContext();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, _blockId: string, index: number) => {
      const block = blocks[index];
      const element = e.currentTarget as HTMLElement;
      const text = getTextContent(element);

      const selection = window.getSelection();
      const hasSelection = selection && !selection.isCollapsed;

      if (e.key === KEY_ESCAPE) {
        if (menuState.visible) {
          e.preventDefault();
          setMenuState({ visible: false, position: null, blockId: null, filter: '', triggerType: null, isInsideToggle: false, isNested: false });
          return;
        }
        if (actionMenu.visible) {
          e.preventDefault();
          setActionMenu({ visible: false, position: null, blockId: null, isInsideToggle: false, isNested: false });
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === KEY_Z) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === KEY_Z && !e.shiftKey) {
        e.preventDefault();
        if (selectedBlockIds.size > 0) {
          setSelectedBlockIds(new Set());
        }
        handleUndo();
        return;
      }

      
      if ((e.ctrlKey || e.metaKey) && e.key === KEY_C) {
        if (selectedBlockIds.size > 0) {
          e.preventDefault();
          const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
          copyBlocksToClipboard(selectedBlocks);
          return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === KEY_A) {
        if (block.type === BLOCK_TYPE_CODE) {
          return;
        }
        
        const hasTextSelection = selection && !selection.isCollapsed;
        const fullBlockSelection = hasTextSelection && 
          selection.toString().trim() === element.textContent?.trim();
        
        if (!hasTextSelection || fullBlockSelection) {
          e.preventDefault();
          const allBlockIds = new Set(blocks.map(b => b.id));
          setSelectedBlockIds(allBlockIds);
          
          selection?.removeAllRanges();
          return;
        }
      }

      if ((e.key === KEY_DELETE || e.key === KEY_BACKSPACE) && selectedBlockIds.size > 0) {
        e.preventDefault();

        if (onExerciseDelete) {
          for (const block of blocks) {
            if (selectedBlockIds.has(block.id) && block.type === BLOCK_TYPE_EXERCISE && block.exerciseDbId) {
              onExerciseDelete(block.exerciseDbId);
            }
          }
        }
        
        const firstSelectedIndex = blocks.findIndex(b => selectedBlockIds.has(b.id));
        const scrollY = window.scrollY;
        const newBlocks = blocks.filter(b => !selectedBlockIds.has(b.id));
        
        let focusBlocks: Block[];
        if (newBlocks.length === 0) {
          focusBlocks = [createBlock(BLOCK_TYPE_PARAGRAPH, '')];
          handleChange(focusBlocks);
        } else {
          focusBlocks = newBlocks;
          handleChange(newBlocks);
        }
        
        const focusTargetId = focusBlocks[Math.min(firstSelectedIndex, focusBlocks.length - 1)]?.id;
        setSelectedBlockIds(new Set());
        
        setTimeout(() => {
          if (focusTargetId) {
            const targetEl = editorRef.current?.querySelector(`[data-block-id="${focusTargetId}"]`) as HTMLElement;
            if (targetEl) {
              targetEl.focus({ preventScroll: true });
              setCaretToEnd(targetEl);
            }
          }
          window.scrollTo(0, scrollY);
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }, 0);
        return;
      }

      if (menuState.visible) {
        if ([KEY_ARROW_UP, KEY_ARROW_DOWN, KEY_ENTER, KEY_ESCAPE].includes(e.key)) {
          return;
        }
      }

      if (hasSelection && (e.key === KEY_BACKSPACE || e.key === KEY_DELETE)) {
        return;
      }

      if ((e.key === KEY_BACKSPACE || e.key === KEY_DELETE) && block.type === BLOCK_TYPE_DIVIDER) {
        e.preventDefault();
        
        const scrollY = window.scrollY;
        const newBlocks = [...blocks];
        newBlocks.splice(index, 1);
        const focusTargetId = newBlocks[Math.min(index, newBlocks.length - 1)]?.id;
        handleChange(newBlocks);

        setTimeout(() => {
          if (focusTargetId) {
            const targetEl = editorRef.current?.querySelector(`[data-block-id="${focusTargetId}"]`) as HTMLElement;
            if (targetEl) {
              targetEl.focus({ preventScroll: true });
              setCaretToEnd(targetEl);
            }
          }
          window.scrollTo(0, scrollY);
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }, 0);
        return;
      }

      if ((e.key === KEY_BACKSPACE || e.key === KEY_DELETE) && text.trim().length === 0) {
        e.preventDefault();
        
        if (convertEmptyListToParagraph(block, index, blocks, handleChange)) {
          return;
        }
        
        const scrollY = window.scrollY;
        const newBlocks = [...blocks];
        newBlocks.splice(index, 1);
        const focusTargetId = newBlocks[Math.min(index, newBlocks.length - 1)]?.id;
        handleChange(newBlocks);

        setTimeout(() => {
          if (focusTargetId) {
            const targetEl = editorRef.current?.querySelector(`[data-block-id="${focusTargetId}"]`) as HTMLElement;
            if (targetEl) {
              targetEl.focus({ preventScroll: true });
              setCaretToEnd(targetEl);
            }
          }
          window.scrollTo(0, scrollY);
          requestAnimationFrame(() => window.scrollTo(0, scrollY));
        }, 0);
        return;
      }

      if (e.key === KEY_ENTER) {
        if (block.type === BLOCK_TYPE_CODE) {
          return;
        }

        if (!e.shiftKey) {
          e.preventDefault();

          // For empty lists, convert to paragraph
          if (text.trim().length === 0 && convertEmptyListToParagraph(block, index, blocks, handleChange)) {
            return;
          }

          const [beforeHTML, afterHTML] = splitHTMLAtCaret(element);

          element.innerHTML = beforeHTML;

          const newBlocks = [...blocks];
          newBlocks[index] = { ...block, text: beforeHTML };

          let newBlockType: typeof block.type = BLOCK_TYPE_PARAGRAPH;
          if ([BLOCK_TYPE_BULLETED, BLOCK_TYPE_NUMBERED, BLOCK_TYPE_TODO].includes(block.type)) {
            newBlockType = block.type;
          } else if ([
            BLOCK_TYPE_H1, 
            BLOCK_TYPE_H2, 
            BLOCK_TYPE_H3, 
            BLOCK_TYPE_H4, 
            BLOCK_TYPE_H5, 
            BLOCK_TYPE_TOGGLE_H1, 
            BLOCK_TYPE_TOGGLE_H2, 
            BLOCK_TYPE_TOGGLE_H3, 
            BLOCK_TYPE_DIVIDER, 
            BLOCK_TYPE_IMAGE,
            BLOCK_TYPE_BOOKMARK, 
            BLOCK_TYPE_EMBED, 
            BLOCK_TYPE_CALLOUT,
            BLOCK_TYPE_COLUMNS2,
            BLOCK_TYPE_COLUMNS3,
            BLOCK_TYPE_COLUMNS4,
            BLOCK_TYPE_COLUMNS5,
          ].includes(block.type)) {
            newBlockType = BLOCK_TYPE_PARAGRAPH;
          } else {
            newBlockType = BLOCK_TYPE_PARAGRAPH;
          }

          const newBlock = createBlock(newBlockType, afterHTML);
          
          // Inherit colors for all blocks
          if (block.textColor) {
            newBlock.textColor = block.textColor;
          }
          if (block.backgroundColor) {
            newBlock.backgroundColor = block.backgroundColor;
          }
          
          newBlocks.splice(index + 1, 0, newBlock);
          handleChange(newBlocks);

          setTimeout(() => {
            const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
            if (newBlockElement) {
              newBlockElement.focus();
              setCaretToStart(newBlockElement);
            }
          }, 0);

          return;
        }
        
        return;
      }

      if (e.key === KEY_BACKSPACE && isCaretAtStart(element) && text.length > 0) {
        e.preventDefault();

        if (index === 0) {
          return;
        }

        const prevBlock = blocks[index - 1];
        const prevBlockText = prevBlock.text || '';
        const currentBlockText = text;
        const mergedText = prevBlockText + currentBlockText;

        const newBlocks = [...blocks];
        newBlocks[index - 1] = { ...prevBlock, text: mergedText };
        newBlocks.splice(index, 1);
        handleChange(newBlocks);

        setTimeout(() => {
          const prevElement = editorRef.current?.querySelector(`[data-block-id="${prevBlock.id}"]`) as HTMLElement;
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
              
              const result = findTextNodeAndOffset(prevElement, prevBlockText.length);
              if (result) {
                range.setStart(result.node, result.offset);
                range.setEnd(result.node, result.offset);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }
        }, 0);

        return;
      }

      if (e.key === KEY_ARROW_UP) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (range.startOffset === 0 || index === 0) {
            if (index > 0) {
              e.preventDefault();
              const prevBlockId = blocks[index - 1].id;
              const prevElement = editorRef.current?.querySelector(`[data-block-id="${prevBlockId}"]`) as HTMLElement;
              if (prevElement) {
                prevElement.focus();
                setCaretToEnd(prevElement);
              }
            } else if (index === 0 && isCaretAtStart(element)) {
              e.preventDefault();
              const titleInput = editorRef.current?.closest('.px-10')?.querySelector('input[type="text"]') as HTMLInputElement;
              if (titleInput) {
                titleInput.focus();
                titleInput.setSelectionRange(titleInput.value.length, titleInput.value.length);
              }
            }
          }
        }
        return;
      }

      if (e.key === KEY_ARROW_DOWN) {
        if (block.type === BLOCK_TYPE_CODE && isCaretAtEnd(element)) {
          e.preventDefault();
          
          const newBlocks = [...blocks];
          const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
          newBlocks.splice(index + 1, 0, newBlock);
          handleChange(newBlocks);

          setTimeout(() => {
            const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
            if (newBlockElement) {
              newBlockElement.focus();
              setCaretToStart(newBlockElement);
            }
          }, 0);
          
          return;
        }

        if (index < blocks.length - 1) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const nextBlockId = blocks[index + 1].id;
            const nextElement = editorRef.current?.querySelector(`[data-block-id="${nextBlockId}"]`) as HTMLElement;
            if (nextElement) {
              e.preventDefault();
              nextElement.focus();
              setCaretToStart(nextElement);
            }
          }
        }
        return;
      }

      if (e.altKey && e.key === KEY_ARROW_UP && index > 0) {
        e.preventDefault();
        const currentBlockId = block.id;
        const newBlocks = [...blocks];
        [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
        handleChange(newBlocks);

        setTimeout(() => {
          const movedElement = editorRef.current?.querySelector(`[data-block-id="${currentBlockId}"]`) as HTMLElement;
          if (movedElement) {
            movedElement.focus();
            setCaretToEnd(movedElement);
          }
        }, 0);
        return;
      }

      if (e.altKey && e.key === KEY_ARROW_DOWN && index < blocks.length - 1) {
        e.preventDefault();
        const currentBlockId = block.id;
        const newBlocks = [...blocks];
        [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
        handleChange(newBlocks);

        setTimeout(() => {
          const movedElement = editorRef.current?.querySelector(`[data-block-id="${currentBlockId}"]`) as HTMLElement;
          if (movedElement) {
            movedElement.focus();
            setCaretToEnd(movedElement);
          }
        }, 0);
        return;
      }
    },
    [blocks, menuState.visible, actionMenu.visible, handleChange, selectedBlockIds, handleUndo, handleRedo, editorRef, setMenuState, setActionMenu, setSelectedBlockIds]
  );

  return {
    handleKeyDown,
  };
};

