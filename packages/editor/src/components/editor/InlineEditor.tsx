import React, { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Block, BlockType } from '../../types/editor';
import { BlockView } from './BlockView';
import { SlashMenu } from './SlashMenu';
import { BlockActionMenu } from './BlockActionMenu';
import { SelectionMenu } from './SelectionMenu';
import { FixedToolbar } from './FixedToolbar';
import { LinkModal } from './LinkModal';
import { LinkPasteMenu } from './LinkPasteMenu';
import { TextColor, BackgroundColor } from '../../constants/colors';
import { EditorProvider, useEditorContext } from '../../contexts/EditorContext';
import { useKeyboardHandlers } from '../../hooks/editor/useKeyboardHandlers';
import { useBlockOperations } from '../../hooks/editor/useBlockOperations';
import { useLinkOperations } from '../../hooks/editor/useLinkOperations';
import { useBlockSelection } from '../../hooks/editor/useBlockSelection';
import { useDragAndDrop } from '../../hooks/editor/useDragAndDrop';
import { useToolbarOperations } from '../../hooks/editor/useToolbarOperations';
import { useClipboard } from '../../hooks/editor/useClipboard';
import type { MenuState, ActionMenuState } from '../../hooks/editor/useMenuState';
import { inferWholeBlockInlineTextColor } from '../../utils/editorUtils';

interface InlineEditorProps {
  blocks: Block[];
  onChange?: (blocks: Block[]) => void;
  
  enableDragDrop?: boolean;
  enableSlashMenu?: boolean;
  enableActionMenu?: boolean;
  enableSelectionMenu?: boolean;
  enableFixedToolbar?: boolean;
  stickyToolbar?: boolean;
  
  containerClassName?: string;
  disableExercises?: boolean;
}

const InlineEditorContent: React.FC<InlineEditorProps> = ({
  blocks,
  onChange,
  enableDragDrop = true,
  enableSlashMenu = true,
  enableActionMenu = true,
  enableSelectionMenu = true,
  enableFixedToolbar = true,
  stickyToolbar = true,
  containerClassName = 'space-y-2 pl-16 pr-16 pb-96',
  disableExercises: _disableExercises = false,
}) => {
  const { editorRef } = useEditorContext();
  const containerRef = editorRef; // Use context's ref for container
  
  const [menuState, setMenuState] = React.useState<MenuState>({
    visible: false,
    position: null,
    blockId: null,
    filter: '',
    triggerType: null,
  });
  
  const [actionMenu, setActionMenu] = React.useState<ActionMenuState>({
    visible: false,
    position: null,
    blockId: null,
  });

  // Use the same drag and drop hook as BlockEditor
  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDrop,
  } = useDragAndDrop({ handleChange: onChange || (() => {}) });
  
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [currentBlockType, setCurrentBlockType] = useState<BlockType | null>(null);
  
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const focusedBlock = blocks.find(b => b.id === focusedBlockId);

  const {
    selectedBlockIds,
    setSelectedBlockIds,
    isSelecting,
    cursorPosition,
    selectionStartPos,
    handleBlockMouseDown,
    handleBlockMouseEnter,
    handleContainerMouseDown,
    handleNestedBlockMouseDown,
    handleNestedBlockMouseEnter,
  } = useBlockSelection({ handleChange: onChange || (() => {}) });
  
  const [linkPasteMenu, setLinkPasteMenu] = useState({
    visible: false,
    position: null as { x: number; y: number } | null,
    url: '',
    blockId: null as string | null,
    originalText: '',
  });

  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    position: { x: number; y: number } | null;
    initialUrl: string;
    onConfirm: ((url: string) => void) | null;
  }>({
    isOpen: false,
    position: null,
    initialUrl: '',
    onConfirm: null,
  });

  const openLinkModal = useCallback((initialUrl: string, position: { x: number; y: number }, onConfirm: (url: string) => void) => {
    setLinkModal({
      isOpen: true,
      position,
      initialUrl,
      onConfirm,
    });
  }, []);

  const closeLinkModal = useCallback(() => {
    setLinkModal({
      isOpen: false,
      position: null,
      initialUrl: '',
      onConfirm: null,
    });
  }, []);

  const {
    updateBlock,
    videoUploadProgress,
    handleBlockUpdate,
    handleImageUpload,
    handleImageDelete,
    handleImageResize,
    handleImageAlignmentChange,
    handleDrawingUpdate,
    handleVideoUpload,
    handleVideoDelete,
    handleVideoAlignmentChange,
    handleVideoDuplicate,
    handleAudioUpload,
    handleAudioDelete,
    handlePdfUpload,
    handlePdfDelete,
    handlePdfResize,
    handlePdfAlignmentChange,
    handlePdfDuplicate,
    handleColumnUpdate,
    handleColumnWidthsUpdate,
    handleToggleHeading,
    handleToggleChildUpdate,
    handleCalloutChildUpdate,
    handleTableDataUpdate,
    handleCheckToggle,
    handleMenuSelect,
    handleBlockDelete,
    handleBlockDuplicate,
    handleBlockTurnInto,
    handleBlockColorChange,
    handleCreateBlockAfterColumn,
    handleCreateBlockAfterToggle,
    handleCreateBlockAfterCallout,
  } = useBlockOperations({
    handleChange: onChange || (() => {}),
    setMenuState,
    menuState,
    actionMenu,
    selectedBlockIds,
    setSelectedBlockIds,
  });

  const {
    handleAddLinkInActionMenu,
    handleAddLinkInMenu,
    handleAddLinkForBlock,
    handleLinkPasteMenuSelect,
  } = useLinkOperations({
    handleChange: onChange || (() => {}),
    menuState,
    setMenuState,
    actionMenu,
    setActionMenu,
    linkPasteMenu,
    setLinkPasteMenu,
    openLinkModal,
  });

  const { currentBlockType: clipboardBlockType, isInsideToggle, isInsideTable } = useClipboard({
    handleChange: onChange || (() => {}),
    setLinkPasteMenu,
    setShowSelectionMenu,
  });

  const handleToolbarAddLink = useCallback(() => {
    if (!focusedBlockId) return;
    handleAddLinkForBlock(focusedBlockId);
  }, [focusedBlockId, handleAddLinkForBlock]);

  const handleEmojiChange = useCallback((blockId: string, emoji: string) => {
    if (!onChange) return;
    
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, emoji } : block
    );
    onChange(newBlocks);
  }, [blocks, onChange]);

  const handleImageDuplicate = useCallback((blockId: string) => {
    if (!onChange) return;
    
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const duplicatedBlock = { 
      ...block, 
      id: `block-${Date.now()}-${Math.random()}` 
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
    onChange(newBlocks);
  }, [blocks, onChange]);

  const handleSlashMenu = useCallback((blockId: string, filter: string, position: { x: number; y: number }) => {
    if (!enableSlashMenu) return;
    
    setMenuState({
      visible: true,
      position,
      blockId,
      filter,
      triggerType: 'slash',
    });
  }, [enableSlashMenu]);

  const handleCloseSlashMenu = useCallback(() => {
    setMenuState({ 
      visible: false, 
      position: null, 
      blockId: null, 
      filter: '', 
      triggerType: null, 
      isInsideToggle: false, 
      isNested: false 
    });
  }, []);

  const handlePlusClick = useCallback((blockId: string, element: HTMLElement) => {
    if (!enableSlashMenu) return;
    
    const rect = element.getBoundingClientRect();
    setMenuState({
      visible: true,
      position: { x: rect.left, y: rect.bottom + 4 },
      blockId,
      filter: '',
      triggerType: 'slash',
    });
  }, [enableSlashMenu]);

  const handleDotsClick = useCallback((blockId: string, element: HTMLElement) => {
    if (!enableActionMenu) return;
    
    const rect = element.getBoundingClientRect();
    setActionMenu({
      visible: true,
      position: { x: rect.right + 8, y: rect.top },
      blockId,
    });
  }, [enableActionMenu]);

  // Provide dots click handler that serves dual purpose:
  // 1. Opens action menu when enableActionMenu is true
  // 2. Shows drag handle when only enableDragDrop is true (no-op click handler)
  // This ensures the drag handle (dots button) is visible when drag is enabled
  const dotsClickHandler = enableActionMenu ? handleDotsClick : (enableDragDrop ? () => {} : undefined);

  const { handleKeyDown } = useKeyboardHandlers({
    handleChange: onChange || (() => {}),
    handleUndo: () => {},
    handleRedo: () => {},
    menuState,
    setMenuState,
    actionMenu,
    setActionMenu,
    selectedBlockIds,
    setSelectedBlockIds,
  });

  // Drag configuration initialized via useDragAndDrop hook
  

  const handleSelectionMenuBlockTypeChange = useCallback((type: BlockType) => {
    if (!onChange) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;
    
    let blockElement: Node | null = anchorNode.nodeType === Node.TEXT_NODE 
      ? anchorNode.parentElement 
      : anchorNode;
    
    while (blockElement && blockElement instanceof Element && !blockElement.hasAttribute('data-block-id')) {
      blockElement = blockElement.parentElement;
    }
    
    if (blockElement && blockElement instanceof Element) {
      const blockId = blockElement.getAttribute('data-block-id');
      if (blockId) {
        const block = blocks.find(b => b.id === blockId);
        if (!block) return;
          
        const newBlocks = blocks.map(b =>
          b.id === blockId ? { ...b, type } : b
        );
        onChange(newBlocks);
        
        
        setShowSelectionMenu(false);
        
        setTimeout(() => {
          const updatedBlockEl = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
          if (updatedBlockEl) {
            updatedBlockEl.focus();
          }
        }, 50);
      }
    }
  }, [blocks, onChange]);

  const {
    handleToolbarBlockTypeChange: toolbarBlockTypeChange,
    handleToolbarAlignmentChange: toolbarAlignmentChange,
    handleFormatApplied,
    handleToolbarAddImage: toolbarAddImage,
  } = useToolbarOperations({
    blocks,
    handleChange: onChange || (() => {}),
    editorContainerRef: containerRef,
    openLinkModal,
    selectedBlockIds,
  });

  const handleToolbarBlockTypeChange = useCallback((type: BlockType) => {
    if (!focusedBlockId) return;
    toolbarBlockTypeChange(type, focusedBlockId);
  }, [toolbarBlockTypeChange, focusedBlockId]);

  const handleToolbarAlignmentChange = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (!focusedBlockId) return;
    toolbarAlignmentChange(alignment, focusedBlockId);
  }, [toolbarAlignmentChange, focusedBlockId]);

  const handleToolbarAddImage = useCallback(() => {
    if (!focusedBlockId) return;
    toolbarAddImage(focusedBlockId);
  }, [focusedBlockId, toolbarAddImage]);

  const handleContainerMouseDownWrapper = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // First, handle block selection logic
    handleContainerMouseDown(e);
  }, [handleContainerMouseDown]);

  React.useEffect(() => {
    if (!enableSelectionMenu) return;
    
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
        const anchorNode = selection.anchorNode;
        if (anchorNode && containerRef.current?.contains(anchorNode)) {
          let blockElement: Node | null = anchorNode.nodeType === Node.TEXT_NODE 
            ? anchorNode.parentElement 
            : anchorNode;
          
          while (blockElement && blockElement instanceof Element && !blockElement.hasAttribute('data-block-id')) {
            blockElement = blockElement.parentElement;
          }
          
          if (blockElement && blockElement instanceof Element) {
            const blockId = blockElement.getAttribute('data-block-id');
            const block = blocks.find(b => b.id === blockId);
            if (block) {
              setCurrentBlockType(block.type);
            }
          }
          
          setShowSelectionMenu(true);
        }
      } else {
        setShowSelectionMenu(false);
        setCurrentBlockType(null);
      }
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [enableSelectionMenu, blocks]);

  React.useEffect(() => {
    if (!enableFixedToolbar) return;

    const handleFocusChange = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      let blockElement: HTMLElement | null = target;
      while (blockElement && !blockElement.hasAttribute('data-block-id')) {
        blockElement = blockElement.parentElement;
      }

      if (blockElement) {
        const blockId = blockElement.getAttribute('data-block-id');
        setFocusedBlockId(blockId);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      if (relatedTarget) {
        const isToolbarClick = relatedTarget.closest('.fixed-toolbar') !== null;
        if (isToolbarClick) {
          return;
        }
      }
      
      if (!relatedTarget || !containerRef.current?.contains(relatedTarget)) {
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (!activeElement || !containerRef.current?.contains(activeElement)) {
            const isInToolbar = activeElement?.closest('.fixed-toolbar') !== null;
            if (!isInToolbar) {
              setFocusedBlockId(null);
            }
          }
        }, 50);
      }
    };

    document.addEventListener('focusin', handleFocusChange as EventListener);
    document.addEventListener('focusout', handleBlur as EventListener);

    return () => {
      document.removeEventListener('focusin', handleFocusChange as EventListener);
      document.removeEventListener('focusout', handleBlur as EventListener);
    };
  }, [enableFixedToolbar, containerRef]);

  const actionMenuBlock = actionMenu.blockId ? blocks.find((b) => b.id === actionMenu.blockId) : undefined;
  const actionMenuEffectiveTextColor = (
    actionMenuBlock
      ? inferWholeBlockInlineTextColor(actionMenuBlock.text || '') ?? actionMenuBlock.textColor ?? 'default'
      : 'default'
  ) as TextColor;

  return (
    <>
      {enableFixedToolbar && (
        <FixedToolbar
          currentBlockType={focusedBlock?.type || null}
          currentAlignment={focusedBlock?.alignment}
          onBlockTypeChange={handleToolbarBlockTypeChange}
          onFormatApplied={handleFormatApplied}
          onAlignmentChange={handleToolbarAlignmentChange}
          onAddLink={handleToolbarAddLink}
          onAddImage={handleToolbarAddImage}
          stickyToolbar={stickyToolbar}
        />
      )}
      
      <div 
        className={`${containerClassName} min-h-[450px] ${blocks.length === 0 ? 'cursor-text' : ''}`} 
        ref={containerRef}
        onMouseDown={handleContainerMouseDownWrapper}
      >
        {blocks.map((block, index) => {
          const isDragging = dragState.draggingIndex === index;
          const isDragOver = dragState.overIndex === index && dragState.draggingIndex !== index;
          
          return (
            <div
              key={block.id}
              className={`relative transition-opacity duration-200 ${
                isDragging 
                  ? 'opacity-40' 
                  : 'opacity-100'
              }`}
              onDragEnter={(e) => {
                if (enableDragDrop) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  handleDragOver(index);
                }
              }}
              onDragLeave={() => {}}
              onDragOver={(e) => {
                if (enableDragDrop) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  handleDragOver(index);
                }
              }}
              onDrop={(e) => {
                if (enableDragDrop) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDrop();
                }
              }}
            >
              {isDragOver && (
                <div className="h-0.5 bg-[#0086F4]/50 shadow-[0_0_8px_rgba(255,96,53,0.3)] animate-pulse mb-2" />
              )}
              <BlockView
                block={block}
                index={index}
                isFirst={index === 0}
                onUpdate={updateBlock}
                onKeyDown={handleKeyDown}
                onCheckToggle={handleCheckToggle}
                onUpdateBlock={handleBlockUpdate}
                onImageUpload={handleImageUpload}
                onImageDelete={handleImageDelete}
                onImageDuplicate={handleImageDuplicate}
                onImageResize={handleImageResize}
                onImageAlignmentChange={handleImageAlignmentChange}
                onDrawingUpdate={handleDrawingUpdate}
                onVideoUpload={handleVideoUpload}
                videoUploadProgress={videoUploadProgress[block.id] ?? null}
                onVideoDelete={handleVideoDelete}
                onVideoAlignmentChange={handleVideoAlignmentChange}
                onVideoDuplicate={handleVideoDuplicate}
                onAudioUpload={handleAudioUpload}
                onAudioDelete={handleAudioDelete}
                onPdfUpload={handlePdfUpload}
                onPdfDelete={handlePdfDelete}
                onPdfResize={handlePdfResize}
                onPdfAlignmentChange={handlePdfAlignmentChange}
                onPdfDuplicate={handlePdfDuplicate}
                onEmojiChange={handleEmojiChange}
                onDragStart={enableDragDrop ? handleDragStart : undefined}
                onDragOver={undefined}
                onDrop={undefined}
                onColumnUpdate={handleColumnUpdate}
                onColumnWidthsUpdate={handleColumnWidthsUpdate}
                onCreateBlockAfterColumn={handleCreateBlockAfterColumn}
                onCreateBlockAfterToggle={handleCreateBlockAfterToggle}
                onCreateBlockAfterCallout={handleCreateBlockAfterCallout}
                onToggleHeading={handleToggleHeading}
                onToggleChildUpdate={handleToggleChildUpdate}
                onCalloutChildUpdate={handleCalloutChildUpdate}
                onTableDataUpdate={handleTableDataUpdate}
                onSlashMenu={handleSlashMenu}
                onCloseSlashMenu={handleCloseSlashMenu}
                slashMenuBlockId={menuState.blockId}
                onPlusClick={handlePlusClick}
                onDotsClick={dotsClickHandler}
                allBlocks={blocks}
                isSelected={selectedBlockIds.has(block.id)}
                onMouseDown={(e) => handleBlockMouseDown(e, index, block.id)}
                onMouseEnter={(e) => handleBlockMouseEnter(index, e)}
                isSelecting={isSelecting}
                selectedBlockIds={selectedBlockIds}
                onNestedBlockMouseDown={handleNestedBlockMouseDown}
                onNestedBlockMouseEnter={handleNestedBlockMouseEnter}
              />
            </div>
          );
        })}
        
        {/* Drop zone after last block */}
        {enableDragDrop && blocks.length > 0 && (
          <div
            className="h-8 w-full transition-all duration-200"
            onDragEnter={(e) => {
              e.preventDefault();
              handleDragOver(blocks.length);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              handleDragOver(blocks.length);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleDrop();
            }}
          >
            {dragState.overIndex === blocks.length && dragState.draggingIndex !== null && (
              <div className="h-0.5 bg-[#0086F4]/50 shadow-[0_0_8px_rgba(255,96,53,0.3)] animate-pulse w-full" />
            )}
          </div>
        )}
        
        {enableSlashMenu && menuState.visible && menuState.position && createPortal(
          <SlashMenu
            position={menuState.position}
            filter={menuState.filter}
            onSelect={handleMenuSelect}
            onAddLink={handleAddLinkInMenu}
            onClose={() => setMenuState({ visible: false, position: null, blockId: null, filter: '', triggerType: null, isInsideToggle: false, isNested: false })}
            isNested={menuState.isNested}
          />,
          document.body
        )}
        
        {enableActionMenu && actionMenu.visible && actionMenu.position && actionMenu.blockId && createPortal(
          <BlockActionMenu
            position={actionMenu.position}
            onClose={() => setActionMenu({ visible: false, position: null, blockId: null })}
            onDelete={handleBlockDelete}
            onDuplicate={handleBlockDuplicate}
            onTurnInto={handleBlockTurnInto}
            onColorChange={handleBlockColorChange}
            onAddLink={handleAddLinkInActionMenu}
            currentTextColor={actionMenuEffectiveTextColor}
            currentBackgroundColor={actionMenuBlock?.backgroundColor as BackgroundColor | undefined}
            isNested={actionMenu.isNested}
          />,
          document.body
        )}
        
        {enableSelectionMenu && showSelectionMenu && createPortal(
          <SelectionMenu
            onClose={() => setShowSelectionMenu(false)}
            onBlockTypeChange={handleSelectionMenuBlockTypeChange}
            onAddLink={openLinkModal}
            onFormatApplied={handleFormatApplied}
            currentBlockType={clipboardBlockType || currentBlockType}
            isInsideToggle={isInsideToggle}
            isInsideTable={isInsideTable}
          />,
          document.body
        )}
        
        {linkPasteMenu.visible && linkPasteMenu.position && createPortal(
          <LinkPasteMenu
            position={linkPasteMenu.position}
            url={linkPasteMenu.url}
            onSelect={handleLinkPasteMenuSelect}
            onDismiss={() =>
              setLinkPasteMenu({ visible: false, position: null, url: '', blockId: null, originalText: '' })
            }
          />,
          document.body
        )}
        
        {createPortal(
          <LinkModal
            isOpen={linkModal.isOpen}
            position={linkModal.position}
            initialUrl={linkModal.initialUrl}
            onConfirm={(url) => {
              if (linkModal.onConfirm) {
                linkModal.onConfirm(url);
              }
              closeLinkModal();
            }}
            onClose={closeLinkModal}
          />,
          document.body
        )}
      </div>

      {isSelecting && cursorPosition && selectionStartPos && createPortal(
        <div
          className="fixed pointer-events-none z-50 border-2 border-blue-500/40 bg-blue-400/15 rounded-lg"
          style={{
            left: Math.min(selectionStartPos.x, cursorPosition.x),
            top: Math.min(selectionStartPos.y, cursorPosition.y),
            width: Math.abs(cursorPosition.x - selectionStartPos.x),
            height: Math.abs(cursorPosition.y - selectionStartPos.y),
          }}
        />,
        document.body
      )}
    </>
  );
};

export const InlineEditor: React.FC<InlineEditorProps> = (props) => {
  return (
    <EditorProvider blocks={props.blocks} onChange={props.onChange || (() => {})}>
      <InlineEditorContent {...props} />
    </EditorProvider>
  );
};

