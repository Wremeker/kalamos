import { useCallback } from 'react';
import { Block } from '@/types/editor';
import { findBlockLocation } from '@/utils/editorUtils';

interface UseFormattingCollaborationProps {
  blocks: Block[];
  updateBlock: (id: string, text: string) => void;
}

export const useFormattingCollaboration = ({
  blocks,
  updateBlock,
}: UseFormattingCollaborationProps) => {
  const handleFormatApplied = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let node = range.commonAncestorContainer;
    
    let cellElement: HTMLElement | null = null;
    let tempNode: Node | null = node;
    
    if (tempNode.nodeType === Node.TEXT_NODE) {
      tempNode = tempNode.parentElement;
    }
    
    while (tempNode && tempNode instanceof HTMLElement) {
      if (tempNode.hasAttribute('data-table-cell')) {
        cellElement = tempNode;
        break;
      }
      if (tempNode.hasAttribute('data-block-id')) {
        break;
      }
      tempNode = tempNode.parentElement;
    }
    
    if (cellElement) {
      const inputEvent = new Event('input', { bubbles: true });
      cellElement.dispatchEvent(inputEvent);
      return;
    }
    
    let blockElement: HTMLElement | null = null;
    if (node.nodeType === Node.TEXT_NODE) {
      blockElement = node.parentElement;
    } else {
      blockElement = node as HTMLElement;
    }
    
    while (blockElement && !blockElement.hasAttribute('data-block-id')) {
      blockElement = blockElement.parentElement;
    }

    if (blockElement) {
      const blockId = blockElement.getAttribute('data-block-id');
      if (blockId) {
        // Find block to determine its type
        const location = findBlockLocation(blockId, blocks);
        const block = location.block;
        
        if (block) {
          // Get updated HTML/text from block
          // For code blocks use textContent, for others use innerHTML
          const updatedText = block.type === 'code' 
            ? (blockElement.textContent || '')
            : (blockElement.innerHTML || '');
          
          // Trigger update that will be sent via collaboration
          updateBlock(blockId, updatedText);
        }
      }
    }
  }, [blocks, updateBlock]);

  return {
    handleFormatApplied,
  };
};

