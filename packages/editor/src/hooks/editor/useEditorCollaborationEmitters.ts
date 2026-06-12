import { useEffect, useRef } from 'react';
import { Block } from '@/types/editor';

interface UseEditorCollaborationEmittersProps {
  blocks: Block[];
  editorRef: React.RefObject<HTMLDivElement | null>;
  enableCollaboration: boolean;
  documentId?: string;
  isRemoteUpdate?: boolean;
  // onBlocksChangeCollab is no longer used - block emission is handled by handleBlocksChange in DocumentDetailPage
  onBlocksChangeCollab?: (update: { blocks: Block[] }) => void;
  emitCursorPosition?: (blockId: string, offset: number) => void;
}

export const useEditorCollaborationEmitters = ({
  blocks,
  editorRef,
  enableCollaboration,
  documentId,
  isRemoteUpdate = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBlocksChangeCollab: _onBlocksChangeCollab,
  emitCursorPosition,
}: UseEditorCollaborationEmittersProps) => {
  const lastEmittedBlocksRef = useRef<Block[]>(blocks);
  const lastReceivedBlocksRef = useRef<Block[]>(blocks);
  const getCursorPositionAndEmitRef = useRef<(() => void) | null>(null);
  const forceEmitRef = useRef(false);
  // Track last received blocks content hash to prevent re-emitting remote updates
  const lastReceivedBlocksHashRef = useRef<string>('');
  
  const lastCursorStateRef = useRef<{ inEditor: boolean; blockId: string; offset: number }>({ 
    inEditor: false, 
    blockId: '', 
    offset: -1 
  });

  // Generate a simple hash of blocks for comparison - includes media URLs to detect uploads
  const getBlocksHash = (blocksToHash: Block[]): string => {
    return blocksToHash.map(b => {
      const mediaUrl = b.imageUrl || b.videoUrl || b.audioUrl || b.pdfUrl || '';
      return `${b.id}:${b.text || ''}:${b.type}:${mediaUrl}`;
    }).join('|');
  };

  useEffect(() => {
    if (isRemoteUpdate) {
      const hash = getBlocksHash(blocks);
      lastReceivedBlocksRef.current = blocks;
      lastReceivedBlocksHashRef.current = hash;
    }
  }, [blocks, isRemoteUpdate]);

  // Update refs when blocks change - NO LONGER emits blocks here
  // Block emission is handled by handleBlocksChange in DocumentDetailPage
  // This effect only tracks blocks for reference comparison to avoid duplicate work
  useEffect(() => {
    if (!enableCollaboration || !documentId) return;
    
    const currentHash = getBlocksHash(blocks);
    const isSameContentAsReceived = currentHash === lastReceivedBlocksHashRef.current;
    
    // If content matches what was received, update the reference but don't emit
    // (emission is handled by handleBlocksChange, not here)
    if (isSameContentAsReceived) {
      lastReceivedBlocksRef.current = blocks;
    }
    
    // Update lastEmittedBlocksRef for any future reference comparisons
    lastEmittedBlocksRef.current = blocks;

    // Emit cursor position after block changes
    if (emitCursorPosition && getCursorPositionAndEmitRef.current) {
      forceEmitRef.current = true;
      
      const timeouts: ReturnType<typeof setTimeout>[] = [];
      
      [250, 300, 350].forEach(delay => {
        const timeoutId = setTimeout(() => {
          if (getCursorPositionAndEmitRef.current) {
            forceEmitRef.current = true;
            getCursorPositionAndEmitRef.current();
          }
        }, delay);
        timeouts.push(timeoutId);
      });
      
      return () => {
        timeouts.forEach(id => clearTimeout(id));
      };
    }
  }, [blocks, enableCollaboration, documentId, emitCursorPosition]);
  
  // Track cursor position and send changes
  useEffect(() => {
    if (!enableCollaboration || !emitCursorPosition) return;

    const getTextOffset = (container: Node, targetNode: Node, targetOffset: number): number => {
      let offset = 0;
      const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentNode = walker.nextNode();
      while (currentNode) {
        if (currentNode === targetNode) {
          return offset + targetOffset;
        }
        offset += currentNode.textContent?.length || 0;
        currentNode = walker.nextNode();
      }
      
      return offset;
    };

    const getCursorPositionAndEmit = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        if (lastCursorStateRef.current.inEditor) {
          emitCursorPosition('', -1);
          lastCursorStateRef.current = { inEditor: false, blockId: '', offset: -1 };
        }
        return;
      }

      const range = selection.getRangeAt(0);
      let node: Node | null = range.startContainer;
      
      if (!editorRef.current?.contains(node as Node)) {
        if (lastCursorStateRef.current.inEditor) {
          emitCursorPosition('', -1);
          lastCursorStateRef.current = { inEditor: false, blockId: '', offset: -1 };
        }
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
          const absoluteOffset = getTextOffset(blockElement, range.startContainer, range.startOffset);
          
          // Send cursor changes only if position changed (or force flag is set)
          const shouldEmit = forceEmitRef.current || 
                            lastCursorStateRef.current.blockId !== blockId || 
                            lastCursorStateRef.current.offset !== absoluteOffset;
          
          if (shouldEmit) {
            emitCursorPosition(blockId, absoluteOffset);
            lastCursorStateRef.current = { inEditor: true, blockId, offset: absoluteOffset };
            forceEmitRef.current = false;
          }
        }
      } else if (lastCursorStateRef.current.inEditor) {
        emitCursorPosition('', -1);
        lastCursorStateRef.current = { inEditor: false, blockId: '', offset: -1 };
        forceEmitRef.current = false;
      }
    };

    // Save ref for use in other effects
    getCursorPositionAndEmitRef.current = getCursorPositionAndEmit;

    // Track cursor changes on text selection
    document.addEventListener('selectionchange', getCursorPositionAndEmit);
    
    // Track cursor changes on key press
    const handleKeyUp = () => {
      // Use requestAnimationFrame + setTimeout to ensure DOM is fully updated after creating a new block
      requestAnimationFrame(() => {
        setTimeout(getCursorPositionAndEmit, 10);
      });
    };
    
    // Track cursor changes on mouse click
    const handleClick = () => {
      getCursorPositionAndEmit();
    };
    
    const editorElement = editorRef.current;
    if (editorElement) {
      editorElement.addEventListener('keyup', handleKeyUp);
      editorElement.addEventListener('click', handleClick);
    }
    
    return () => {
      document.removeEventListener('selectionchange', getCursorPositionAndEmit);
      if (editorElement) {
        editorElement.removeEventListener('keyup', handleKeyUp);
        editorElement.removeEventListener('click', handleClick);
      }
    };
  }, [enableCollaboration, emitCursorPosition, editorRef]);
};

