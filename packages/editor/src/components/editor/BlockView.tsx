import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Block, BlockType, DrawingStroke, DrawingPoint } from '../../types/editor';
import { useEditorContextOptional } from '../../contexts/EditorContext';
import { RemoteDrawingState, ExerciseActiveUser, RemoteExerciseInteraction } from '../../hooks/editor/useLessonCollaboration';
import type { ExerciseResultData } from '../../api/exerciseResults';
import { useToast } from '../ui/use-toast';
import { decodeHtmlEntities, updateElementContentPreservingCursor, getCaretCoordinates } from '../../utils/editorUtils';
import {
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_VIDEO,
  BLOCK_TYPE_AUDIO,
  BLOCK_TYPE_PDF,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_NUMBERED,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_QUOTE,
  BLOCK_TYPE_CALLOUT,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_H1,
  BLOCK_TYPE_H2,
  BLOCK_TYPE_H3,
  BLOCK_TYPE_H4,
  BLOCK_TYPE_H5,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_LESSON,
  BLOCK_TYPE_EXERCISE,
  BLOCK_TYPE_TABLE,
  BLOCK_TYPE_LATEX,
} from '../../constants/blockTypes';
import {
  HeadingBlock,
  ToggleHeadingBlock,
  ToggleListBlock,
  BulletedBlock,
  NumberedBlock,
  TodoBlock,
  ImageBlock,
  VideoBlock,
  AudioBlock,
  PDFBlock,
  CodeBlock,
  DividerBlock,
  ParagraphBlock,
  BookmarkBlock,
  EmbedBlock,
  QuoteBlock,
  CalloutBlock,
  ColumnBlock,
  TableBlock,
  LatexBlock,
} from './blocks';
import { getBlockPlugin } from '../../registry/blockRegistry';

interface BlockViewProps {
  block: Block;
  index: number;
  isFirst: boolean;
  onUpdate: (id: string, text: string) => void;
  onKeyDown: (e: React.KeyboardEvent, blockId: string, index: number) => void;
  onCheckToggle?: (id: string, checked: boolean) => void;
  onUpdateBlock?: (id: string, updatedBlock: Block) => void;
  onImageUpload?: (id: string, fileOrUrl: File | string) => void;
  onImageDelete?: (id: string) => void;
  onImageDuplicate?: (id: string) => void;
  onImageResize?: (id: string, width: number, height: number) => void;
  onImageAlignmentChange?: (id: string, alignment: 'left' | 'center' | 'right') => void;
  onDrawingUpdate?: (id: string, drawingData: any) => void;
  onDrawingStrokeProgress?: (blockId: string, points: DrawingPoint[], color: string, thickness: number) => void;
  onDrawingStrokeComplete?: (blockId: string, stroke: DrawingStroke) => void;
  onDrawingAction?: (blockId: string, strokes: DrawingStroke[]) => void;
  remoteDrawingState?: RemoteDrawingState;
  onVideoUpload?: (id: string, file: File) => void;
  videoUploadProgress?: number | null;
  onVideoDelete?: (id: string) => void;
  onVideoAlignmentChange?: (id: string, alignment: 'left' | 'center' | 'right') => void;
  onVideoDuplicate?: (id: string) => void;
  onAudioUpload?: (id: string, file: File) => void;
  onAudioDelete?: (id: string) => void;
  onPdfUpload?: (id: string, file: File) => void;
  onPdfDelete?: (id: string) => void;
  onPdfResize?: (id: string, width: number, height: number) => void;
  onPdfAlignmentChange?: (id: string, alignment: 'left' | 'center' | 'right') => void;
  onPdfDuplicate?: (id: string) => void;
  onEmojiChange?: (id: string, emoji: string) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: () => void;
  onPlusClick?: (blockId: string, element: HTMLElement) => void;
  onDotsClick?: (blockId: string, element: HTMLElement, isInsideToggle?: boolean, selectedBlockIds?: Set<string>) => void;
  onColumnUpdate?: (blockId: string, columnIndex: number, blocks: Block[]) => void;
  onColumnWidthsUpdate?: (blockId: string, widths: number[]) => void;
  onCreateBlockAfterColumn?: (columnBlockId: string) => void;
  onCreateBlockAfterToggle?: (toggleBlockId: string) => void;
  onCreateBlockAfterCallout?: (calloutBlockId: string) => void;
  onDissolveCallout?: (calloutBlockId: string) => void;
  onToggleHeading?: (blockId: string, isOpen: boolean) => void;
  onToggleChildUpdate?: (blockId: string, children: Block[]) => void;
  onCalloutChildUpdate?: (blockId: string, children: Block[]) => void;
  onTableDataUpdate?: (
    blockId: string, 
    cells: string[][], 
    columnWidths?: number[], 
    rowBackgroundColors?: string[], 
    columnBackgroundColors?: string[],
    rowTextColors?: string[], 
    columnTextColors?: string[]
  ) => void;
  onSlashMenu?: (blockId: string, filter: string, position: { x: number; y: number }) => void;
  onCloseSlashMenu?: () => void;
  slashMenuBlockId?: string | null;
  autoFocus?: boolean;
  allBlocks?: Block[];
  isSelected?: boolean;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  isSelecting?: boolean;
  selectedBlockIds?: Set<string>;
  onNestedBlockMouseDown?: (e: React.MouseEvent, blockId: string) => void;
  onNestedBlockMouseEnter?: (e: React.MouseEvent, blockId: string) => void;
  isInsideToggle?: boolean;
  isInsideColumn?: boolean;
  onDropBlockIntoColumn?: (draggedBlockId: string, columnBlockId: string, columnIndex: number) => void;
  isUploading?: boolean;
  exerciseId?: number;
  exerciseSavedResult?: ExerciseResultData;
  onExerciseResultSubmit?: (result: Omit<ExerciseResultData, 'completedAt'>) => void;
  exerciseReadOnly?: boolean;
  activeExerciseUsers?: ExerciseActiveUser[];
  remoteExerciseInteractions?: RemoteExerciseInteraction[];
  onExerciseInteractionChange?: (state: any) => void;
  onExerciseFocus?: () => void;
  onExerciseBlur?: () => void;
}

export const BlockView: React.FC<BlockViewProps> = ({
  block,
  index,
  isFirst,
  onUpdate,
  onKeyDown,
  onCheckToggle,
  onUpdateBlock,
  onImageUpload,
  onImageDelete,
  onImageDuplicate,
  onImageResize,
  onImageAlignmentChange,
  onDrawingUpdate,
  onDrawingStrokeProgress,
  onDrawingStrokeComplete,
  onDrawingAction,
  remoteDrawingState,
  onVideoUpload,
  videoUploadProgress,
  onVideoDelete,
  onVideoAlignmentChange,
  onVideoDuplicate,
  onAudioUpload,
  onAudioDelete,
  onPdfUpload,
  onPdfDelete,
  onPdfResize,
  onPdfAlignmentChange,
  onPdfDuplicate,
  onEmojiChange,
  onDragStart,
  onDragOver,
  onDrop,
  onPlusClick,
  onDotsClick,
  onColumnUpdate,
  onColumnWidthsUpdate,
  onCreateBlockAfterColumn,
  onCreateBlockAfterToggle,
  onCreateBlockAfterCallout,
  onDissolveCallout,
  onToggleHeading,
  onToggleChildUpdate,
  onCalloutChildUpdate,
  onTableDataUpdate,
  onSlashMenu,
  onCloseSlashMenu,
  slashMenuBlockId,
  autoFocus,
  allBlocks,
  isSelected = false,
  onMouseDown,
  onMouseEnter,
  isSelecting = false,
  selectedBlockIds,
  onNestedBlockMouseDown,
  onNestedBlockMouseEnter,
  isInsideToggle,
  isInsideColumn,
  onDropBlockIntoColumn,
  isUploading = false,
  exerciseId,
  exerciseSavedResult,
  onExerciseResultSubmit,
  exerciseReadOnly,
  activeExerciseUsers,
  remoteExerciseInteractions,
  onExerciseInteractionChange,
  onExerciseFocus,
  onExerciseBlur,
}) => {
  const { t } = useTranslation();
  const editorContext = useEditorContextOptional();
  const isNewBlock = editorContext?.newlyAddedBlockIds?.has(block.id) || false;
  
  const contentRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | HTMLIFrameElement>(null);
  const isEditingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const [imageWidth, setImageWidth] = React.useState<number | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const { toast } = useToast();

  const getDisplayNumber = (): number => {
    if (block.type !== BLOCK_TYPE_NUMBERED || !allBlocks) {
      return index + 1;
    }

    if (block.startNumber) {
      return block.startNumber;
    }

    let startNumber = 1;
    let startIndex = -1;
    
    for (let i = index - 1; i >= 0; i--) {
      const prevBlock = allBlocks[i];
      if (prevBlock.type !== BLOCK_TYPE_NUMBERED) {
        break;
      }
      if (prevBlock.startNumber) {
        startNumber = prevBlock.startNumber;
        startIndex = i;
        break;
      }
    }
    
    if (startIndex !== -1) {
      return startNumber + (index - startIndex);
    } else {
      let sequenceStart = index;
      for (let i = index - 1; i >= 0; i--) {
        if (allBlocks[i].type === BLOCK_TYPE_NUMBERED) {
          sequenceStart = i;
        } else {
          break;
        }
      }
      return startNumber + (index - sequenceStart);
    }
  };

  useEffect(() => {
    if (autoFocus && contentRef.current) {
      contentRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const getMaxColumnWidth = (): number | null => {
      if (!containerRef.current) return null;
      
      let columnParent = containerRef.current.closest('[class*="w-1/"]');
      
      if (!columnParent) {
        let parent = containerRef.current.parentElement;
        while (parent) {
          if ((parent.style.width && parent.style.width.includes('%')) || 
              parent.classList.contains('group/column')) {
            columnParent = parent;
            break;
          }
          parent = parent.parentElement;
          if (parent?.classList.contains('px-10') || parent?.classList.contains('group/columnblock')) break;
        }
      }
      
      if (!columnParent) return null;
      
      const columnWidth = columnParent.getBoundingClientRect().width;
      const innerDiv = columnParent.querySelector('[class*="pl-16"]');
      
      let maxWidth = Math.floor(columnWidth);
      if (innerDiv && innerDiv.contains(containerRef.current)) {
        maxWidth -= 64;
      }
      
      return Math.max(200, maxWidth - 16);
    };
    
    if (block.type === BLOCK_TYPE_IMAGE && block.imageWidth) {
      const maxColumnWidth = getMaxColumnWidth();
      if (maxColumnWidth && block.imageWidth > maxColumnWidth) {
        setImageWidth(maxColumnWidth);
      } else {
        setImageWidth(block.imageWidth);
      }
    } else if (block.type === BLOCK_TYPE_IMAGE && !block.imageWidth) {
      setImageWidth(null);
    } else if (block.type === BLOCK_TYPE_VIDEO && block.videoWidth) {
      const maxColumnWidth = getMaxColumnWidth();
      if (maxColumnWidth && block.videoWidth > maxColumnWidth) {
        setImageWidth(maxColumnWidth);
      } else {
        setImageWidth(block.videoWidth);
      }
    } else if (block.type === BLOCK_TYPE_VIDEO && !block.videoWidth) {
      setImageWidth(null);
    } else if (block.type === BLOCK_TYPE_PDF && block.pdfWidth) {
      const maxColumnWidth = getMaxColumnWidth();
      if (maxColumnWidth && block.pdfWidth > maxColumnWidth) {
        setImageWidth(maxColumnWidth);
      } else {
        setImageWidth(block.pdfWidth);
      }
    } else if (block.type === BLOCK_TYPE_PDF && !block.pdfWidth) {
      setImageWidth(null);
    } else if (block.type === BLOCK_TYPE_EMBED && block.embedWidth) {
      const maxColumnWidth = getMaxColumnWidth();
      if (maxColumnWidth && block.embedWidth > maxColumnWidth) {
        setImageWidth(maxColumnWidth);
      } else {
        setImageWidth(block.embedWidth);
      }
    } else if (block.type === BLOCK_TYPE_EMBED && !block.embedWidth) {
      setImageWidth(null);
    }
  }, [block.id, block.type, block.imageWidth, block.videoWidth, block.pdfWidth, block.embedWidth]);

  const prevBlockTypeRef = useRef<BlockType>(block.type);
  
  useEffect(() => {
    const typeChanged = prevBlockTypeRef.current !== block.type;
    
    if (contentRef.current) {
      if (block.type === BLOCK_TYPE_CODE) {
        const currentText = contentRef.current.textContent || '';
        const decodedText = decodeHtmlEntities(block.text);
        if (currentText !== decodedText || typeChanged) {
          if (typeChanged) {
            contentRef.current.textContent = decodedText;
          } else {
            updateElementContentPreservingCursor(contentRef.current, block.text, true);
          }
        }
      } else if (block.type === BLOCK_TYPE_LATEX) {
      } else {
        const currentText = contentRef.current.innerHTML || '';
        if (block.text === '' && [BLOCK_TYPE_BULLETED, BLOCK_TYPE_NUMBERED, BLOCK_TYPE_TODO].includes(block.type)) {
          contentRef.current.innerHTML = '';
          contentRef.current.textContent = '';
        } else if (currentText !== block.text || typeChanged) {
          if (typeChanged) {
            contentRef.current.innerHTML = block.text;
          } else {
            updateElementContentPreservingCursor(contentRef.current, block.text, false);
          }
        }
      }
      
      prevBlockTypeRef.current = block.type;
    }
  }, [block.text, block.type]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    isEditingRef.current = true;
    let text = block.type === BLOCK_TYPE_CODE 
      ? (e.currentTarget.textContent || '')
      : (e.currentTarget.innerHTML || '');
    
    // Check if block is truly empty (only contains <br> tags)
    const cleanText = text.replace(/<br\s*\/?>/gi, '').trim();
    if (cleanText === '') {
      text = ''; // Save empty string instead of <br>
    }
    
    // Check for slash menu trigger
    if (onSlashMenu && text.includes('/')) {
      const slashIndex = text.lastIndexOf('/');
      const textBeforeSlash = text.slice(0, slashIndex).replace(/<[^>]*>/g, '').trim();
      
      if (textBeforeSlash.length === 0) {
        const filter = text.slice(slashIndex + 1).replace(/<[^>]*>/g, '');
        const coords = getCaretCoordinates();
        
        if (coords) {
          onSlashMenu(block.id, filter, { x: coords.left, y: coords.bottom });
        }
      } else if (onCloseSlashMenu && slashMenuBlockId === block.id) {
        // Close the slash menu if there's text before the slash
        onCloseSlashMenu();
      }
    } else if (onCloseSlashMenu && slashMenuBlockId === block.id) {
      // Close the slash menu if it's open for this block and there's no slash
      onCloseSlashMenu();
    }
    
    onUpdate(block.id, text);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const text = e.clipboardData.getData('text/plain');
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    range.deleteContents();
    
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    const target = e.currentTarget || contentRef.current;
    if (target) {
      const updatedText = block.type === BLOCK_TYPE_CODE
        ? (target.textContent || '')
        : (target.innerHTML || '');
      onUpdate(block.id, updatedText);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      isEditingRef.current = false;
    }, 100);
    setIsFocused(false);
  };

  const handleFocus = () => {
    isEditingRef.current = true;
    setIsFocused(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Check whether the click target is a link or inside a link
    const target = e.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement | null;
    
    if (link) {
      // Prevent default behavior and open the link in a new tab
      e.preventDefault();
      e.stopPropagation();
      window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (block.type === BLOCK_TYPE_VIDEO && onVideoUpload) {
        onVideoUpload(block.id, file);
      } else if (block.type === BLOCK_TYPE_AUDIO && onAudioUpload) {
        onAudioUpload(block.id, file);
      } else if (block.type === BLOCK_TYPE_PDF && onPdfUpload) {
        onPdfUpload(block.id, file);
      } else if (onImageUpload) {
        // Validate image format
        const supportedImageFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!supportedImageFormats.includes(file.type.toLowerCase())) {
          toast({
            title: t('editor.unsupportedFormatTitle'),
            description: t('editor.unsupportedFormatDescription', { fileType: file.type || t('editor.file') }),
            variant: 'destructive',
          });
          return;
        }
        onImageUpload(block.id, file);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImage = () => {
    if (onImageDelete) {
      onImageDelete(block.id);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br' | 'r' | 'l') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startWidth = imageRef.current?.offsetWidth || 0;
    
    // Function to calculate maximum width considering all constraints
    const calculateMaxWidth = (): number => {
      if (!containerRef.current) return 800;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Get the right edge of the editor viewport
      const rightBoundary = window.innerWidth;
      
      // Check whether the image is inside a column
      // First check Tailwind classes
      let columnParent = containerRef.current.closest('[class*="w-1/"]');
      
      // If not found, check inline-styled columns from ColumnBlock
      if (!columnParent) {
        let parent = containerRef.current.parentElement;
        while (parent) {
          if ((parent.style.width && parent.style.width.includes('%')) || 
              parent.classList.contains('group/column')) {
            columnParent = parent;
            break;
          }
          parent = parent.parentElement;
          if (parent?.classList.contains('px-10') || parent?.classList.contains('group/columnblock')) break;
        }
      }
      
      if (columnParent) {
        const columnRect = columnParent.getBoundingClientRect();
        
        // Max width = column right edge minus image container left edge
        let availableWidth = columnRect.right - containerRect.left;
        
        // Subtract pl-16 padding (64px) if present
        const innerDiv = columnParent.querySelector('[class*="pl-16"]');
        if (innerDiv && innerDiv.contains(containerRef.current)) {
          availableWidth -= 16; // additional padding
        }
        
        // Ensure the image does not exceed the viewport right edge
        const maxWidthByViewport = rightBoundary - containerRect.left - 32; // 32px margin
        
        return Math.max(200, Math.min(availableWidth - 16, maxWidthByViewport));
      } else {
        // For images outside columns
        const editorContainer = containerRef.current.closest('.px-10') || containerRef.current.closest('[class*="max-w"]');
        if (editorContainer) {
          const editorRect = editorContainer.getBoundingClientRect();
          const availableWidth = Math.min(editorRect.right, rightBoundary) - containerRect.left - 80;
          return Math.max(200, Math.min(800, availableWidth));
        }
      }
      
      return 800;
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Recalculate max width dynamically during resize
      const currentMaxWidth = calculateMaxWidth();
      
      let newWidth = startWidth;

      switch (corner) {
        case 'br':
          newWidth = startWidth + (moveEvent.clientX - startX);
          break;
        case 'bl':
          newWidth = startWidth + (startX - moveEvent.clientX);
          break;
        case 'tr':
          newWidth = startWidth + (moveEvent.clientX - startX);
          break;
        case 'tl':
          newWidth = startWidth + (startX - moveEvent.clientX);
          break;
        case 'r':
          newWidth = startWidth + (moveEvent.clientX - startX);
          break;
        case 'l':
          newWidth = startWidth + (startX - moveEvent.clientX);
          break;
      }

      // Constrain width to min and max
      newWidth = Math.max(200, Math.min(newWidth, currentMaxWidth));
      
      // Only set width if it has changed from the start
      if (Math.abs(newWidth - startWidth) > 1) {
        setImageWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      
      if (onImageResize) {
        if (block.type === BLOCK_TYPE_IMAGE && imageRef.current && imageRef.current instanceof HTMLImageElement) {
          const finalWidth = imageRef.current.offsetWidth;
          const img = imageRef.current;
          const imgNaturalWidth = img.naturalWidth || 0;
          const imgNaturalHeight = img.naturalHeight || 0;

          let calculatedHeight: number;
          if (imgNaturalWidth > 0 && imgNaturalHeight > 0) {
            calculatedHeight = Math.round(finalWidth * (imgNaturalHeight / imgNaturalWidth));
          } else {
            calculatedHeight = img.offsetHeight;
          }
          
          onImageResize(block.id, finalWidth, calculatedHeight);
        } else if (block.type === BLOCK_TYPE_VIDEO && imageRef.current && imageRef.current instanceof HTMLVideoElement) {
          const finalWidth = imageRef.current.offsetWidth;
          const video = imageRef.current;
          const videoWidth = video.videoWidth || 1920;
          const videoHeight = video.videoHeight || 1080;

          let calculatedHeight: number;
          if (videoWidth > 0 && videoHeight > 0) {
            calculatedHeight = Math.round(finalWidth * (videoHeight / videoWidth));
          } else {
            calculatedHeight = Math.round(finalWidth / (16 / 9));
          }
          
          onImageResize(block.id, finalWidth, calculatedHeight);
        } else if (block.type === BLOCK_TYPE_PDF && imageRef.current && imageRef.current instanceof HTMLIFrameElement && onPdfResize) {
          const finalWidth = imageRef.current.offsetWidth;
          // A4 aspect ratio (1:1.414)
          const calculatedHeight = Math.round(finalWidth / (1 / 1.414));
          
          onPdfResize(block.id, finalWidth, calculatedHeight);
        } else if (block.type === BLOCK_TYPE_EMBED && imageRef.current && imageRef.current instanceof HTMLIFrameElement) {
          const finalWidth = imageRef.current.offsetWidth;
          const calculatedHeight = Math.round((finalWidth * 9) / 16);
          
          onImageResize(block.id, finalWidth, calculatedHeight);
        }
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderContent = () => {
    const baseClasses = 'outline-none focus:outline-none break-words';
    
    const contentProps = {
      ref: contentRef,
      contentEditable: true,
      suppressContentEditableWarning: true,
      'data-block-id': block.id,
      'data-text-color': block.textColor && block.textColor !== 'default' ? block.textColor : undefined,
      onInput: handleInput,
      onPaste: handlePaste,
      onBlur: handleBlur,
      onFocus: handleFocus,
      onClick: handleClick,
      onKeyDown: (e: React.KeyboardEvent) => onKeyDown(e, block.id, index),
      className: baseClasses,
    };

    const commonProps = {
      block,
      index,
      contentRef,
      baseClasses,
      contentProps,
      onCheckToggle,
      onUpdateBlock,
      onImageUpload,
      onImageDelete,
      onImageDuplicate,
      onImageResize,
      onImageAlignmentChange,
      onDrawingUpdate,
      onDrawingStrokeProgress,
      onDrawingStrokeComplete,
      onDrawingAction,
      remoteDrawingBlockState: remoteDrawingState?.[block.id],
      onVideoUpload,
      videoUploadProgress,
      onVideoDelete,
      onVideoResize: onImageResize,
      onVideoAlignmentChange,
      onVideoDuplicate,
      onAudioUpload,
      onAudioDelete,
      onPdfUpload,
      onPdfDelete,
      onPdfResize,
      onPdfAlignmentChange,
      onPdfDuplicate,
      onKeyDown,
      onColumnUpdate,
      onColumnWidthsUpdate,
      onCreateBlockAfterColumn,
      allBlocks,
      getDisplayNumber,
      theme: 'light' as const,
      imageWidth,
      setIsImageWidth: setImageWidth,
      isResizing,
      setIsResizing,
      imageRef,
      fileInputRef,
      checkboxRef,
      triggerFileInput,
      handleFileSelect,
      handleDeleteImage: onImageDelete ? handleDeleteImage : undefined,
      handleResizeStart,
      setIsFocused,
      isFirst,
      isSelected,
      isSelecting,
      isUploading,
      exerciseId,
      exerciseSavedResult,
      onExerciseResultSubmit,
      exerciseReadOnly,
      activeExerciseUsers,
      remoteExerciseInteractions,
      onExerciseInteractionChange,
      onExerciseFocus,
      onExerciseBlur,
    };

    const customPlugin = getBlockPlugin(block.type);
    if (customPlugin) {
      return <>{customPlugin.render(commonProps)}</>;
    }

    switch (block.type) {
      case BLOCK_TYPE_H1:
        return <HeadingBlock {...commonProps} level={1} />;
      case BLOCK_TYPE_H2:
        return <HeadingBlock {...commonProps} level={2} />;
      case BLOCK_TYPE_H3:
        return <HeadingBlock {...commonProps} level={3} />;
      case BLOCK_TYPE_H4:
        return <HeadingBlock {...commonProps} level={4} />;
      case BLOCK_TYPE_H5:
        return <HeadingBlock {...commonProps} level={5} />;
      case BLOCK_TYPE_TOGGLE_H1:
        return <ToggleHeadingBlock 
          {...commonProps}
          level={1}
          onToggle={onToggleHeading}
          onChildUpdate={onToggleChildUpdate}
          onCreateBlockAfterToggle={onCreateBlockAfterToggle}
          onCheckToggle={onCheckToggle}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          onImageResize={onImageResize}
          onImageAlignmentChange={onImageAlignmentChange}
          onDrawingUpdate={onDrawingUpdate}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPlusClick={onPlusClick}
          onDotsClick={onDotsClick}
          onSlashMenu={onSlashMenu}
          onCloseSlashMenu={onCloseSlashMenu}
          slashMenuBlockId={slashMenuBlockId}
          selectedBlockIds={selectedBlockIds}
          onBlockMouseDown={onNestedBlockMouseDown}
          onBlockMouseEnter={onNestedBlockMouseEnter}
        />;
      case BLOCK_TYPE_TOGGLE_H2:
        return <ToggleHeadingBlock 
          {...commonProps}
          level={2}
          onToggle={onToggleHeading}
          onChildUpdate={onToggleChildUpdate}
          onCreateBlockAfterToggle={onCreateBlockAfterToggle}
          onCheckToggle={onCheckToggle}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          onImageResize={onImageResize}
          onImageAlignmentChange={onImageAlignmentChange}
          onDrawingUpdate={onDrawingUpdate}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPlusClick={onPlusClick}
          onDotsClick={onDotsClick}
          onSlashMenu={onSlashMenu}
          onCloseSlashMenu={onCloseSlashMenu}
          slashMenuBlockId={slashMenuBlockId}
          selectedBlockIds={selectedBlockIds}
          onBlockMouseDown={onNestedBlockMouseDown}
          onBlockMouseEnter={onNestedBlockMouseEnter}
        />;
      case BLOCK_TYPE_TOGGLE_H3:
        return <ToggleHeadingBlock 
          {...commonProps}
          level={3}
          onToggle={onToggleHeading}
          onChildUpdate={onToggleChildUpdate}
          onCreateBlockAfterToggle={onCreateBlockAfterToggle}
          onCheckToggle={onCheckToggle}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          onImageResize={onImageResize}
          onImageAlignmentChange={onImageAlignmentChange}
          onDrawingUpdate={onDrawingUpdate}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPlusClick={onPlusClick}
          onDotsClick={onDotsClick}
          onSlashMenu={onSlashMenu}
          onCloseSlashMenu={onCloseSlashMenu}
          slashMenuBlockId={slashMenuBlockId}
          selectedBlockIds={selectedBlockIds}
          onBlockMouseDown={onNestedBlockMouseDown}
          onBlockMouseEnter={onNestedBlockMouseEnter}
        />;
      case BLOCK_TYPE_TOGGLE_LIST:
        return <ToggleListBlock 
          {...commonProps}
          onToggle={onToggleHeading}
          onChildUpdate={onToggleChildUpdate}
          onCreateBlockAfterToggle={onCreateBlockAfterToggle}
          onCheckToggle={onCheckToggle}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          onImageResize={onImageResize}
          onImageAlignmentChange={onImageAlignmentChange}
          onDrawingUpdate={onDrawingUpdate}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPlusClick={onPlusClick}
          onDotsClick={onDotsClick}
          onSlashMenu={onSlashMenu}
          onCloseSlashMenu={onCloseSlashMenu}
          slashMenuBlockId={slashMenuBlockId}
          selectedBlockIds={selectedBlockIds}
          onBlockMouseDown={onNestedBlockMouseDown}
          onBlockMouseEnter={onNestedBlockMouseEnter}
        />;
      case BLOCK_TYPE_BULLETED:
        return <BulletedBlock {...commonProps} />;
      case BLOCK_TYPE_NUMBERED:
        return <NumberedBlock {...commonProps} />;
      case BLOCK_TYPE_TODO:
        return <TodoBlock {...commonProps} />;
      case BLOCK_TYPE_IMAGE:
        return <ImageBlock {...commonProps} />;
      case BLOCK_TYPE_VIDEO:
        return <VideoBlock {...commonProps} />;
      case BLOCK_TYPE_AUDIO:
        return <AudioBlock {...commonProps} />;
      case BLOCK_TYPE_PDF:
        return <PDFBlock {...commonProps} />;
      case BLOCK_TYPE_CODE:
        return <CodeBlock {...commonProps} />;
      case BLOCK_TYPE_LATEX:
        return <LatexBlock {...commonProps} />;
      case BLOCK_TYPE_DIVIDER:
        return <DividerBlock {...commonProps} />;
      case BLOCK_TYPE_BOOKMARK:
        return <BookmarkBlock {...commonProps} />;
      case BLOCK_TYPE_EMBED:
        return <EmbedBlock {...commonProps} />;
      case BLOCK_TYPE_QUOTE:
        return <QuoteBlock {...commonProps} />;
      case BLOCK_TYPE_CALLOUT:
        return <CalloutBlock 
          {...commonProps}
          onEmojiChange={onEmojiChange}
          onChildUpdate={onCalloutChildUpdate}
          onCreateBlockAfterCallout={onCreateBlockAfterCallout}
          onDissolveCallout={onDissolveCallout}
          onCheckToggle={onCheckToggle}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          onImageResize={onImageResize}
          onImageAlignmentChange={onImageAlignmentChange}
          onDrawingUpdate={onDrawingUpdate}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPlusClick={onPlusClick}
          onDotsClick={onDotsClick}
          onSlashMenu={onSlashMenu}
          onCloseSlashMenu={onCloseSlashMenu}
          slashMenuBlockId={slashMenuBlockId}
          selectedBlockIds={selectedBlockIds}
          onBlockMouseDown={onNestedBlockMouseDown}
          onBlockMouseEnter={onNestedBlockMouseEnter}
          isSelecting={isSelecting}
        />;
      case BLOCK_TYPE_COLUMNS2:
      case BLOCK_TYPE_COLUMNS3:
      case BLOCK_TYPE_COLUMNS4:
      case BLOCK_TYPE_COLUMNS5:
        return <ColumnBlock 
          {...commonProps}
          onCheckToggle={onCheckToggle}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          onImageResize={onImageResize}
          onImageAlignmentChange={onImageAlignmentChange}
          onDrawingUpdate={onDrawingUpdate}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onPlusClick={onPlusClick}
          onDotsClick={onDotsClick}
          onSlashMenu={onSlashMenu}
          onCloseSlashMenu={onCloseSlashMenu}
          slashMenuBlockId={slashMenuBlockId}
          parentSelectedBlockIds={selectedBlockIds}
          onParentMouseDown={onMouseDown}
          onDropBlockIntoColumn={onDropBlockIntoColumn}
        />;
      case BLOCK_TYPE_TABLE:
        return <TableBlock 
          {...commonProps}
          onTableDataUpdate={onTableDataUpdate}
        />;
      default:
        return <ParagraphBlock {...commonProps} />;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    
    // Set drag data - without this, drop events won't fire
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.setData('application/x-block-index', String(index));
    
    // Hide default drag image
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    
    onDragStart?.(index);
  };

  const handleDragEnd = () => {
    // Reset drag flag after a short delay to prevent click from firing
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  // Get color classes for the block
  const getColorClasses = () => {
    const classes: string[] = [];
    
    // Text color
    if (block.textColor) {
      switch (block.textColor) {
        case 'gray':
          classes.push('text-gray-500');
          break;
        case 'brown':
          classes.push('text-amber-700');
          break;
        case 'orange':
          classes.push('text-orange-600');
          break;
        case 'yellow':
          classes.push('text-yellow-600');
          break;
        case 'green':
          classes.push('text-green-600');
          break;
        case 'blue':
          classes.push('text-blue-600');
          break;
        case 'purple':
          classes.push('text-purple-600');
          break;
        case 'pink':
          classes.push('text-pink-600');
          break;
        case 'red':
          classes.push('text-red-600');
          break;
      }
    }
    
    // Background color
    if (block.backgroundColor) {
      switch (block.backgroundColor) {
        case 'gray_background':
          classes.push('bg-gray-100 dark:bg-gray-800');
          break;
        case 'brown_background':
          classes.push('bg-amber-50 dark:bg-amber-900/20');
          break;
        case 'orange_background':
          classes.push('bg-orange-50 dark:bg-orange-900/20');
          break;
        case 'yellow_background':
          classes.push('bg-yellow-50 dark:bg-yellow-900/20');
          break;
        case 'green_background':
          classes.push('bg-green-50 dark:bg-green-900/20');
          break;
        case 'blue_background':
          classes.push('bg-blue-50 dark:bg-blue-900/20');
          break;
        case 'purple_background':
          classes.push('bg-purple-50 dark:bg-purple-900/20');
          break;
        case 'pink_background':
          classes.push('bg-pink-50 dark:bg-pink-900/20');
          break;
        case 'red_background':
          classes.push('bg-red-50 dark:bg-red-900/20');
          break;
      }
    }
    
    return classes.join(' ');
  };

  const colorClasses = getColorClasses();

  const getAlignmentClasses = () => {
    if (!block.alignment) return '';
    
    switch (block.alignment) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      case 'left':
      default:
        return 'text-left';
    }
  };

  const alignmentClasses = getAlignmentClasses();

  const BLOCK_TYPES_WITHOUT_PLACEHOLDER: BlockType[] = [
    BLOCK_TYPE_DIVIDER,
    BLOCK_TYPE_IMAGE,
    BLOCK_TYPE_VIDEO,
    BLOCK_TYPE_AUDIO,
    BLOCK_TYPE_PDF,
    BLOCK_TYPE_EMBED,
    BLOCK_TYPE_BOOKMARK,
    BLOCK_TYPE_BULLETED,
    BLOCK_TYPE_NUMBERED,
    BLOCK_TYPE_TODO,
    BLOCK_TYPE_CODE,
    BLOCK_TYPE_LATEX,
    BLOCK_TYPE_CALLOUT,
    BLOCK_TYPE_QUOTE,
    BLOCK_TYPE_TOGGLE_LIST,
    BLOCK_TYPE_TOGGLE_H1,
    BLOCK_TYPE_TOGGLE_H2,
    BLOCK_TYPE_TOGGLE_H3,
    BLOCK_TYPE_COLUMNS2,
    BLOCK_TYPE_COLUMNS3,
    BLOCK_TYPE_COLUMNS4,
    BLOCK_TYPE_COLUMNS5,
    BLOCK_TYPE_TABLE,
    BLOCK_TYPE_LESSON,
    BLOCK_TYPE_EXERCISE,
  ];

  return (
    <div
      ref={containerRef}
      data-selected={isSelected ? '' : undefined}
      className={`block-container group relative transition-all ${isInsideColumn ? 'w-full' : 'w-full xl:w-[85%]'} max-w-full ${isNewBlock ? 'animate-fade-in-block' : ''} ${colorClasses} ${alignmentClasses} ${
        isSelected 
          ? 'bg-blue-100/70 dark:bg-blue-900/40 rounded-lg' 
          : block.backgroundColor ? 'rounded-lg px-2 py-1' : ''
      } ${isInsideToggle ? 'pl-0' : ''} ${isSelecting && isSelected ? '[&>*]:pointer-events-none' : ''}`}
      {...(onDragOver && {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          onDragOver(index);
        }
      })}
      {...(onDrop && {
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          onDrop();
        }
      })}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
    >
      {!isInsideColumn && 
       (onPlusClick || onDotsClick) && (
      <div className={`absolute ${isInsideToggle ? 'left-[-6px]' : 'left-[-12px] sm:left-[-40px] md:left-[-50px]'} top-1/2 -translate-y-1/2 transition-opacity flex items-center gap-0 sm:gap-0.5 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`}>
        {onPlusClick && (
          <button
            type="button"
            className="hidden sm:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 w-full px-1 py-0.5"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onPlusClick) {
                onPlusClick(block.id, e.currentTarget as HTMLElement);
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            aria-label={t('editor.addBlock')}
          >
            <svg
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="pointer-events-none w-[14px] h-[14px]"
            >
              <line x1="7" y1="2" x2="7" y2="12" />
              <line x1="2" y1="7" x2="12" y2="7" />
            </svg>
          </button>
        )}
        
        {onDotsClick && (
          <button
            type="button"
            draggable={!!onDragStart}
            onDragStart={onDragStart ? handleDragStart : undefined}
            onDragEnd={onDragStart ? handleDragEnd : undefined}
            onClick={(e) => {
              e.stopPropagation();
              
              // Don't open menu if we just finished dragging
              if (isDraggingRef.current) {
                return;
              }
              
              if (onDotsClick) {
                onDotsClick(block.id, e.currentTarget as HTMLElement, isInsideToggle);
              }
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            className="text-gray-400 hover:text-[#0086F4] dark:hover:text-[#0086F4] hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded p-0.5 sm:p-1 cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-110"
            aria-label="Click to open menu"
            tabIndex={-1}
            title="Click to open menu"
          >
            <svg
              viewBox="0 0 10 16"
              fill="currentColor"
              className="pointer-events-none w-[6px] h-[10px] sm:w-[10px] sm:h-[16px]"
            >
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="7" cy="2" r="1.5" />
              <circle cx="2" cy="8" r="1.5" />
              <circle cx="7" cy="8" r="1.5" />
              <circle cx="2" cy="14" r="1.5" />
              <circle cx="7" cy="14" r="1.5" />
            </svg>
          </button>
        )}
      </div>
      )}

      <div className="overflow-x-hidden max-w-full">
        {renderContent()}
      </div>

      {isFocused && 
       (!block.text || block.text.replace(/<br\s*\/?>/gi, '').trim() === '') && 
       !BLOCK_TYPES_WITHOUT_PLACEHOLDER.includes(block.type) && 
       onSlashMenu && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none z-10">
          {t('editor.typeSlashForMenu')}
        </div>
      )}
    </div>
  );
};

