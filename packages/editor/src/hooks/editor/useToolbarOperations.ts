import { useCallback } from 'react';
import { Block, BlockType } from '../../types/editor';
import { TextColor, BackgroundColor } from '../../constants/colors';
// findBlockLocation available from '../../utils/editorUtils' if needed
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_VIDEO,
  BLOCK_TYPE_AUDIO,
  BLOCK_TYPE_PDF,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_CALLOUT,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
} from '../../constants/blockTypes';

interface UseToolbarOperationsProps {
  blocks: Block[];
  handleChange: (blocks: Block[]) => void;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
  openLinkModal: (initialUrl: string, position: { x: number; y: number }, onConfirm: (url: string) => void) => void;
  selectedBlockIds?: Set<string>;
}

export const useToolbarOperations = ({
  blocks,
  handleChange,
  editorContainerRef,
  openLinkModal,
  selectedBlockIds,
}: UseToolbarOperationsProps) => {
  // Helper function to update a single block's type
  const updateBlockType = useCallback((block: Block, type: BlockType): Block => {
    const isColumnType = [BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5].includes(type);
    const columnCount = isColumnType ? parseInt(type.replace('columns', '')) : 0;
    const isToggleHeading = [BLOCK_TYPE_TOGGLE_H1, BLOCK_TYPE_TOGGLE_H2, BLOCK_TYPE_TOGGLE_H3].includes(type);
    const isBlockEmpty = !block.text || block.text.trim() === '' || block.text === '<br>';

    return {
      ...block,
      type,
      text: (type === BLOCK_TYPE_IMAGE || type === BLOCK_TYPE_VIDEO || type === BLOCK_TYPE_AUDIO || type === BLOCK_TYPE_PDF || type === BLOCK_TYPE_DIVIDER || type === BLOCK_TYPE_BOOKMARK || type === BLOCK_TYPE_EMBED || isColumnType || type === BLOCK_TYPE_CALLOUT) ? '' : block.text,
      ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
      ...(type === BLOCK_TYPE_IMAGE ? { imageUrl: '', imageFile: '' } : {}),
      ...(type === BLOCK_TYPE_VIDEO ? { videoUrl: '' } : {}),
      ...(type === BLOCK_TYPE_AUDIO ? { audioUrl: '' } : {}),
      ...(type === BLOCK_TYPE_PDF ? { pdfUrl: '' } : {}),
      ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
      ...(type === BLOCK_TYPE_BOOKMARK ? { url: '' } : {}),
      ...(type === BLOCK_TYPE_EMBED ? { url: '' } : {}),
      ...(type === BLOCK_TYPE_CALLOUT ? { 
        emoji: '💡', 
        children: [{ id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: BLOCK_TYPE_PARAGRAPH as BlockType, text: isBlockEmpty ? '' : block.text }]
      } : {}),
      ...(isColumnType ? { 
        columns: Array.from({ length: columnCount }, () => [
          { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: BLOCK_TYPE_PARAGRAPH as BlockType, text: '' }
        ])
      } : {}),
      ...(isToggleHeading ? {
        isOpen: true,
        children: []
      } : {}),
      ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
    };
  }, []);

  // Helper function to recursively update blocks in nested structures
  const updateBlocksRecursively = useCallback((blocksList: Block[], blockIdsToUpdate: Set<string>, type: BlockType): Block[] => {
    return blocksList.map(block => {
      let updatedBlock = { ...block };
      
      // Update this block if it's in the selection
      if (blockIdsToUpdate.has(block.id)) {
        updatedBlock = updateBlockType(block, type);
      }
      
      // Recursively update nested blocks (children)
      if (block.children && block.children.length > 0) {
        updatedBlock.children = updateBlocksRecursively(block.children, blockIdsToUpdate, type);
      }
      
      // Recursively update column blocks
      if (block.columns) {
        updatedBlock.columns = block.columns.map(column => 
          updateBlocksRecursively(column, blockIdsToUpdate, type)
        );
      }
      
      return updatedBlock;
    });
  }, [updateBlockType]);

  const handleToolbarBlockTypeChange = useCallback((type: BlockType, focusedBlockId: string | null) => {
    // If we have selected blocks, apply to all of them
    if (selectedBlockIds && selectedBlockIds.size > 0) {
      const newBlocks = updateBlocksRecursively(blocks, selectedBlockIds, type);
      handleChange(newBlocks);
      return;
    }

    // Otherwise, apply to focused block only (existing behavior)
    if (!focusedBlockId) return;

    const blockIndex = blocks.findIndex(b => b.id === focusedBlockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const newBlocks = [...blocks];

    const isColumnType = [BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5].includes(type);
    const columnCount = isColumnType ? parseInt(type.replace('columns', '')) : 0;
    const isToggleHeading = [BLOCK_TYPE_TOGGLE_H1, BLOCK_TYPE_TOGGLE_H2, BLOCK_TYPE_TOGGLE_H3].includes(type);
    const isBlockEmpty = !block.text || block.text.trim() === '' || block.text === '<br>';
    
    const childrenToPreserve = block.children && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? block.children : undefined;

    const updatedBlock: Block = {
      ...block,
      type,
      text: (type === BLOCK_TYPE_IMAGE || type === BLOCK_TYPE_VIDEO || type === BLOCK_TYPE_AUDIO || type === BLOCK_TYPE_PDF || type === BLOCK_TYPE_DIVIDER || type === BLOCK_TYPE_BOOKMARK || type === BLOCK_TYPE_EMBED || isColumnType || type === BLOCK_TYPE_CALLOUT) ? '' : block.text,
      ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
      ...(type === BLOCK_TYPE_IMAGE ? { imageUrl: '', imageFile: '' } : {}),
      ...(type === BLOCK_TYPE_VIDEO ? { videoUrl: '' } : {}),
      ...(type === BLOCK_TYPE_AUDIO ? { audioUrl: '' } : {}),
      ...(type === BLOCK_TYPE_PDF ? { pdfUrl: '' } : {}),
      ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
      ...(type === BLOCK_TYPE_BOOKMARK ? { url: '' } : {}),
      ...(type === BLOCK_TYPE_EMBED ? { url: '' } : {}),
      ...(type === BLOCK_TYPE_CALLOUT ? { 
        emoji: '💡', 
        children: [{ id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: BLOCK_TYPE_PARAGRAPH as BlockType, text: isBlockEmpty ? '' : block.text }]
      } : {}),
      ...(isColumnType ? { 
        columns: Array.from({ length: columnCount }, () => [
          { id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, type: BLOCK_TYPE_PARAGRAPH as BlockType, text: '' }
        ])
      } : {}),
      ...(isToggleHeading ? {
        isOpen: true,
        children: []
      } : {}),
      ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
    };

    newBlocks[blockIndex] = updatedBlock;

    if (type === BLOCK_TYPE_DIVIDER) {
      newBlocks.splice(blockIndex + 1, 0, {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: BLOCK_TYPE_PARAGRAPH as BlockType,
        text: '',
      });
    }

    if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
      newBlocks.splice(blockIndex + 1, 0, ...childrenToPreserve);
    }

    handleChange(newBlocks);

    setTimeout(() => {
      if (type === BLOCK_TYPE_DIVIDER) {
        const allBlockElements = document.querySelectorAll('[data-block-id]');
        const nextElement = allBlockElements[blockIndex + 1] as HTMLElement;
        if (nextElement) {
          nextElement.focus();
        }
      } else if (isColumnType) {
        const firstColumnFirstBlockId = updatedBlock.columns?.[0]?.[0]?.id;
        if (firstColumnFirstBlockId) {
          const element = document.querySelector(`[data-block-id="${firstColumnFirstBlockId}"]`) as HTMLElement;
          if (element) {
            element.focus();
          }
        }
      } else if (type === BLOCK_TYPE_CALLOUT) {
        const firstChildBlockId = updatedBlock.children?.[0]?.id;
        if (firstChildBlockId) {
          const element = document.querySelector(`[data-block-id="${firstChildBlockId}"]`) as HTMLElement;
          if (element) {
            element.focus();
          }
        }
      } else {
        const blockElement = document.querySelector(`[data-block-id="${focusedBlockId}"]`) as HTMLElement;
        if (blockElement) {
          blockElement.focus();
        }
      }
    }, 50);
  }, [blocks, handleChange, selectedBlockIds, updateBlocksRecursively]);

  // Helper function to recursively update block colors
  const updateBlockColorsRecursively = useCallback((blocksList: Block[], blockIdsToUpdate: Set<string>, textColor?: TextColor, backgroundColor?: BackgroundColor): Block[] => {
    return blocksList.map(block => {
      let updatedBlock = { ...block };
      
      // Update this block if it's in the selection
      if (blockIdsToUpdate.has(block.id)) {
        updatedBlock = { ...block, textColor, backgroundColor };
      }
      
      // Recursively update nested blocks (children)
      if (block.children && block.children.length > 0) {
        updatedBlock.children = updateBlockColorsRecursively(block.children, blockIdsToUpdate, textColor, backgroundColor);
      }
      
      // Recursively update column blocks
      if (block.columns) {
        updatedBlock.columns = block.columns.map(column => 
          updateBlockColorsRecursively(column, blockIdsToUpdate, textColor, backgroundColor)
        );
      }
      
      return updatedBlock;
    });
  }, []);

  // Helper function to recursively update block alignment
  const updateBlockAlignmentRecursively = useCallback((blocksList: Block[], blockIdsToUpdate: Set<string>, alignment: 'left' | 'center' | 'right'): Block[] => {
    return blocksList.map(block => {
      let updatedBlock = { ...block };
      
      // Update this block if it's in the selection
      if (blockIdsToUpdate.has(block.id)) {
        updatedBlock = { ...block, alignment };
      }
      
      // Recursively update nested blocks (children)
      if (block.children && block.children.length > 0) {
        updatedBlock.children = updateBlockAlignmentRecursively(block.children, blockIdsToUpdate, alignment);
      }
      
      // Recursively update column blocks
      if (block.columns) {
        updatedBlock.columns = block.columns.map(column => 
          updateBlockAlignmentRecursively(column, blockIdsToUpdate, alignment)
        );
      }
      
      return updatedBlock;
    });
  }, []);

  const handleToolbarColorChange = useCallback((textColor?: TextColor, backgroundColor?: BackgroundColor, focusedBlockId?: string | null) => {
    // If we have selected blocks, apply to all of them
    if (selectedBlockIds && selectedBlockIds.size > 0) {
      const newBlocks = updateBlockColorsRecursively(blocks, selectedBlockIds, textColor, backgroundColor);
      handleChange(newBlocks);
      return;
    }

    // Otherwise, apply to focused block only (existing behavior)
    if (!focusedBlockId) return;

    const newBlocks = blocks.map(block =>
      block.id === focusedBlockId 
        ? { ...block, textColor, backgroundColor } 
        : block
    );
    
    handleChange(newBlocks);
  }, [blocks, handleChange, selectedBlockIds, updateBlockColorsRecursively]);

  const handleToolbarAlignmentChange = useCallback((alignment: 'left' | 'center' | 'right', focusedBlockId?: string | null) => {
    // If we have selected blocks, apply to all of them
    if (selectedBlockIds && selectedBlockIds.size > 0) {
      const newBlocks = updateBlockAlignmentRecursively(blocks, selectedBlockIds, alignment);
      handleChange(newBlocks);
      return;
    }

    // Otherwise, apply to focused block only (existing behavior)
    if (!focusedBlockId) return;

    const newBlocks = blocks.map(block =>
      block.id === focusedBlockId 
        ? { ...block, alignment } 
        : block
    );
    
    handleChange(newBlocks);
  }, [blocks, handleChange, selectedBlockIds, updateBlockAlignmentRecursively]);

  const handleFormatApplied = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.anchorNode) {
      let blockElement = selection.anchorNode as Node;
      while (blockElement && blockElement instanceof Element && !blockElement.hasAttribute('data-block-id')) {
        blockElement = blockElement.parentElement as Node;
      }
      
      if (blockElement && blockElement instanceof Element) {
        const blockId = blockElement.getAttribute('data-block-id');
        if (blockId) {
          const newBlocks = blocks.map(block => {
            if (block.id === blockId && blockElement instanceof HTMLElement) {
              return { ...block, text: blockElement.innerHTML };
            }
            return block;
          });
          
          handleChange(newBlocks);
        }
      }
    }
  }, [blocks, handleChange]);

  const handleToolbarAddLink = useCallback((focusedBlockId: string | null) => {
    if (!focusedBlockId) return;

    setTimeout(() => {
      const element = editorContainerRef.current?.querySelector(`[data-block-id="${focusedBlockId}"]`) as HTMLElement;
      if (!element) return;
      
      element.focus();
      
      // Set caret to end
      const range = window.document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(element);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);

      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        const position = { x: rect.left, y: rect.bottom + 8 };

        openLinkModal('https://', position, (url: string) => {
          const element = editorContainerRef.current?.querySelector(`[data-block-id="${focusedBlockId}"]`) as HTMLElement;
          if (!element) return;

          const textContent = element.textContent?.trim() || '';

          const link = window.document.createElement('a');
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

          const newBlocks = blocks.map(block =>
            block.id === focusedBlockId 
              ? { ...block, text: updatedText } 
              : block
          );

          handleChange(newBlocks);

          setTimeout(() => {
            const element = editorContainerRef.current?.querySelector(`[data-block-id="${focusedBlockId}"]`) as HTMLElement;
            if (element) {
              element.innerHTML = updatedText;
              element.focus();
              
              // Set caret to end
              const range = window.document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(element);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            }
          }, 0);
        });
      }, 0);
    }, 0);
  }, [blocks, handleChange, editorContainerRef, openLinkModal]);

  const handleToolbarAddImage = useCallback((focusedBlockId: string | null) => {
    if (!focusedBlockId) return;

    const blockIndex = blocks.findIndex(b => b.id === focusedBlockId);
    if (blockIndex === -1) return;

    const newImageBlock: Block = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: BLOCK_TYPE_IMAGE as BlockType,
      text: '',
      imageUrl: '',
      imageFile: '',
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newImageBlock);
    handleChange(newBlocks);

    setTimeout(() => {
      const imageElement = editorContainerRef.current?.querySelector(`[data-block-id="${newImageBlock.id}"]`) as HTMLElement;
      if (imageElement) {
        imageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }, [blocks, handleChange, editorContainerRef]);

  return {
    handleToolbarBlockTypeChange,
    handleToolbarColorChange,
    handleToolbarAlignmentChange,
    handleFormatApplied,
    handleToolbarAddLink,
    handleToolbarAddImage,
  };
};

