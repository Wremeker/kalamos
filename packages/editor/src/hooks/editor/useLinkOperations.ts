import { useCallback } from 'react';
import { Block } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';
import { createBlock, setCaretToEnd, findBlockLocation } from '../../utils/editorUtils';
import type { MenuState, ActionMenuState } from './useMenuState';

interface UseLinkOperationsProps {
  handleChange: (blocks: Block[]) => void;
  menuState: MenuState;
  setMenuState: React.Dispatch<React.SetStateAction<MenuState>>;
  actionMenu: ActionMenuState;
  setActionMenu: React.Dispatch<React.SetStateAction<ActionMenuState>>;
  linkPasteMenu: {
    visible: boolean;
    position: { x: number; y: number } | null;
    url: string;
    blockId: string | null;
    originalText: string;
  };
  setLinkPasteMenu: React.Dispatch<React.SetStateAction<{
    visible: boolean;
    position: { x: number; y: number } | null;
    url: string;
    blockId: string | null;
    originalText: string;
  }>>;
  openLinkModal: (initialUrl: string, position: { x: number; y: number }, onConfirm: (url: string) => void) => void;
}

export const useLinkOperations = ({
  handleChange,
  menuState,
  setMenuState,
  actionMenu,
  setActionMenu,
  linkPasteMenu,
  setLinkPasteMenu,
  openLinkModal,
}: UseLinkOperationsProps) => {
  const { blocks, editorRef } = useEditorContext();

  // Generic handler to add link for any block
  const handleAddLinkForBlock = useCallback((blockId: string) => {
    if (!blockId) return;

    setTimeout(() => {
      const element = editorRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      if (!element) return;
      
      element.focus();
      setCaretToEnd(element);

      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const position = { x: rect.left, y: rect.bottom + 24 };

        openLinkModal('https://', position, (url: string) => {
          const element = editorRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
          if (!element) return;

          const textContent = element.textContent?.trim() || '';

          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300';

          let updatedText: string;
          
          if (textContent === '') {
            link.textContent = url;
            updatedText = link.outerHTML;
          } else {
            link.textContent = textContent;
            updatedText = link.outerHTML;
          }

          const location = findBlockLocation(blockId, blocks);
          if (!location.block) return;

          const newBlocks = [...blocks];
          const updatedBlock = {
            ...location.block,
            text: updatedText,
          };

          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks[location.blockIndex] = updatedBlock;
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks[location.blockIndex] = updatedBlock;
          }
          handleChange(newBlocks);

          setTimeout(() => {
            const element = editorRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
            if (element) {
              element.innerHTML = updatedText;
              element.focus();
              setCaretToEnd(element);
            }
          }, 0);
        });
      }, 0);
    }, 0);
  }, [blocks, handleChange, openLinkModal, editorRef]);

  const handleAddLinkInActionMenu = useCallback(() => {
    const currentBlockId = actionMenu.blockId;
    if (!currentBlockId) return;

    setActionMenu({ visible: false, position: null, blockId: null, isNested: false });
    handleAddLinkForBlock(currentBlockId);
  }, [actionMenu.blockId, setActionMenu, handleAddLinkForBlock]);

  const handleAddLinkInMenu = useCallback(() => {
    const currentBlockId = menuState.blockId;
    
    if (!currentBlockId) return;

    const location = findBlockLocation(currentBlockId, blocks);
    if (!location.block) return;

    const block = location.block;
    let cleanedText = block.text;

    // Clean up slash command text if needed
    if (menuState.triggerType === 'slash') {
      const slashIndex = cleanedText.lastIndexOf('/');
      cleanedText = cleanedText.slice(0, slashIndex) + cleanedText.slice(slashIndex + 1 + menuState.filter.length);
      
      const element = editorRef.current?.querySelector(`[data-block-id="${currentBlockId}"]`) as HTMLElement;
      if (element) {
        element.innerHTML = cleanedText;
        element.textContent = cleanedText;
      }

      const newBlocks = [...blocks];
      const updatedBlock = { ...block, text: cleanedText };
      
      if (location.isNested) {
        const parentBlock = newBlocks[location.parentBlockIndex];
        
        if (location.isToggleChild) {
          const children = [...(parentBlock.children || [])];
          children[location.blockIndex] = updatedBlock;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
        } else if (parentBlock.columns) {
          const columnBlocks = [...parentBlock.columns[location.columnIndex]];
          columnBlocks[location.blockIndex] = updatedBlock;
          
          const newColumns = [...parentBlock.columns];
          newColumns[location.columnIndex] = columnBlocks;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
        }
      } else {
        newBlocks[location.blockIndex] = updatedBlock;
      }
      handleChange(newBlocks);
    }
    
    setMenuState({ visible: false, position: null, blockId: null, filter: '', triggerType: null, isInsideToggle: false, isNested: false });
    
    // Reuse generic handler
    handleAddLinkForBlock(currentBlockId);
  }, [blocks, menuState, handleChange, editorRef, setMenuState, handleAddLinkForBlock]);

  const handleLinkPasteMenuSelect = useCallback((action: 'bookmark' | 'url' | 'image' | 'embed' | 'lesson') => {
    if (!linkPasteMenu.blockId || !linkPasteMenu.url) return;

    const location = findBlockLocation(linkPasteMenu.blockId, blocks);
    if (!location.block) return;

    const currentBlock = location.block;
    const newBlocks = [...blocks];
    
    const targetBlockId = linkPasteMenu.blockId;
    
    const originalText = linkPasteMenu.originalText;

    switch (action) {
      case 'url':
        const linkHtml = `<a href="${linkPasteMenu.url}" target="_blank" rel="noopener noreferrer">${linkPasteMenu.url}</a>`;
        
        const textToInsert = originalText ? ' ' + linkHtml : linkHtml;
        
        const updatedBlockWithLink = {
          ...currentBlock,
          text: originalText + textToInsert,
        };
        
        if (location.isNested) {
          const parentBlock = newBlocks[location.parentBlockIndex];
          if (parentBlock.columns) {
            const columnBlocks = [...parentBlock.columns[location.columnIndex]];
            columnBlocks[location.blockIndex] = updatedBlockWithLink;
            
            const newColumns = [...parentBlock.columns];
            newColumns[location.columnIndex] = columnBlocks;
            newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
          }
        } else {
          newBlocks[location.blockIndex] = updatedBlockWithLink;
        }
        handleChange(newBlocks);
        break;

      case 'image':
        const imageBlock = {
          ...createBlock('image', ''),
          imageUrl: linkPasteMenu.url,
          imageFile: linkPasteMenu.url,
        };
        
        if (originalText.trim() === '') {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks[location.blockIndex] = imageBlock;
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks[location.blockIndex] = imageBlock;
          }
        } else {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks.splice(location.blockIndex + 1, 0, imageBlock);
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks.splice(location.blockIndex + 1, 0, imageBlock);
          }
        }
        handleChange(newBlocks);
        break;

      case 'embed':
        const embedBlock = {
          ...createBlock('embed', ''),
          url: linkPasteMenu.url,
        };
        
        if (originalText.trim() === '') {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks[location.blockIndex] = embedBlock;
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks[location.blockIndex] = embedBlock;
          }
        } else {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks.splice(location.blockIndex + 1, 0, embedBlock);
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks.splice(location.blockIndex + 1, 0, embedBlock);
          }
        }
        handleChange(newBlocks);
        break;

      case 'bookmark':
        const bookmarkBlock = {
          ...createBlock('bookmark', ''),
          url: linkPasteMenu.url,
        };
        
        if (originalText.trim() === '') {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks[location.blockIndex] = bookmarkBlock;
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks[location.blockIndex] = bookmarkBlock;
          }
        } else {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks.splice(location.blockIndex + 1, 0, bookmarkBlock);
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks.splice(location.blockIndex + 1, 0, bookmarkBlock);
          }
        }
        handleChange(newBlocks);
        break;

      case 'lesson':
        // Extract lesson slug from URL
        const lessonUrlObj = new URL(linkPasteMenu.url);
        const lessonMatch = lessonUrlObj.pathname.match(/\/lessons\/([^/]+)/);
        const lessonSlug = lessonMatch && lessonMatch[1] !== 'edit' ? lessonMatch[1] : undefined;
        
        if (!lessonSlug) break;
        
        const lessonBlock = {
          ...createBlock('lesson', ''),
          lessonSlug,
        };
        
        if (originalText.trim() === '') {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks[location.blockIndex] = lessonBlock;
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks[location.blockIndex] = lessonBlock;
          }
        } else {
          if (location.isNested) {
            const parentBlock = newBlocks[location.parentBlockIndex];
            if (parentBlock.columns) {
              const columnBlocks = [...parentBlock.columns[location.columnIndex]];
              columnBlocks.splice(location.blockIndex + 1, 0, lessonBlock);
              
              const newColumns = [...parentBlock.columns];
              newColumns[location.columnIndex] = columnBlocks;
              newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
            }
          } else {
            newBlocks.splice(location.blockIndex + 1, 0, lessonBlock);
          }
        }
        handleChange(newBlocks);
        break;
    }

    setLinkPasteMenu({
      visible: false,
      position: null,
      url: '',
      blockId: null,
      originalText: '',
    });

    setTimeout(() => {
      const element = editorRef.current?.querySelector(`[data-block-id="${targetBlockId}"]`) as HTMLElement;
      if (element) {
        if (action === 'url') {
          element.blur();
          
          requestAnimationFrame(() => {
            let updatedBlock;
            if (location.isNested) {
              const parentBlock = newBlocks[location.parentBlockIndex];
              if (parentBlock.columns) {
                updatedBlock = parentBlock.columns[location.columnIndex][location.blockIndex];
              }
            } else {
              updatedBlock = newBlocks[location.blockIndex];
            }
            
            if (updatedBlock) {
              element.innerHTML = updatedBlock.text;
            }
            element.focus();
            setCaretToEnd(element);
          });
        }
      }
    }, 10);
  }, [blocks, linkPasteMenu, handleChange, editorRef, setLinkPasteMenu]);

  return {
    handleAddLinkInActionMenu,
    handleAddLinkInMenu,
    handleLinkPasteMenuSelect,
    handleAddLinkForBlock,
  };
};

