import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import { Block } from '../../../types/editor';
import { BlockView } from '../BlockView';
import { 
  createBlock, 
  setCaretToStart, 
  getCaretCoordinates,
  isBulletListTrigger,
  getNumberedListTrigger,
} from '../../../utils/editorUtils';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
} from '../../../constants/blockTypes';
import { BlockType } from '../../../types/editor';
import { createNestedBlockKeyboardHandler } from '../../../hooks/editor/useNestedBlockKeyboard';
import { useNestedBlockSelection } from '../../../hooks/editor/useNestedBlockSelection';
import { KEY_TAB } from '../../../constants/keyboard';

interface ColumnBlockProps extends BlockRendererProps {
  onColumnUpdate?: (blockId: string, columnIndex: number, blocks: Block[]) => void;
  onColumnWidthsUpdate?: (blockId: string, widths: number[]) => void;
  onCreateBlockAfterColumn?: (columnBlockId: string) => void;
  onCheckToggle?: (id: string, checked: boolean) => void;
  onImageUpload?: (id: string, fileOrUrl: File | string) => void;
  onImageDelete?: (id: string) => void;
  onImageResize?: (id: string, width: number, height: number) => void;
  onImageAlignmentChange?: (id: string, alignment: 'left' | 'center' | 'right') => void;
  onDrawingUpdate?: (id: string, drawingData: any) => void;
  onVideoUpload?: (id: string, file: File) => void;
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
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDrop?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onPlusClick?: (blockId: string, element: HTMLElement) => void;
  onDotsClick?: (blockId: string, element: HTMLElement, isInsideToggle?: boolean, selectedBlockIds?: Set<string>) => void;
  onSlashMenu?: (blockId: string, filter: string, position: { x: number; y: number }) => void;
  onCloseSlashMenu?: () => void;
  slashMenuBlockId?: string | null;
  parentSelectedBlockIds?: Set<string>;
  onParentMouseDown?: (e: React.MouseEvent) => void;
  onDropBlockIntoColumn?: (draggedBlockId: string, columnBlockId: string, columnIndex: number) => void;
}

export const ColumnBlock: React.FC<ColumnBlockProps> = ({
  block,
  index,
  onColumnUpdate,
  onColumnWidthsUpdate,
  onCreateBlockAfterColumn,
  onCheckToggle,
  onImageUpload,
  onImageDelete,
  onImageResize,
  onImageAlignmentChange,
  onDrawingUpdate,
  onVideoUpload,
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
  onDragStart,
  onPlusClick: parentOnPlusClick,
  onDotsClick: parentOnDotsClick,
  onSlashMenu,
  onCloseSlashMenu,
  slashMenuBlockId,
  isSelected,
  parentSelectedBlockIds: _parentSelectedBlockIds,
  onParentMouseDown,
  onDropBlockIntoColumn,
}) => {
  const { t } = useTranslation();
  const columnCount = block.type === BLOCK_TYPE_COLUMNS2 ? 2 : 
                     block.type === BLOCK_TYPE_COLUMNS3 ? 3 : 
                     block.type === BLOCK_TYPE_COLUMNS4 ? 4 : 5;

  const columns = block.columns || Array.from({ length: columnCount }, () => [
    {
      id: `col-${Math.random().toString(36).substr(2, 9)}`,
      type: BLOCK_TYPE_PARAGRAPH,
      text: '',
    }
  ]);

  const defaultWidths = Array(columnCount).fill(100 / columnCount);
  const columnWidths = block.columnWidths || defaultWidths;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const columnRefs = useRef<Array<React.RefObject<HTMLDivElement | null>>>(
    Array.from({ length: columnCount }, () => React.createRef<HTMLDivElement>())
  );

  // Create independent selection systems for each column
  const columnSelections = columns.map((columnBlocks, columnIndex) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useNestedBlockSelection({
      containerId: `${block.id}-col-${columnIndex}`,
      children: columnBlocks,
      onChildrenUpdate: (newBlocks) => {
        onColumnUpdate?.(block.id, columnIndex, newBlocks);
      },
      containerRef: columnRefs.current[columnIndex],
    });
  });

  useEffect(() => {
    return () => {
      if (resizeCleanupRef.current) {
        resizeCleanupRef.current();
      }
    };
  }, []);

  const handleColumnBlockUpdate = useCallback((columnIndex: number, blockId: string, text: string) => {
    const columnBlocks = columns[columnIndex];
    const currentBlock = columnBlocks.find((b) => b.id === blockId);
    
    if (!currentBlock) return;
    
    if (isBulletListTrigger(text)) {
      const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      if (element) {
        element.innerHTML = '';
        element.textContent = '';
      }
      
      const newBlocks = columnBlocks.map((b) =>
        b.id === blockId ? { ...b, type: BLOCK_TYPE_BULLETED as BlockType, text: '' } : b
      );
      onColumnUpdate?.(block.id, columnIndex, newBlocks);
      
      setTimeout(() => {
        const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
        if (element) {
          element.focus();
          setCaretToStart(element);
        }
      }, 0);
      return;
    }
    
    const startNumber = getNumberedListTrigger(text);
    if (startNumber !== null) {
      const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      if (element) {
        element.innerHTML = '';
        element.textContent = '';
      }
      
      const newBlocks = columnBlocks.map((b) =>
        b.id === blockId ? { 
          ...b, 
          type: BLOCK_TYPE_NUMBERED as BlockType, 
          text: '', 
          ...(startNumber > 1 ? { startNumber } : {}) // Only set startNumber if > 1
        } : b
      );
      onColumnUpdate?.(block.id, columnIndex, newBlocks);
      
      setTimeout(() => {
        const element = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
        if (element) {
          element.focus();
          setCaretToStart(element);
        }
      }, 0);
      return;
    }
    
    if (text.includes('/') && onSlashMenu) {
      const slashIndex = text.lastIndexOf('/');
      const textBeforeSlash = text.slice(0, slashIndex).trim();
      
      if (textBeforeSlash.length === 0) {
        const filter = text.slice(slashIndex + 1);
        const coords = getCaretCoordinates();
        
        if (coords) {
          onSlashMenu(blockId, filter, { x: coords.left, y: coords.bottom });
        }
      }
    }
    
    if (onColumnUpdate) {
      const newBlocks = columns[columnIndex].map((b) =>
        b.id === blockId ? { ...b, text } : b
      );
      onColumnUpdate(block.id, columnIndex, newBlocks);
    }
  }, [block.id, columns, onColumnUpdate, onSlashMenu]);

  const createColumnKeyboardHandler = useCallback((columnIndex: number) => {
    const columnBlocks = columns[columnIndex];
    
    return createNestedBlockKeyboardHandler({
      blocks: columnBlocks,
      parentBlockId: block.id,
      onBlocksUpdate: (newBlocks) => {
        onColumnUpdate?.(block.id, columnIndex, newBlocks);
      },
      onExitToParent: () => {
        if (onCreateBlockAfterColumn) {
          onCreateBlockAfterColumn(block.id);
        }
      },
    });
  }, [block.id, columns, onColumnUpdate, onCreateBlockAfterColumn]);
  
  const handleKeyDown = useCallback((columnIndex: number) => {
    return (e: React.KeyboardEvent, blockId: string, blockIndex: number) => {
      if (e.key === KEY_TAB && !e.shiftKey) {
        const nextColumnIndex = columnIndex + 1;
        if (nextColumnIndex < columns.length) {
          e.preventDefault();
          e.stopPropagation();
          
          const nextColumnFirstBlockId = columns[nextColumnIndex][0]?.id;
          if (nextColumnFirstBlockId) {
            setTimeout(() => {
              const nextElement = document.querySelector(`[data-block-id="${nextColumnFirstBlockId}"]`) as HTMLElement;
              if (nextElement) {
                nextElement.focus();
                setCaretToStart(nextElement);
              }
            }, 0);
          }
          return;
        } else if (onCreateBlockAfterColumn) {
          e.preventDefault();
          e.stopPropagation();
          onCreateBlockAfterColumn(block.id);
          return;
        }
      }
      
      if (e.key === KEY_TAB && e.shiftKey) {
        const prevColumnIndex = columnIndex - 1;
        if (prevColumnIndex >= 0) {
          e.preventDefault();
          e.stopPropagation();
          
          const prevColumnFirstBlockId = columns[prevColumnIndex][0]?.id;
          if (prevColumnFirstBlockId) {
            setTimeout(() => {
              const prevElement = document.querySelector(`[data-block-id="${prevColumnFirstBlockId}"]`) as HTMLElement;
              if (prevElement) {
                prevElement.focus();
                setCaretToStart(prevElement);
              }
            }, 0);
          }
          return;
        }
      }
      
      const handler = createColumnKeyboardHandler(columnIndex);
      handler(e, blockId, blockIndex);
    };
  }, [createColumnKeyboardHandler, columns, block.id, onCreateBlockAfterColumn]);

  const handlePlusClick = useCallback((columnIndex: number) => (blockId: string, _element: HTMLElement) => {
    const columnBlocks = columns[columnIndex];
    const blockIndex = columnBlocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [
      ...columnBlocks.slice(0, blockIndex + 1),
      newBlock,
      ...columnBlocks.slice(blockIndex + 1),
    ];
    onColumnUpdate?.(block.id, columnIndex, newBlocks);
    
    setTimeout(() => {
      const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);
      }
    }, 0);
  }, [block.id, columns, onColumnUpdate]);

  const handleDotsClick = useCallback((columnIndex: number) => (blockId: string, element: HTMLElement, isInsideToggle?: boolean) => {
    if (parentOnDotsClick) {
      // Pass selected blocks from the corresponding column
      const columnSelection = columnSelections[columnIndex];
      parentOnDotsClick(blockId, element, isInsideToggle, columnSelection?.selectedBlockIds);
    }
  }, [parentOnDotsClick, columnSelections]);

  const handleResizeStart = useCallback((columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isResizingRef.current) {
      return;
    }
    
    if (resizeCleanupRef.current) {
      resizeCleanupRef.current();
    }
    
    isResizingRef.current = true;
    setIsResizing(true);
    setResizingIndex(columnIndex);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.body.style.pointerEvents = 'none';
    
    if (containerRef.current) {
      containerRef.current.style.pointerEvents = 'auto';
    }
    
    const startX = e.clientX;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    const startWidths = [...columnWidths];
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const newWidths = [...startWidths];
      const currentWidth = startWidths[columnIndex];
      const nextWidth = startWidths[columnIndex + 1];
      
      const minWidth = 10;
      const maxCurrentWidth = currentWidth + nextWidth - minWidth;
      
      let newCurrentWidth = currentWidth + deltaPercent;
      let newNextWidth = nextWidth - deltaPercent;
      
      if (newCurrentWidth < minWidth) {
        newCurrentWidth = minWidth;
        newNextWidth = currentWidth + nextWidth - minWidth;
      } else if (newCurrentWidth > maxCurrentWidth) {
        newCurrentWidth = maxCurrentWidth;
        newNextWidth = minWidth;
      }
      
      newWidths[columnIndex] = newCurrentWidth;
      newWidths[columnIndex + 1] = newNextWidth;
      
      if (onColumnWidthsUpdate) {
        onColumnWidthsUpdate(block.id, newWidths);
      }
    };
    
    const cleanup = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      setResizingIndex(null);
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.style.pointerEvents = '';
      
      if (containerRef.current) {
        containerRef.current.style.pointerEvents = '';
      }
      
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      
      resizeCleanupRef.current = null;
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      cleanup();
    };
    
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    
    resizeCleanupRef.current = cleanup;
  }, [columnWidths, block.id, onColumnWidthsUpdate]);

  // Hover state for column block
  const [isHovered, setIsHovered] = useState(false);
  const [dropTargetColumn, setDropTargetColumn] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleColumnBlockDragStart = useCallback((e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.setData('application/x-block-index', String(index));
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    onDragStart?.(index);
  }, [block.id, index, onDragStart]);

  const handleColumnBlockDragEnd = useCallback(() => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  }, []);

  return (
    <div 
      className={`w-full my-2 group/columnblock relative ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 rounded-lg' : ''}`}
      ref={wrapperRef}
      data-block-id={block.id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDownCapture={(e) => {
        // When Cmd/Ctrl is held, handle parent-level block selection
        if ((e.metaKey || e.ctrlKey) && onParentMouseDown) {
          e.stopPropagation();
          e.preventDefault();
          onParentMouseDown(e);
          return;
        }
      }}
    >
      {(onCreateBlockAfterColumn || parentOnPlusClick || parentOnDotsClick) && (
        <div className={`absolute left-[-12px] sm:left-[-40px] md:left-[-50px] top-1 transition-opacity flex items-start gap-0 sm:gap-0.5 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          {(onCreateBlockAfterColumn || parentOnPlusClick) && (
            <button
              type="button"
              className="hidden sm:block text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 w-full px-1 py-0.5"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onCreateBlockAfterColumn) {
                  onCreateBlockAfterColumn(block.id);
                } else if (parentOnPlusClick) {
                  parentOnPlusClick(block.id, e.currentTarget as HTMLElement);
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
          
          {parentOnDotsClick && (
            <button
              type="button"
              draggable={!!onDragStart}
              onDragStart={onDragStart ? handleColumnBlockDragStart : undefined}
              onDragEnd={onDragStart ? handleColumnBlockDragEnd : undefined}
              onClick={(e) => {
                e.stopPropagation();
                if (isDraggingRef.current) return;
                if (parentOnDotsClick) {
                  parentOnDotsClick(block.id, e.currentTarget as HTMLElement, false);
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

      <div 
        ref={containerRef} 
        className="flex flex-col sm:flex-row items-stretch relative overflow-x-hidden"
      >
        {columns.map((columnBlocks, columnIndex) => {
          const columnSelection = columnSelections[columnIndex];
          const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
          return (
          <div
            key={columnIndex}
            className={`relative group/column max-sm:!w-full max-sm:!ml-0 max-sm:!mr-0 max-sm:!pl-0 max-sm:!pr-0 max-sm:!mb-4 ${
              columnIndex > 0 ? 'sm:border-l-2 border-transparent hover:border-l-gray-300 dark:hover:border-l-gray-600' : ''
            } ${
              columnIndex < columns.length - 1 ? 'sm:border-r-2 border-transparent hover:border-r-gray-300 dark:hover:border-r-gray-600' : ''
            } ${
              isResizing && (resizingIndex === columnIndex || resizingIndex === columnIndex - 1)
                ? columnIndex > 0 ? 'border-l-blue-400 dark:border-l-blue-500' : ''
                : ''
            } ${
              isResizing && resizingIndex === columnIndex
                ? columnIndex < columns.length - 1 ? 'border-r-blue-400 dark:border-r-blue-500' : ''
                : ''
            } transition-colors overflow-x-hidden`}
            style={isMobile ? {} : { 
              width: `calc(${columnWidths[columnIndex]}% - ${columnIndex < columns.length - 1 ? '10px' : '0px'})`,
              minWidth: 0,
              paddingLeft: columnIndex === 0 ? 0 : 10,
              paddingRight: 10,
              marginRight: columnIndex < columns.length - 1 ? '10px' : '0',
            }}
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              const isResizeHandle = target.closest('[data-resize-handle]');
                
              if (isResizeHandle) {
                return;
              }
              
              if (target === e.currentTarget) {
                e.stopPropagation();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'move';
              setDropTargetColumn(columnIndex);
            }}
            onDragLeave={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!e.currentTarget.contains(relatedTarget)) {
                setDropTargetColumn(null);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const draggedBlockId = e.dataTransfer.getData('text/plain');
              if (draggedBlockId && onDropBlockIntoColumn && draggedBlockId !== block.id) {
                onDropBlockIntoColumn(draggedBlockId, block.id, columnIndex);
              }
              setDropTargetColumn(null);
            }}
          >
            {/* Drop indicator for dragging blocks into column */}
            <div className={`absolute inset-0 border-2 border-dashed rounded-lg pointer-events-none z-10 transition-all duration-200 ease-out ${
              dropTargetColumn === columnIndex 
                ? 'border-[#0086F4] bg-blue-50/40 dark:bg-blue-900/20 opacity-100 scale-100' 
                : 'border-transparent bg-transparent opacity-0 scale-[0.98]'
            }`} />
            
            <div 
              ref={columnRefs.current[columnIndex]}
              className={`space-y-1 min-h-[100px] overflow-x-auto relative ${columnSelection.isSelecting ? 'select-none' : ''}`}
              onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                const isResizeHandle = target.closest('[data-resize-handle]');
                
                if (isResizeHandle) {
                  return;
                }
                
                const isBlockElement = target.closest('[data-block-id]');
                if (!isBlockElement && target === e.currentTarget) {
                  columnSelection.handleContainerMouseDown(e);
                }
                // Always stop propagation to the parent editor
                e.stopPropagation();
              }}
            >
              {columnBlocks.map((columnBlock, blockIndex) => (
                <BlockView
                  key={columnBlock.id}
                  block={columnBlock}
                  index={blockIndex}
                  isFirst={blockIndex === 0}
                  onUpdate={(id, text) => handleColumnBlockUpdate(columnIndex, id, text)}
                  onKeyDown={handleKeyDown(columnIndex)}
                  onCheckToggle={onCheckToggle}
                  onImageUpload={onImageUpload}
                  onImageDelete={onImageDelete}
                  onImageResize={onImageResize}
                  onImageAlignmentChange={onImageAlignmentChange}
                  onDrawingUpdate={onDrawingUpdate}
                  onVideoUpload={onVideoUpload}
                  onVideoDelete={onVideoDelete}
                  onVideoAlignmentChange={onVideoAlignmentChange}
                  onVideoDuplicate={onVideoDuplicate}
                  onAudioUpload={onAudioUpload}
                  onAudioDelete={onAudioDelete}
                  onPdfUpload={onPdfUpload}
                  onPdfDelete={onPdfDelete}
                  onPdfResize={onPdfResize}
                  onPdfAlignmentChange={onPdfAlignmentChange}
                  onPdfDuplicate={onPdfDuplicate}
                  onPlusClick={onCreateBlockAfterColumn ? handlePlusClick(columnIndex) : undefined}
                  onDotsClick={parentOnDotsClick ? handleDotsClick(columnIndex) : undefined}
                  onSlashMenu={onSlashMenu}
                  onCloseSlashMenu={onCloseSlashMenu}
                  slashMenuBlockId={slashMenuBlockId}
                  allBlocks={columnBlocks}
                  isSelected={columnSelection.selectedBlockIds.has(columnBlock.id)}
                  isSelecting={columnSelection.isSelecting}
                  onMouseDown={(e) => columnSelection.handleNestedMouseDown(e, columnBlock.id)}
                  onMouseEnter={(e) => columnSelection.handleNestedMouseEnter(e, columnBlock.id)}
                  isInsideColumn={true}
                />
              ))}
              
              {/* Visual selection indicator while dragging */}
              {columnSelection.isSelecting && columnSelection.cursorPosition && columnSelection.selectionStartPos && (
                <div
                  className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-400 bg-opacity-20 rounded-lg"
                  style={{
                    left: Math.min(columnSelection.selectionStartPos.x, columnSelection.cursorPosition.x),
                    top: Math.min(columnSelection.selectionStartPos.y, columnSelection.cursorPosition.y),
                    width: Math.abs(columnSelection.cursorPosition.x - columnSelection.selectionStartPos.x),
                    height: Math.abs(columnSelection.cursorPosition.y - columnSelection.selectionStartPos.y),
                  }}
                />
              )}
            </div>
              
            {columnIndex > 0 && (
              <div
                data-resize-handle="left"
                className={`hidden sm:flex absolute top-0 bottom-0 left-0 items-center justify-center group/resize-left select-none ${
                  isResizing && resizingIndex === columnIndex - 1 ? 'z-[100]' : 'z-[60]'
                }`}
                style={{ 
                  width: '20px',
                  marginLeft: '-10px',
                  cursor: 'col-resize',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handleResizeStart(columnIndex - 1, e);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'col-resize';
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  if (!isResizingRef.current) {
                    document.body.style.cursor = '';
                  }
                }}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                title={t('editor.dragToResizeColumns')}
              >
                {!isResizing && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/resize-left:opacity-100 transition-opacity pointer-events-none"
                  >
                    <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor" className="text-gray-500 dark:text-gray-400">
                      <circle cx="2" cy="4" r="1.5" />
                      <circle cx="2" cy="8" r="1.5" />
                      <circle cx="2" cy="12" r="1.5" />
                    </svg>
                  </div>
                )}
              </div>
            )}

            {columnIndex < columns.length - 1 && (
              <div
                data-resize-handle="right"
                className={`hidden sm:flex absolute top-0 bottom-0 right-0 items-center justify-center group/resize-right select-none ${
                  isResizing && resizingIndex === columnIndex ? 'z-[100]' : 'z-[60]'
                }`}
                style={{ 
                  width: '20px',
                  marginRight: '-10px',
                  cursor: 'col-resize',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  handleResizeStart(columnIndex, e);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  document.body.style.cursor = 'col-resize';
                }}
                onMouseLeave={(e) => {
                  e.stopPropagation();
                  if (!isResizingRef.current) {
                    document.body.style.cursor = '';
                  }
                }}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                title={t('editor.dragToResizeColumns')}
              >
                {!isResizing && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/resize-right:opacity-100 transition-opacity pointer-events-none"
                  >
                    <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor" className="text-gray-500 dark:text-gray-400">
                      <circle cx="2" cy="4" r="1.5" />
                      <circle cx="2" cy="8" r="1.5" />
                      <circle cx="2" cy="12" r="1.5" />
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
};

