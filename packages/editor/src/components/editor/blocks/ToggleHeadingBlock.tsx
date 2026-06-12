import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { BlockRendererProps } from './types';
import { Block } from '../../../types/editor';
import { BlockView } from '../BlockView';
import { useNestedBlockHandlers } from '../../../hooks/editor/useNestedBlockHandlers';
import { useToggleBlockKeyboard } from '../../../hooks/editor/useToggleBlockKeyboard';
import { useNestedBlockSelection } from '../../../hooks/editor/useNestedBlockSelection';

interface ToggleHeadingBlockProps extends BlockRendererProps {
  level: 1 | 2 | 3;
  onToggle?: (id: string, isOpen: boolean) => void;
  onChildUpdate?: (blockId: string, children: Block[]) => void;
  onCreateBlockAfterToggle?: (toggleBlockId: string) => void;
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
  onPlusClick?: (blockId: string, element: HTMLElement) => void;
  onDotsClick?: (blockId: string, element: HTMLElement, isInsideToggle?: boolean, selectedBlockIds?: Set<string>) => void;
  onSlashMenu?: (blockId: string, filter: string, position: { x: number; y: number }) => void;
  onCloseSlashMenu?: () => void;
  slashMenuBlockId?: string | null;
  selectedBlockIds?: Set<string>;
  onBlockMouseDown?: (e: React.MouseEvent, blockId: string) => void;
  onBlockMouseEnter?: (e: React.MouseEvent, blockId: string) => void;
}

const headingConfig = {
  1: { className: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight', tag: 'h1' as const, marginTop: 'mt-6', iconSize: 28 },
  2: { className: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-snug', tag: 'h2' as const, marginTop: 'mt-5', iconSize: 24 },
  3: { className: 'text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-normal', tag: 'h3' as const, marginTop: 'mt-4', iconSize: 20 },
};

export const ToggleHeadingBlock: React.FC<ToggleHeadingBlockProps> = ({
  block,
  level,
  baseClasses,
  contentProps,
  onToggle,
  onChildUpdate,
  onCreateBlockAfterToggle,
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
  onSlashMenu,
  onCloseSlashMenu,
  slashMenuBlockId,
}) => {
  const { t } = useTranslation();
  const config = headingConfig[level];
  const HeadingTag = config.tag;
  const [isOpen, setIsOpen] = useState(block.isOpen !== false);
  const childrenContainerRef = useRef<HTMLDivElement>(null);

  const { handleChildBlockUpdate, handleChildKeyDown } = useNestedBlockHandlers({
    parentBlockId: block.id,
    children: block.children,
    onChildUpdate: onChildUpdate!,
    onSlashMenu,
    parentElementRef: childrenContainerRef,
    onExitToParent: onCreateBlockAfterToggle ? () => onCreateBlockAfterToggle(block.id) : undefined,
  });

  const { handleKeyDown } = useToggleBlockKeyboard({
    block,
    isOpen,
    childrenContainerRef,
    onToggle,
    onChildUpdate,
    contentPropsOnKeyDown: contentProps.onKeyDown,
  });

  // Nested selection system for child blocks
  const {
    selectedBlockIds: nestedSelectedBlockIds,
    isSelecting: nestedIsSelecting,
    cursorPosition,
    selectionStartPos,
    handleNestedMouseDown,
    handleNestedMouseEnter,
    handleContainerMouseDown,
  } = useNestedBlockSelection({
    containerId: block.id,
    children: block.children || [],
    onChildrenUpdate: (newChildren) => {
      if (onChildUpdate) {
        onChildUpdate(block.id, newChildren);
      }
    },
    containerRef: childrenContainerRef,
  });

  useEffect(() => {
    setIsOpen(block.isOpen !== false);
  }, [block.isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    if (onToggle) {
      onToggle(block.id, newIsOpen);
    }
  };

  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={`toggle-heading-block ${config.marginTop}`}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggle}
          onMouseDown={handleButtonMouseDown}
          className="flex-shrink-0 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label={isOpen ? t('editor.collapse') : t('editor.expand')}
          aria-expanded={isOpen}
          tabIndex={-1}
        >
          {isOpen ? (
            <ChevronDown size={config.iconSize} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight size={config.iconSize} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>
        <HeadingTag
          {...(contentProps as any)}
          onKeyDown={handleKeyDown}
          className={`${baseClasses} ${config.className} text-black dark:text-gray-100 flex-1 min-w-0`}
        />
      </div>
      
      {isOpen && (
        <div 
          ref={childrenContainerRef} 
          className={`ml-9 mt-2 space-y-1 relative ${nestedIsSelecting ? 'select-none' : ''}`}
          onMouseDown={(e) => {
            handleContainerMouseDown(e);
            e.stopPropagation(); // Stop propagation to the parent editor
          }}
        >
          {block.children && block.children.length > 0 && block.children.map((child, index) => (
            <BlockView
              key={child.id}
              block={child}
              index={index}
              isFirst={index === 0}
              onUpdate={handleChildBlockUpdate}
              onKeyDown={handleChildKeyDown}
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
              onSlashMenu={onSlashMenu}
              onCloseSlashMenu={onCloseSlashMenu}
              slashMenuBlockId={slashMenuBlockId}
              allBlocks={block.children}
              isSelected={nestedSelectedBlockIds.has(child.id)}
              isSelecting={nestedIsSelecting}
              isInsideToggle={true}
              onMouseDown={(e) => handleNestedMouseDown(e, child.id)}
              onMouseEnter={(e) => handleNestedMouseEnter(e, child.id)}
            />
          ))}
          
          {/* Visual selection indicator while dragging */}
          {nestedIsSelecting && cursorPosition && selectionStartPos && createPortal(
            <div
              className="fixed pointer-events-none z-50 border-2 border-blue-500 bg-blue-400 bg-opacity-20 rounded-lg"
              style={{
                left: Math.min(selectionStartPos.x, cursorPosition.x),
                top: Math.min(selectionStartPos.y, cursorPosition.y),
                width: Math.abs(cursorPosition.x - selectionStartPos.x),
                height: Math.abs(cursorPosition.y - selectionStartPos.y),
              }}
            />,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

