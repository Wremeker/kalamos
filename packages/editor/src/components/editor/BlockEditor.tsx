import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, GripVertical } from 'lucide-react';
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter } from '../ui/emoji-picker';
import { Block, BlockType, DrawingStroke, DrawingPoint, InlineComment } from '@/types/editor.ts';
import { RemoteDrawingState, ExerciseActiveUser, RemoteExerciseInteraction } from '@/hooks/editor/useLessonCollaboration.ts';
import type { ExerciseResultData } from '@/api/exerciseResults.ts';
import { BlockView } from './BlockView';
import { SlashMenu } from './SlashMenu';
import { SelectionMenu } from './SelectionMenu';
import { FixedToolbar } from './FixedToolbar';
import { LinkPasteMenu } from './LinkPasteMenu';
import { LinkModal } from './LinkModal';
import { CommentThread } from './CommentThread';
import { BlockActionMenu } from './BlockActionMenu';
import { TextColor, BackgroundColor } from '@/constants/colors.ts';
import {
  BLOCK_TYPE_EXERCISE,
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED
} from '@/constants/blockTypes.ts';
import { EditorProvider, useEditorContext } from '../../contexts/EditorContext';
import { useEditorHistory } from '@/hooks/editor/useEditorHistory.ts';
import { useMenuState } from '@/hooks/editor/useMenuState.ts';
import { useBlockOperations } from '@/hooks/editor/useBlockOperations.ts';
import { useDragAndDrop } from '@/hooks/editor/useDragAndDrop.ts';
import { useBlockSelection } from '@/hooks/editor/useBlockSelection.ts';
import { useLinkOperations } from '@/hooks/editor/useLinkOperations.ts';
import { useKeyboardHandlers } from '@/hooks/editor/useKeyboardHandlers.ts';
import { useClipboard } from '@/hooks/editor/useClipboard.ts';
import { useCommentOperations } from '@/hooks/editor/useCommentOperations.ts';
import { useToolbarOperations } from '@/hooks/editor/useToolbarOperations.ts';
import { findBlockLocation, createBlock, setCaretToStart, decodeHtmlEntities, inferWholeBlockInlineTextColor } from '@/utils/editorUtils.ts';
import { RemoteCursor } from './RemoteCursor';
import { useEditorCollaborationEmitters } from '@/hooks/editor/useEditorCollaborationEmitters.ts';
import { useFormattingCollaboration } from '@/hooks/editor/useFormattingCollaboration.ts';
import { useScrollLock } from '@/hooks/editor/useScrollLock.ts';
import { useMenuPosition } from '@/hooks/editor/useMenuPosition.ts';

function findTextNodeAtOffset(root: Node, targetOffset: number): { node: Node; offset: number } | null {
  if (root.nodeType === Node.TEXT_NODE) {
    const length = root.textContent?.length || 0;
    return { node: root, offset: Math.min(targetOffset, length) };
  }
  let currentOffset = 0;
  for (let i = 0; i < root.childNodes.length; i++) {
    const child = root.childNodes[i];
    const childLength = child.textContent?.length || 0;
    if (currentOffset + childLength >= targetOffset) {
      return findTextNodeAtOffset(child, targetOffset - currentOffset);
    }
    currentOffset += childLength;
  }
  if (root.childNodes.length > 0) {
    const lastChild = root.childNodes[root.childNodes.length - 1];
    if (lastChild.nodeType === Node.TEXT_NODE) {
      return { node: lastChild, offset: lastChild.textContent?.length || 0 };
    }
    return findTextNodeAtOffset(lastChild, lastChild.textContent?.length || 0);
  }
  return null;
}

interface RemoteCursorData {
  socketId: string;
  user: { id: string; name: string; color: string };
  position?: { blockId: string; offset: number };
  blockId?: string;
}

export interface LessonExerciseRef {
  id?: number;
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  newlyAddedBlockIds?: Set<string>;
  documentId?: string;
  enableCollaboration?: boolean;
  onBlocksChangeCollab?: (update: { blocks: Block[] }) => void;
  remoteCursors?: RemoteCursorData[];
  emitCursorPosition?: (blockId: string, offset: number) => void;
  isRemoteUpdate?: boolean;
  onSelectionChange?: (selectedBlockIds: Set<string>) => void;
  onExerciseBlockCreated?: (blockId: string) => void;
  disableExercises?: boolean;
  canDeleteExercises?: boolean;
  onExerciseDelete?: (exerciseDbId: number) => void;
  showToolbar?: boolean;
  toolbarVariant?: 'horizontal' | 'panel';
  remoteDrawingState?: RemoteDrawingState;
  emitDrawingStrokeProgress?: (blockId: string, points: DrawingPoint[], color: string, thickness: number) => void;
  emitDrawingStrokeComplete?: (blockId: string, stroke: DrawingStroke) => void;
  emitDrawingAction?: (blockId: string, strokes: DrawingStroke[]) => void;
  publicHash?: string;
  lessonExercises?: LessonExerciseRef[];
  exerciseSavedResults?: Record<number, ExerciseResultData>;
  onExerciseResult?: (exerciseId: number, result: Omit<ExerciseResultData, 'completedAt'>) => void;
  exerciseReadOnly?: boolean;
  exerciseActiveUsers?: Record<string, ExerciseActiveUser[]>;
  remoteExerciseInteractions?: Record<string, RemoteExerciseInteraction[]>;
  onExerciseInteractionChange?: (blockId: string, state: any) => void;
  onExerciseFocus?: (blockId: string) => void;
  onExerciseBlur?: (blockId: string) => void;
  scrollTopOffset?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddToHomework?: (blocks: Block[]) => void;
}

interface BlockEditorContentProps {
  documentId?: string;
  enableCollaboration?: boolean;
  onBlocksChangeCollab?: (update: { blocks: Block[] }) => void;
  remoteCursors?: RemoteCursorData[];
  emitCursorPosition?: (blockId: string, offset: number) => void;
  isRemoteUpdate?: boolean;
  onSelectionChange?: (selectedBlockIds: Set<string>) => void;
  onExerciseBlockCreated?: (blockId: string) => void;
  disableExercises?: boolean;
  canDeleteExercises?: boolean;
  onExerciseDelete?: (exerciseDbId: number) => void;
  showToolbar?: boolean;
  toolbarVariant?: 'horizontal' | 'panel';
  remoteDrawingState?: RemoteDrawingState;
  emitDrawingStrokeProgress?: (blockId: string, points: DrawingPoint[], color: string, thickness: number) => void;
  emitDrawingStrokeComplete?: (blockId: string, stroke: DrawingStroke) => void;
  emitDrawingAction?: (blockId: string, strokes: DrawingStroke[]) => void;
  publicHash?: string;
  lessonExercises?: LessonExerciseRef[];
  exerciseSavedResults?: Record<number, ExerciseResultData>;
  onExerciseResult?: (exerciseId: number, result: Omit<ExerciseResultData, 'completedAt'>) => void;
  exerciseReadOnly?: boolean;
  exerciseActiveUsers?: Record<string, ExerciseActiveUser[]>;
  remoteExerciseInteractions?: Record<string, RemoteExerciseInteraction[]>;
  onExerciseInteractionChange?: (blockId: string, state: any) => void;
  onExerciseFocus?: (blockId: string) => void;
  onExerciseBlur?: (blockId: string) => void;
  scrollTopOffset?: number;
  onUndo?: () => void;
  onRedo?: () => void;
  onAddToHomework?: (blocks: Block[]) => void;
}

const BlockEditorContent: React.FC<BlockEditorContentProps> = ({ documentId, enableCollaboration = false, onBlocksChangeCollab, remoteCursors = [], emitCursorPosition, isRemoteUpdate = false, onSelectionChange, onExerciseBlockCreated: _onExerciseBlockCreated, disableExercises = false, canDeleteExercises = false, onExerciseDelete, showToolbar = false, toolbarVariant = 'panel', remoteDrawingState, emitDrawingStrokeProgress, emitDrawingStrokeComplete, emitDrawingAction, publicHash, lessonExercises, exerciseSavedResults, onExerciseResult, exerciseReadOnly, exerciseActiveUsers, remoteExerciseInteractions, onExerciseInteractionChange, onExerciseFocus, onExerciseBlur, scrollTopOffset, onUndo, onRedo, onAddToHomework }) => {
  const { t } = useTranslation();
  const { editorRef, blocksContainerRef, blocks } = useEditorContext();
  const editorHistoryOptions = useMemo(() => (
    onUndo && onRedo ? { onUndo, onRedo } : undefined
  ), [onUndo, onRedo]);
  const { handleChange, handleUndo, handleRedo } = useEditorHistory(editorHistoryOptions);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const blocksVersionRef = useRef(0);
  const prevBlocksRef = useRef(blocks);
  if (prevBlocksRef.current !== blocks) {
    prevBlocksRef.current = blocks;
    blocksVersionRef.current++;
  }
  const blocksVersion = blocksVersionRef.current;

  const exerciseBlockIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    let exIdx = 0;
    for (const b of blocks) {
      if (b.type === BLOCK_TYPE_EXERCISE) {
        map.set(b.id, exIdx);
        exIdx++;
      }
    }
    return map;
  }, [blocks]);

  useEditorCollaborationEmitters({
    blocks,
    editorRef,
    enableCollaboration,
    documentId,
    isRemoteUpdate,
    onBlocksChangeCollab,
    emitCursorPosition,
  });

  const {
    menuState,
    setMenuState,
    showSelectionMenu,
    setShowSelectionMenu,
    linkPasteMenu,
    setLinkPasteMenu,
    actionMenu,
    setActionMenu,
    linkModal,
    handleActionMenuClose,
    handleDotsClick,
    openLinkModal,
    closeLinkModal,
  } = useMenuState();

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
  } = useBlockSelection({ handleChange, scrollTopOffset, onExerciseDelete });

  // Notify parent about selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedBlockIds);
    }
  }, [selectedBlockIds, onSelectionChange]);

  const {
    activeCommentBlockId,
    activeInlineCommentId,
    activeInlineCommentBlockId,
    handleOpenComments,
    handleOpenInlineComment,
    handleAddComment,
    handleDeleteComment,
    handleResolveComment,
    handleCloseComments,
    handleBlockComment: handleCommentFromMenu,
    handleAddInlineComment,
    handleDeleteInlineComment,
    handleResolveInlineComment,
    handleRemoveInlineCommentThread,
    handleCloseInlineComment,
  } = useCommentOperations({
    blocks,
    handleChange,
    actionMenuBlockId: actionMenu.blockId,
  });

  const {
    uploadingBlockIds,
    videoUploadProgress,
    updateBlock,
    handleMenuSelect,
    handleCheckToggle,
    handleImageUpload,
    handleImageDelete,
    handleImageResize,
    handleImageAlignmentChange,
    handleBlockUpdate,
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
    handlePlusClick,
    handleBlockDelete,
    handleBlockDuplicate,
    handleBlockTurnInto,
    handleBlockColorChange,
    handleBlockAlignmentChange: _handleBlockAlignmentChange,
    handleSelectionMenuBlockTypeChange,
    handleSelectionMenuAlignmentChange: _handleSelectionMenuAlignmentChange,
    handleColumnUpdate,
    handleColumnWidthsUpdate,
    handleCreateBlockAfterColumn,
    handleCreateBlockAfterToggle,
    handleCreateBlockAfterCallout,
    handleToggleHeading,
    handleToggleChildUpdate,
    handleCalloutChildUpdate,
    handleDissolveCallout,
    handleTableDataUpdate,
  } = useBlockOperations({
    handleChange,
    setMenuState,
    menuState,
    actionMenu,
    selectedBlockIds,
    setSelectedBlockIds,
    publicHash,
  });

  const handleImageDeleteWithExercise = useCallback(
    (id: string) => {
      if (onExerciseDelete) {
        const location = findBlockLocation(id, blocks);
        if (location.block?.type === 'exercise' && location.block.exerciseDbId) {
          onExerciseDelete(location.block.exerciseDbId);
        }
      }
      handleImageDelete(id);
    },
    [handleImageDelete, onExerciseDelete, blocks]
  );

  const handleBlockDeleteWithExercise = useCallback(() => {
    if (onExerciseDelete && actionMenu.blockId) {
      const location = findBlockLocation(actionMenu.blockId, blocks);
      if (location.block?.type === 'exercise' && location.block.exerciseDbId) {
        onExerciseDelete(location.block.exerciseDbId);
      }
    }
    handleBlockDelete();
  }, [handleBlockDelete, onExerciseDelete, actionMenu.blockId, blocks]);

  const handleSlashMenu = useCallback((blockId: string, filter: string, position: { x: number; y: number }) => {
    const location = findBlockLocation(blockId, blocks);
    setMenuState({
      visible: true,
      position,
      blockId,
      filter,
      triggerType: 'slash',
      isInsideToggle: location.isToggleChild || false,
      isNested: location.isNested,
    });
  }, [setMenuState, blocks]);

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
  }, [setMenuState]);

  const [emojiPickerState, setEmojiPickerState] = useState<{
    visible: boolean;
    position: { x: number; y: number } | null;
    blockId: string | null;
  }>({ visible: false, position: null, blockId: null });
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleEmojiPickerOpen = useCallback(() => {
    if (!menuState.blockId) return;
    const blockId = menuState.blockId;
    const position = menuState.position;

    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    let newText = block.text;
    if (menuState.triggerType === 'slash') {
      const slashIndex = newText.lastIndexOf('/');
      newText = newText.slice(0, slashIndex) + newText.slice(slashIndex + 1 + menuState.filter.length);
    }

    const newBlocks = [...blocks];
    if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = { ...block, text: newText };
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = { ...block, text: newText };
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = { ...block, text: newText };
    }
    handleChange(newBlocks);

    setMenuState({
      visible: false,
      position: null,
      blockId: null,
      filter: '',
      triggerType: null,
      isInsideToggle: false,
      isNested: false,
    });
    setEmojiPickerState({ visible: true, position, blockId });
  }, [menuState, blocks, handleChange, setMenuState]);

  const handleEmojiPickerSelect = useCallback((emojiData: { emoji: string }) => {
    const { blockId } = emojiPickerState;
    if (!blockId) return;

    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    const element = editorRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;

    const sel = window.getSelection();
    let insertOffset = block.text.length;
    if (element && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (element.contains(range.startContainer)) {
        insertOffset = range.startOffset;
      }
    }

    const newText = block.text.slice(0, insertOffset) + emojiData.emoji + block.text.slice(insertOffset);
    const newBlocks = [...blocks];

    if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = { ...block, text: newText };
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = { ...block, text: newText };
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = { ...block, text: newText };
    }

    handleChange(newBlocks);
    setEmojiPickerState({ visible: false, position: null, blockId: null });

    setTimeout(() => {
      if (element) {
        element.focus();
        const newSel = window.getSelection();
        if (newSel) {
          const newRange = document.createRange();
          const targetOffset = insertOffset + emojiData.emoji.length;
          const result = findTextNodeAtOffset(element, targetOffset);
          if (result) {
            newRange.setStart(result.node, result.offset);
            newRange.collapse(true);
            newSel.removeAllRanges();
            newSel.addRange(newRange);
          }
        }
      }
    }, 0);
  }, [emojiPickerState, blocks, handleChange, editorRef]);

  const handleCloseEmojiPicker = useCallback(() => {
    setEmojiPickerState({ visible: false, position: null, blockId: null });
  }, []);

  useEffect(() => {
    if (!emojiPickerState.visible) return;
    const handleScroll = (e: Event) => {
      if (emojiPickerRef.current && emojiPickerRef.current.contains(e.target as Node)) return;
      setEmojiPickerState({ visible: false, position: null, blockId: null });
    };
    const handleResize = () => setEmojiPickerState({ visible: false, position: null, blockId: null });
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [emojiPickerState.visible]);

  const handleGapClick = useCallback((insertIndex: number) => {
    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [...blocks];
    newBlocks.splice(insertIndex, 0, newBlock);
    handleChange(newBlocks);

    setTimeout(() => {
      const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);
      }
    }, 0);
  }, [blocks, handleChange, editorRef]);

  const handleImageDuplicate = useCallback((blockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const duplicatedBlock = { 
      ...block, 
      id: `block-${Date.now()}-${Math.random()}` 
    };

    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);
    handleChange(newBlocks);
  }, [blocks, handleChange]);

  const handleEmojiChange = useCallback((blockId: string, emoji: string) => {
    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    const newBlocks = [...blocks];

    if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = { ...block, emoji };
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = { ...block, emoji };
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = { ...block, emoji };
    }

    handleChange(newBlocks);
  }, [blocks, handleChange]);

  const {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
  } = useDragAndDrop({ handleChange, scrollTopOffset });

  const [columnDropZone, setColumnDropZone] = useState<{
    blockIndex: number;
    side: 'left' | 'right';
  } | null>(null);

  const handleDropBlockIntoColumn = useCallback((draggedBlockId: string, columnBlockId: string, columnIndex: number) => {
    // Don't drop a block into itself
    if (draggedBlockId === columnBlockId) return;

    // Determine which blocks to move: all selected if dragged block is part of selection, otherwise just the dragged one
    const blockIdsToMove = selectedBlockIds.has(draggedBlockId) && selectedBlockIds.size > 1
      ? new Set(selectedBlockIds)
      : new Set([draggedBlockId]);

    // Don't move the column block itself into its own column
    blockIdsToMove.delete(columnBlockId);
    if (blockIdsToMove.size === 0) return;

    // Collect blocks to move in their original order, filtering out column blocks
    const columnTypes = [BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5];
    const blocksToMove = blocks.filter(b => 
      blockIdsToMove.has(b.id) && !columnTypes.includes(b.type)
    );
    if (blocksToMove.length === 0) return;

    const columnBlockIndex = blocks.findIndex(b => b.id === columnBlockId);
    if (columnBlockIndex === -1) return;

    const columnBlock = blocks[columnBlockIndex];
    if (!columnBlock.columns) return;

    // Remove moved blocks from top-level
    const movedIds = new Set(blocksToMove.map(b => b.id));
    const newBlocks = blocks.filter(b => !movedIds.has(b.id));

    // Find the column block in the new array (index may have shifted)
    const newColumnBlockIndex = newBlocks.findIndex(b => b.id === columnBlockId);
    if (newColumnBlockIndex === -1) return;

    // Add moved blocks to the target column
    const updatedColumnBlock = { ...newBlocks[newColumnBlockIndex] };
    const updatedColumns = (updatedColumnBlock.columns || []).map(col => [...col]);
    updatedColumns[columnIndex] = [...updatedColumns[columnIndex], ...blocksToMove];
    updatedColumnBlock.columns = updatedColumns;

    newBlocks[newColumnBlockIndex] = updatedColumnBlock;

    handleChange(newBlocks);
    handleDragEnd();
    setSelectedBlockIds(new Set());
  }, [blocks, handleChange, handleDragEnd, selectedBlockIds, setSelectedBlockIds]);

  const handleDropAsColumns = useCallback(() => {
    if (!columnDropZone || dragState.draggingIndex === null) return;

    const dragIndex = dragState.draggingIndex;
    const targetIndex = columnDropZone.blockIndex;

    if (dragIndex === targetIndex) return;

    const draggedBlock = blocks[dragIndex];
    const targetBlock = blocks[targetIndex];
    if (!draggedBlock || !targetBlock) return;

    const ineligibleTypes = [BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5, BLOCK_TYPE_EXERCISE];
    if (ineligibleTypes.includes(draggedBlock.type) || ineligibleTypes.includes(targetBlock.type)) {
      setColumnDropZone(null);
      return;
    }

    const leftBlock = columnDropZone.side === 'left' ? draggedBlock : targetBlock;
    const rightBlock = columnDropZone.side === 'left' ? targetBlock : draggedBlock;

    const columnsBlock = createBlock(BLOCK_TYPE_COLUMNS2, '');
    columnsBlock.columns = [[{ ...leftBlock }], [{ ...rightBlock }]];

    const indicesToRemove = new Set([dragIndex, targetIndex]);
    const newBlocks: Block[] = [];

    for (let i = 0; i < blocks.length; i++) {
      if (i === targetIndex) {
        newBlocks.push(columnsBlock);
      } else if (!indicesToRemove.has(i)) {
        newBlocks.push(blocks[i]);
      }
    }

    handleChange(newBlocks);
    handleDragEnd();
    setColumnDropZone(null);
    setSelectedBlockIds(new Set());

    const focusBlockId = leftBlock.id;
    setTimeout(() => {
      const el = editorRef.current?.querySelector(`[data-block-id="${focusBlockId}"]`) as HTMLElement;
      if (el) {
        el.focus();
        setCaretToStart(el);
      }
    }, 0);
  }, [blocks, dragState, columnDropZone, handleChange, handleDragEnd, setSelectedBlockIds, editorRef]);

  const ghostRef = useRef<HTMLDivElement>(null);

  const getBlockPreviewText = useCallback((block: Block): string => {
    if (!block) return '';
    const text = decodeHtmlEntities((block.text || '').replace(/<[^>]*>/g, ''));
    if (text.length > 60) return text.slice(0, 60) + '...';
    if (text.length > 0) return text;
    if (block.type === BLOCK_TYPE_EXERCISE) return 'Exercise';
    if (block.imageUrl || block.imageFile) return 'Image';
    if (block.videoUrl) return 'Video';
    if (block.audioUrl) return 'Audio';
    if (block.pdfUrl) return 'PDF';
    if (block.columns) return 'Columns';
    if (block.tableData) return 'Table';
    return 'Block';
  }, []);

  const handleGhostPosition = useCallback((e: React.DragEvent) => {
    if (ghostRef.current && dragState.draggingIndex !== null) {
      ghostRef.current.style.left = `${e.clientX + 16}px`;
      ghostRef.current.style.top = `${e.clientY - 16}px`;
    }
  }, [dragState.draggingIndex]);

  const {
    handleAddLinkInActionMenu,
    handleAddLinkInMenu,
    handleLinkPasteMenuSelect,
    handleAddLinkForBlock,
  } = useLinkOperations({
    handleChange,
    menuState,
    setMenuState,
    actionMenu,
    setActionMenu,
    linkPasteMenu,
    setLinkPasteMenu,
    openLinkModal,
  });

  const { handleKeyDown } = useKeyboardHandlers({
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
  });

  const { currentBlockType, isInsideToggle, isInsideTable } = useClipboard({
    handleChange,
    setLinkPasteMenu,
    setShowSelectionMenu,
  });

  const { handleFormatApplied } = useFormattingCollaboration({
    blocks,
    updateBlock,
  });

  // Toolbar operations (for inline fixed toolbar)
  const {
    handleToolbarBlockTypeChange: toolbarBlockTypeChange,
    handleToolbarAlignmentChange: toolbarAlignmentChange,
    handleToolbarAddImage: toolbarAddImage,
  } = useToolbarOperations({
    blocks,
    handleChange,
    editorContainerRef: editorRef,
    openLinkModal,
    selectedBlockIds,
  });

  const focusedBlock = blocks.find(b => b.id === focusedBlockId);

  const actionMenuBlock = actionMenu.blockId ? blocks.find((b) => b.id === actionMenu.blockId) : undefined;
  const actionMenuEffectiveTextColor = (
    actionMenuBlock
      ? inferWholeBlockInlineTextColor(actionMenuBlock.text || '') ?? actionMenuBlock.textColor ?? 'default'
      : 'default'
  ) as TextColor;

  const handleToolbarBlockTypeChange = useCallback((type: BlockType) => {
    if (!focusedBlockId) return;
    toolbarBlockTypeChange(type, focusedBlockId);
  }, [toolbarBlockTypeChange, focusedBlockId]);

  const handleToolbarAlignmentChange = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (!focusedBlockId) return;
    toolbarAlignmentChange(alignment, focusedBlockId);
  }, [toolbarAlignmentChange, focusedBlockId]);

  const handleToolbarAddLink = useCallback(() => {
    if (!focusedBlockId) return;
    handleAddLinkForBlock(focusedBlockId);
  }, [focusedBlockId, handleAddLinkForBlock]);

  const handleToolbarAddImage = useCallback(() => {
    if (!focusedBlockId) return;
    toolbarAddImage(focusedBlockId);
  }, [focusedBlockId, toolbarAddImage]);

  const handleToolbarAddEmoji = useCallback(() => {
    if (!focusedBlockId) return;
    const blockEl = editorRef.current?.querySelector(`[data-block-id="${focusedBlockId}"]`) as HTMLElement | null;
    let position = { x: 100, y: 100 };
    if (blockEl) {
      const rect = blockEl.getBoundingClientRect();
      position = { x: rect.left, y: rect.bottom };
    }
    setEmojiPickerState({ visible: true, position, blockId: focusedBlockId });
  }, [focusedBlockId, editorRef]);

  // Track focused block for toolbar
  React.useEffect(() => {
    if (!showToolbar) return;

    const handleFocusChange = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Only track focus within the editor
      if (!editorRef.current?.contains(target)) return;

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
        if (isToolbarClick) return;
      }

      if (!relatedTarget || !editorRef.current?.contains(relatedTarget)) {
        setTimeout(() => {
          const activeElement = document.activeElement;
          if (!activeElement || !editorRef.current?.contains(activeElement)) {
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
  }, [showToolbar, editorRef]);

  const handleSelectionComment = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString().trim();

    let node: Node | null = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let blockElement: HTMLElement | null = node as HTMLElement;
    while (blockElement && !blockElement.hasAttribute('data-block-id')) {
      blockElement = blockElement.parentElement;
    }

    if (!blockElement) {
      // Fallback to block-container approach for block comment
      const element = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : range.commonAncestorContainer as HTMLElement;
      const blockContainer = element?.closest('[id^="block-container-"]');
      if (blockContainer) {
        const blockId = blockContainer.id.replace('block-container-', '');
        handleOpenComments(blockId);
        setShowSelectionMenu(false);
      }
      return;
    }

    const blockId = blockElement.getAttribute('data-block-id')!;

    // If no text is selected (collapsed), open block comment
    if (!selectedText || range.collapsed) {
      handleOpenComments(blockId);
      setShowSelectionMenu(false);
      return;
    }

    // Create inline comment: wrap selection in <mark>
    const inlineCommentId = `ic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const mark = document.createElement('mark');
      mark.setAttribute('data-inline-comment-id', inlineCommentId);
      mark.className = 'inline-comment-highlight';
      range.surroundContents(mark);
    } catch {
      // If surroundContents fails (cross-element selection), extract and wrap
      const fragment = range.extractContents();
      const mark = document.createElement('mark');
      mark.setAttribute('data-inline-comment-id', inlineCommentId);
      mark.className = 'inline-comment-highlight';
      mark.appendChild(fragment);
      range.insertNode(mark);
    }

    // Read the updated HTML from the DOM (now contains the <mark> tag)
    const updatedText = blockElement.innerHTML || '';

    // Perform a single atomic state update: update text + add inlineComment entry
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex !== -1) {
      const block = blocks[blockIndex];
      const newInlineComment: InlineComment = {
        id: inlineCommentId,
        highlightedText: selectedText,
        comments: [],
      };
      const newBlocks = [...blocks];
      newBlocks[blockIndex] = {
        ...block,
        text: updatedText,
        inlineComments: [...(block.inlineComments || []), newInlineComment],
      };
      handleChange(newBlocks);
    }

    // Open the inline comment thread
    handleOpenInlineComment(blockId, inlineCommentId);

    selection.removeAllRanges();
    setShowSelectionMenu(false);
  };

  // Click handler for inline comment <mark> elements
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const handleMarkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const markEl = target.closest('mark[data-inline-comment-id]') as HTMLElement | null;
      if (!markEl) return;

      const inlineCommentId = markEl.getAttribute('data-inline-comment-id');
      if (!inlineCommentId) return;

      // Find the block this mark belongs to
      let blockElement: HTMLElement | null = markEl;
      while (blockElement && !blockElement.hasAttribute('data-block-id')) {
        blockElement = blockElement.parentElement;
      }
      if (!blockElement) return;

      const blockId = blockElement.getAttribute('data-block-id')!;
      e.stopPropagation();
      handleOpenInlineComment(blockId, inlineCommentId);
    };

    container.addEventListener('click', handleMarkClick);
    return () => container.removeEventListener('click', handleMarkClick);
  }, [editorRef, handleOpenInlineComment]);

  // Get the active inline comment data and position for rendering the popover
  const activeInlineComment = (() => {
    if (!activeInlineCommentId || !activeInlineCommentBlockId) return null;
    const block = blocks.find((b) => b.id === activeInlineCommentBlockId);
    if (!block) return null;
    const ic = (block.inlineComments || []).find((c) => c.id === activeInlineCommentId);
    if (!ic) return null;
    return { block, inlineComment: ic };
  })();

  const [inlineCommentPopoverPos, setInlineCommentPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!activeInlineCommentId) {
      setInlineCommentPopoverPos(null);
      return;
    }
    const markEl = editorRef.current?.querySelector(
      `mark[data-inline-comment-id="${activeInlineCommentId}"]`
    ) as HTMLElement | null;
    if (!markEl) {
      setInlineCommentPopoverPos(null);
      return;
    }
    const markRect = markEl.getBoundingClientRect();
    setInlineCommentPopoverPos({
      top: markRect.bottom + 4,
      left: markRect.left + markRect.width / 2,
    });
  }, [activeInlineCommentId, editorRef, blocks]);

  // Cleanup orphaned inline comments: remove inlineComment entries whose <mark> no longer exists in block text
  useEffect(() => {
    let hasChanges = false;
    const newBlocks = blocks.map((block) => {
      if (!block.inlineComments || block.inlineComments.length === 0) return block;
      const remainingComments = block.inlineComments.filter((ic) => {
        const markPattern = `data-inline-comment-id="${ic.id}"`;
        return block.text.includes(markPattern);
      });
      if (remainingComments.length !== block.inlineComments.length) {
        hasChanges = true;
        return { ...block, inlineComments: remainingComments.length > 0 ? remainingComments : undefined };
      }
      return block;
    });
    if (hasChanges) {
      handleChange(newBlocks);
    }
  }, [blocks.map(b => b.text).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const { menuTop: emojiMenuTop, menuLeft: emojiMenuLeft } = useMenuPosition({
    position: emojiPickerState.position,
    menuHeight: 420,
    menuWidth: 370,
    offset: 16,
  });

  useScrollLock(menuState.visible || actionMenu.visible || emojiPickerState.visible);

  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    const handleEditorKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
    };

    container.addEventListener('keydown', handleEditorKeyDown);
    return () => container.removeEventListener('keydown', handleEditorKeyDown);
  }, [editorRef, handleUndo, handleRedo]);

  const toolbarElement = showToolbar ? (
    <FixedToolbar
      variant={toolbarVariant}
      contentRef={editorRef}
      currentBlockType={focusedBlock?.type || null}
      currentAlignment={focusedBlock?.alignment}
      onBlockTypeChange={handleToolbarBlockTypeChange}
      onFormatApplied={handleFormatApplied}
      onAlignmentChange={handleToolbarAlignmentChange}
      onAddLink={handleToolbarAddLink}
      onAddImage={handleToolbarAddImage}
      onAddEmoji={handleToolbarAddEmoji}
      {...(!onUndo && { onUndo: handleUndo, onRedo: handleRedo })}
      stickyToolbar
    />
  ) : null;

  const mobileToolbarElement = showToolbar && toolbarVariant === 'panel' ? (
    <FixedToolbar
      variant="horizontal"
      contentRef={editorRef}
      currentBlockType={focusedBlock?.type || null}
      currentAlignment={focusedBlock?.alignment}
      onBlockTypeChange={handleToolbarBlockTypeChange}
      onFormatApplied={handleFormatApplied}
      onAlignmentChange={handleToolbarAlignmentChange}
      onAddLink={handleToolbarAddLink}
      onAddImage={handleToolbarAddImage}
      onAddEmoji={handleToolbarAddEmoji}
      {...(!onUndo && { onUndo: handleUndo, onRedo: handleRedo })}
      stickyToolbar={false}
      className="xl:hidden"
    />
  ) : null;

  return (
    <>
      {toolbarVariant === 'panel' && toolbarElement}
    <div className="relative text-lg min-h-screen w-full max-w-full overflow-x-hidden" ref={editorRef} data-editor-content onMouseDown={handleContainerMouseDown} onDragOver={handleGhostPosition}>
      {toolbarVariant === 'horizontal' && toolbarElement}
      {mobileToolbarElement}
      {enableCollaboration && remoteCursors.length > 0 && (
        <>
          {remoteCursors
            .filter(cursor => {
              if (!cursor.blockId || !cursor.position) return false;
              // Check the block still exists and is not an exercise
              // Search top-level blocks first, then nested (columns, toggles, callouts)
              let block = blocks.find(b => b.id === cursor.blockId);
              if (!block) {
                for (const b of blocks) {
                  if (b.columns) {
                    for (const col of b.columns) {
                      const found = col.find(cb => cb.id === cursor.blockId);
                      if (found) { block = found; break; }
                    }
                  }
                  if (!block && b.children) {
                    const found = b.children.find(cb => cb.id === cursor.blockId);
                    if (found) { block = found; }
                  }
                  if (block) break;
                }
              }
              if (!block) return false;
              if (block.type === BLOCK_TYPE_EXERCISE) return false;
              return true;
            })
            .map((cursor) => (
              <RemoteCursor 
                key={cursor.socketId}
                user={cursor.user} 
                blockId={cursor.blockId!}
                position={cursor.position!}
                blocksVersion={blocksVersion}
              />
            ))}
        </>
      )}
      
      <div 
        className={`pt-4 px-0 sm:px-8 md:px-16 pb-48 sm:pb-64 md:pb-96 ${isSelecting ? 'select-none' : ''}`} 
        ref={blocksContainerRef}
        onDragOver={(e) => {
          if (dragState.draggingIndex !== null) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }
        }}
        onDrop={(e) => {
          if (dragState.draggingIndex !== null) {
            e.preventDefault();
            setColumnDropZone(null);
            handleDrop();
          }
        }}
      >
        {blocks.map((block, index) => {
          const isExercise = block.type === BLOCK_TYPE_EXERCISE;
          const isColumnBlock = [BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5].includes(block.type);
          const isExerciseReadOnly = disableExercises && isExercise;
          const hasComments = !isExercise && block.comments && block.comments.length > 0;
          const isShowingComments = !isExercise && activeCommentBlockId === block.id;
          const firstComment = block.comments && block.comments.length > 0 
            ? block.comments[0] 
            : null;
          const commentAuthorColor = firstComment?.authorColor;
          
          const isHovered = hoveredBlockId === block.id;
          const isDragging = dragState.draggingIndex === index;
          const isColumnDropTarget = columnDropZone?.blockIndex === index;
          const isDragOver = dragState.overIndex === index && dragState.draggingIndex !== index && !isColumnDropTarget;
          const draggedBlockType = dragState.draggingIndex !== null ? blocks[dragState.draggingIndex]?.type : null;
          const canTargetForColumns = dragState.draggingIndex !== null
            && dragState.draggingIndex !== index
            && !isColumnBlock
            && block.type !== BLOCK_TYPE_EXERCISE
            && !!draggedBlockType
            && ![BLOCK_TYPE_COLUMNS2, BLOCK_TYPE_COLUMNS3, BLOCK_TYPE_COLUMNS4, BLOCK_TYPE_COLUMNS5, BLOCK_TYPE_EXERCISE].includes(draggedBlockType);
          
          const prevBlock = index > 0 ? blocks[index - 1] : null;
          const isListBlock = (b: Block) => b.type === BLOCK_TYPE_BULLETED || b.type === BLOCK_TYPE_NUMBERED;
          const isBetweenListBlocks = prevBlock !== null && isListBlock(prevBlock) && isListBlock(block);

          return (
            <React.Fragment key={block.id}>
              {index > 0 && !isBetweenListBlocks && (
                <div
                  className="group/gap relative cursor-pointer"
                  style={{ height: '14px' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => handleGapClick(index)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    handleDragOver(index);
                    setColumnDropZone(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setColumnDropZone(null);
                    handleDrop();
                  }}
                >
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] rounded-full opacity-0 group-hover/gap:opacity-100 bg-blue-400/40 dark:bg-blue-500/40 transition-opacity duration-200" />
                </div>
              )}
              <div 
                className={`relative ${hasComments ? 'pr-12' : ''} transition-all duration-200 ease-out ${
                  isShowingComments ? 'z-[9999]' : ''
                } ${
                  isDragging 
                    ? 'opacity-30 scale-[0.98] rounded-lg ring-2 ring-[#0086F4]/30 dark:ring-[#0086F4]/20' 
                    : 'opacity-100 scale-100'
                }`} 
                id={`block-container-${block.id}`}
              onDragEnter={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (canTargetForColumns) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const threshold = rect.width * 0.3;
                  if (x < threshold) {
                    setColumnDropZone({ blockIndex: index, side: 'left' });
                    return;
                  } else if (x > rect.width - threshold) {
                    setColumnDropZone({ blockIndex: index, side: 'right' });
                    return;
                  }
                }
                setColumnDropZone(null);
                handleDragOver(index);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (canTargetForColumns) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const threshold = rect.width * 0.3;
                  if (x < threshold) {
                    setColumnDropZone({ blockIndex: index, side: 'left' });
                    return;
                  } else if (x > rect.width - threshold) {
                    setColumnDropZone({ blockIndex: index, side: 'right' });
                    return;
                  }
                }
                setColumnDropZone(null);
                handleDragOver(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (columnDropZone && columnDropZone.blockIndex === index) {
                  handleDropAsColumns();
                } else {
                  setColumnDropZone(null);
                  handleDrop();
                }
              }}
              onDragEnd={() => {
                handleDragEnd();
                setColumnDropZone(null);
              }}
            >
              {/* Transparent overlay to capture drag events over video/iframe/img elements */}
              {/* Skip overlay for column blocks so drag events reach column drop handlers */}
              {dragState.draggingIndex !== null && dragState.draggingIndex !== index && !isColumnBlock && (
                <div className="absolute inset-0 z-[50]" />
              )}
              {isColumnDropTarget && columnDropZone && (
                <div className="absolute inset-0 z-[55] pointer-events-none flex rounded-lg overflow-hidden animate-in fade-in duration-150">
                  <div className={`w-1/2 transition-all duration-150 rounded-l-lg ${
                    columnDropZone.side === 'left' 
                      ? 'bg-[#0086F4]/10 ring-2 ring-inset ring-[#0086F4]/40' 
                      : ''
                  }`} />
                  <div className="w-0.5 bg-[#0086F4]/40 flex-shrink-0" />
                  <div className={`w-1/2 transition-all duration-150 rounded-r-lg ${
                    columnDropZone.side === 'right' 
                      ? 'bg-[#0086F4]/10 ring-2 ring-inset ring-[#0086F4]/40' 
                      : ''
                  }`} />
                </div>
              )}
              {isDragOver && (
                <div className="flex items-center gap-0 mb-1 animate-in fade-in duration-150">
                  <div className="w-2 h-2 rounded-full bg-[#0086F4] flex-shrink-0 shadow-[0_0_6px_rgba(0,134,244,0.5)]" />
                  <div className="flex-1 h-[2px] bg-[#0086F4]/60 rounded-full" />
                </div>
              )}
              <BlockView
                block={block}
                index={index}
                isFirst={index === 0}
                isUploading={uploadingBlockIds.has(block.id)}
                onUpdate={isExerciseReadOnly ? (() => {}) : updateBlock}
                onKeyDown={handleKeyDown}
                onCheckToggle={handleCheckToggle}
                onUpdateBlock={handleBlockUpdate}
                onImageUpload={handleImageUpload}
                onImageDelete={(isExerciseReadOnly && !canDeleteExercises) ? undefined : handleImageDeleteWithExercise}
                onImageDuplicate={handleImageDuplicate}
                onImageResize={handleImageResize}
                onImageAlignmentChange={handleImageAlignmentChange}
                onDrawingUpdate={handleDrawingUpdate}
                onDrawingStrokeProgress={emitDrawingStrokeProgress}
                onDrawingStrokeComplete={emitDrawingStrokeComplete}
                onDrawingAction={emitDrawingAction}
                remoteDrawingState={remoteDrawingState}
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
                onDragStart={handleDragStart}
                onDragOver={undefined}
                onDrop={undefined}
                onPlusClick={handlePlusClick}
                onDotsClick={handleDotsClick}
                onColumnUpdate={handleColumnUpdate}
                onColumnWidthsUpdate={handleColumnWidthsUpdate}
                onCreateBlockAfterColumn={handleCreateBlockAfterColumn}
                onCreateBlockAfterToggle={handleCreateBlockAfterToggle}
                onCreateBlockAfterCallout={handleCreateBlockAfterCallout}
                onDissolveCallout={handleDissolveCallout}
                onToggleHeading={handleToggleHeading}
                onToggleChildUpdate={handleToggleChildUpdate}
                onCalloutChildUpdate={handleCalloutChildUpdate}
                onTableDataUpdate={handleTableDataUpdate}
                onSlashMenu={handleSlashMenu}
                onCloseSlashMenu={handleCloseSlashMenu}
                slashMenuBlockId={menuState.blockId}
                allBlocks={blocks}
                isSelected={selectedBlockIds.has(block.id)}
                isSelecting={isSelecting}
                onMouseDown={(e) => handleBlockMouseDown(e, index, block.id)}
                onMouseEnter={(e) => handleBlockMouseEnter(index, e)}
                selectedBlockIds={selectedBlockIds}
                onNestedBlockMouseDown={handleNestedBlockMouseDown}
                onNestedBlockMouseEnter={handleNestedBlockMouseEnter}
                onDropBlockIntoColumn={handleDropBlockIntoColumn}
                {...(isExercise && lessonExercises ? (() => {
                  const exIdx = exerciseBlockIndexMap.get(block.id);
                  const exId = exIdx !== undefined ? lessonExercises[exIdx]?.id : undefined;
                  return {
                    exerciseId: exId,
                    exerciseSavedResult: exId ? exerciseSavedResults?.[exId] : undefined,
                    onExerciseResultSubmit: exId && onExerciseResult
                      ? (result: Omit<ExerciseResultData, 'completedAt'>) => onExerciseResult(exId, result)
                      : undefined,
                    exerciseReadOnly,
                  };
                })() : {})}
                {...(isExercise ? {
                  activeExerciseUsers: exerciseActiveUsers?.[block.id],
                  remoteExerciseInteractions: remoteExerciseInteractions?.[block.id],
                  onExerciseInteractionChange: onExerciseInteractionChange
                    ? (state: any) => onExerciseInteractionChange(block.id, state)
                    : undefined,
                  onExerciseFocus: onExerciseFocus
                    ? () => onExerciseFocus(block.id)
                    : undefined,
                  onExerciseBlur: onExerciseBlur
                    ? () => onExerciseBlur(block.id)
                    : undefined,
                } : {})}
              />
              
              {hasComments && !isShowingComments && block.comments && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenComments(block.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute right-0 md:right-[-20px] top-1/2 -translate-y-1/2 px-1.5 md:px-2 py-1 md:py-1.5 rounded-full flex items-center justify-center gap-1 transition-all text-white hover:opacity-80"
style={{
                                    backgroundColor: commentAuthorColor || '#6b7280',
                                  }}
                                  title={t('editor.commentsCount', { count: block.comments.length })}
                                >
                  <MessageSquare className="h-3 w-3" />
                  <span className="text-xs font-medium hidden sm:inline">{block.comments.length}</span>
                </button>
              )}
              
              {!isExercise && !hasComments && !isShowingComments && (
                <div 
                  className="absolute right-0 top-0 bottom-0 w-10 md:w-20 hidden md:block"
                  onMouseEnter={() => setHoveredBlockId(block.id)}
                  onMouseLeave={() => setHoveredBlockId(null)}
                >
                  {isHovered && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenComments(block.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
className="absolute right-0 md:right-[-32px] top-1/2 -translate-y-1/2 px-2 py-1 rounded flex items-center gap-1.5 transition-all duration-200 bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-300/70 dark:hover:bg-gray-600/70 text-xs animate-in fade-in"
                                      title={t('editor.addComment')}
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                      <span className="hidden lg:inline">{t('editor.comment')}</span>
                                    </button>
                  )}
                </div>
              )}
              
              {isShowingComments && (
                <CommentThread
                  blockId={block.id}
                  comments={block.comments || []}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  onResolveComment={handleResolveComment}
                  onClose={handleCloseComments}
                  style={{
                    position: 'absolute',
                    right: '-12px',
                    top: '0',
                    zIndex: 9999,
                  }}
                />
              )}
            </div>
            </React.Fragment>
          );
        })}
        
        {/* Drop zone after last block */}
        {blocks.length > 0 && (
          <div
            className="h-8 w-full transition-all duration-200"
            onDragEnter={(e) => {
              e.preventDefault();
              handleDragOver(blocks.length);
              setColumnDropZone(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              handleDragOver(blocks.length);
              setColumnDropZone(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setColumnDropZone(null);
              handleDrop();
            }}
          >
            {dragState.overIndex === blocks.length && dragState.draggingIndex !== null && (
              <div className="flex items-center gap-0 animate-in fade-in duration-150">
                <div className="w-2 h-2 rounded-full bg-[#0086F4] flex-shrink-0 shadow-[0_0_6px_rgba(0,134,244,0.5)]" />
                <div className="flex-1 h-[2px] bg-[#0086F4]/60 rounded-full" />
              </div>
            )}
          </div>
        )}
      </div>

      {isSelecting && cursorPosition && selectionStartPos && (
        <div
          className="fixed pointer-events-none z-50 border-2 border-blue-500/40 bg-blue-400/15 rounded-lg"
          style={{
            left: Math.min(selectionStartPos.x, cursorPosition.x),
            top: Math.min(selectionStartPos.y, cursorPosition.y),
            width: Math.abs(cursorPosition.x - selectionStartPos.x),
            height: Math.abs(cursorPosition.y - selectionStartPos.y),
          }}
        />
      )}

      {menuState.visible && (
        <SlashMenu
          position={menuState.position}
          filter={menuState.filter}
          onSelect={handleMenuSelect}
          onAddLink={handleAddLinkInMenu}
          onEmojiPickerOpen={handleEmojiPickerOpen}
          onClose={() =>
            setMenuState({ visible: false, position: null, blockId: null, filter: '', triggerType: null, isInsideToggle: false, isNested: false })
          }
          isNested={menuState.isNested}
        />
      )}

      {showSelectionMenu && (
        <SelectionMenu
          onClose={() => setShowSelectionMenu(false)}
          onBlockTypeChange={handleSelectionMenuBlockTypeChange}
          onAddLink={openLinkModal}
          onComment={handleSelectionComment}
          onFormatApplied={handleFormatApplied}
          currentBlockType={currentBlockType}
          isInsideToggle={isInsideToggle}
          isInsideTable={isInsideTable}
        />
      )}

      {linkPasteMenu.visible && linkPasteMenu.position && (
        <LinkPasteMenu
          position={linkPasteMenu.position}
          url={linkPasteMenu.url}
          onSelect={handleLinkPasteMenuSelect}
          onDismiss={() =>
            setLinkPasteMenu({ visible: false, position: null, url: '', blockId: null, originalText: '' })
          }
        />
      )}

      {actionMenu.visible && actionMenu.position && actionMenu.blockId && (
        <BlockActionMenu
          position={actionMenu.position}
          onClose={handleActionMenuClose}
          onDelete={handleBlockDeleteWithExercise}
          onDuplicate={handleBlockDuplicate}
          onComment={() => {
            handleCommentFromMenu();
            handleActionMenuClose();
          }}
          onAddToHomework={onAddToHomework ? () => {
            let selected: typeof blocks;
            if (selectedBlockIds.size > 0 && selectedBlockIds.has(actionMenu.blockId!)) {
              selected = blocks.filter(b => selectedBlockIds.has(b.id));
            } else {
              selected = blocks.filter(b => b.id === actionMenu.blockId);
            }
            if (selected.length === 0) {
              const menuBlock = blocks.find(b => b.id === actionMenu.blockId);
              if (menuBlock) selected = [menuBlock];
            }
            if (selected.length > 0) {
              onAddToHomework(selected);
              handleActionMenuClose();
            }
          } : undefined}
          onTurnInto={handleBlockTurnInto}
          onAddLink={handleAddLinkInActionMenu}
          onColorChange={handleBlockColorChange}
          currentTextColor={actionMenuEffectiveTextColor}
          currentBackgroundColor={actionMenuBlock?.backgroundColor as BackgroundColor}
          isNested={actionMenu.isNested}
        />
      )}

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
      />

      {emojiPickerState.visible && emojiPickerState.position && createPortal(
        <>
          <div
            className="fixed inset-0 z-[59]"
            onClick={handleCloseEmojiPicker}
          />
          <div
            ref={emojiPickerRef}
            className="fixed z-[60]"
            style={{
              top: emojiMenuTop,
              left: emojiMenuLeft,
            }}
          >
            <EmojiPicker
              className="h-[420px] w-[370px]"
              onEmojiSelect={(emoji) => handleEmojiPickerSelect({ emoji: emoji.emoji })}
            >
              <EmojiPickerSearch />
              <EmojiPickerContent />
              <EmojiPickerFooter />
            </EmojiPicker>
          </div>
        </>,
        document.body
      )}

      {/* Inline comment popover */}
      {activeInlineComment && inlineCommentPopoverPos && (
        <CommentThread
          blockId={activeInlineCommentBlockId!}
          comments={activeInlineComment.inlineComment.comments}
          onAddComment={(blockId, content) =>
            handleAddInlineComment(blockId, activeInlineCommentId!, content)
          }
          onDeleteComment={(blockId, commentId) =>
            handleDeleteInlineComment(blockId, activeInlineCommentId!, commentId)
          }
          onResolveComment={(blockId, commentId) =>
            handleResolveInlineComment(blockId, activeInlineCommentId!, commentId)
          }
          onClose={handleCloseInlineComment}
          onRemoveThread={() =>
            handleRemoveInlineCommentThread(activeInlineCommentBlockId!, activeInlineCommentId!)
          }
          highlightedText={activeInlineComment.inlineComment.highlightedText}
          style={{
            position: 'fixed',
            top: `${inlineCommentPopoverPos.top}px`,
            left: `${inlineCommentPopoverPos.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        />
      )}

      {/* Drag ghost preview */}
      {dragState.draggingIndex !== null && blocks[dragState.draggingIndex] && (
        <div
          ref={ghostRef}
          className="fixed pointer-events-none z-[100] transition-opacity duration-100"
          style={{ left: -9999, top: -9999, opacity: 0.95 }}
        >
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg shadow-black/10 dark:shadow-black/30 border border-gray-200/80 dark:border-gray-700 px-3 py-2 max-w-[280px]">
            <GripVertical className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {getBlockPreviewText(blocks[dragState.draggingIndex])}
            </span>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, onChange, newlyAddedBlockIds, documentId, enableCollaboration = false, onBlocksChangeCollab, remoteCursors, emitCursorPosition, isRemoteUpdate = false, onSelectionChange, onExerciseBlockCreated, disableExercises = false, canDeleteExercises = false, onExerciseDelete, showToolbar = false, toolbarVariant = 'panel', remoteDrawingState, emitDrawingStrokeProgress, emitDrawingStrokeComplete, emitDrawingAction, publicHash, lessonExercises, exerciseSavedResults, onExerciseResult, exerciseReadOnly, exerciseActiveUsers, remoteExerciseInteractions, onExerciseInteractionChange, onExerciseFocus, onExerciseBlur, scrollTopOffset, onUndo, onRedo, onAddToHomework }) => {
  return (
    <EditorProvider blocks={blocks} onChange={onChange} newlyAddedBlockIds={newlyAddedBlockIds}>
      <BlockEditorContent 
        documentId={documentId} 
        enableCollaboration={enableCollaboration} 
        onBlocksChangeCollab={onBlocksChangeCollab} 
        remoteCursors={remoteCursors}
        emitCursorPosition={emitCursorPosition}
        isRemoteUpdate={isRemoteUpdate}
        onSelectionChange={onSelectionChange}
        onExerciseBlockCreated={onExerciseBlockCreated}
        disableExercises={disableExercises}
        canDeleteExercises={canDeleteExercises}
        onExerciseDelete={onExerciseDelete}
        showToolbar={showToolbar}
        toolbarVariant={toolbarVariant}
        remoteDrawingState={remoteDrawingState}
        emitDrawingStrokeProgress={emitDrawingStrokeProgress}
        emitDrawingStrokeComplete={emitDrawingStrokeComplete}
        emitDrawingAction={emitDrawingAction}
        publicHash={publicHash}
        lessonExercises={lessonExercises}
        exerciseSavedResults={exerciseSavedResults}
        onExerciseResult={onExerciseResult}
        exerciseReadOnly={exerciseReadOnly}
        exerciseActiveUsers={exerciseActiveUsers}
        remoteExerciseInteractions={remoteExerciseInteractions}
        onExerciseInteractionChange={onExerciseInteractionChange}
        onExerciseFocus={onExerciseFocus}
        onExerciseBlur={onExerciseBlur}
        scrollTopOffset={scrollTopOffset}
        onUndo={onUndo}
        onRedo={onRedo}
        onAddToHomework={onAddToHomework}
      />
    </EditorProvider>
  );
};
