import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import { Block } from '../../../types/editor';
import { BlockView } from '../BlockView';
import { EmojiPicker, EmojiPickerSearch, EmojiPickerContent, EmojiPickerFooter } from '../../ui/emoji-picker';
import { useNestedBlockHandlers } from '@/hooks/editor/useNestedBlockHandlers.ts';
import { useNestedBlockSelection } from '@/hooks/editor/useNestedBlockSelection.ts';
import { renderTextWithHtml, hasLatexExpressions } from '@/utils/latexRenderer.tsx';
import { useEditableBlock } from '@/hooks/editor/useEditableBlock.ts';
import { useScrollLock } from '@/hooks/editor/useScrollLock.ts';
import { getTextColorClass } from '@/utils/editorUtils.ts';

interface CalloutBlockProps extends BlockRendererProps {
  onEmojiChange?: (blockId: string, emoji: string) => void;
  onChildUpdate?: (blockId: string, children: Block[]) => void;
  onCreateBlockAfterCallout?: (calloutBlockId: string) => void;
  onDissolveCallout?: (calloutBlockId: string) => void;
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
  isSelecting?: boolean;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({
  block,
  baseClasses,
  contentProps,
  onEmojiChange,
  onChildUpdate,
  onCreateBlockAfterCallout,
  onDissolveCallout,
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ top: number; left: number } | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const childrenContainerRef = useRef<HTMLDivElement>(null);
  const { editableRef, isEditing, setIsEditing } = useEditableBlock(block.text);
  const textColorClass = getTextColorClass(block.textColor, 'text-black dark:text-white');
  const hasLatex = hasLatexExpressions(block.text || '');
  
  const emoji = block.emoji || '💡';

  const updatePickerPosition = useCallback(() => {
    if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setPickerPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, []);

  const handleToggleEmojiPicker = useCallback(() => {
    if (!showEmojiPicker) {
      updatePickerPosition();
    }
    setShowEmojiPicker(prev => !prev);
  }, [showEmojiPicker, updatePickerPosition]);

  // Close emoji picker on outside scroll/resize to avoid stale positioning
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleScroll = (e: Event) => {
      // Ignore scroll events that originate from inside the emoji picker
      if (pickerRef.current && pickerRef.current.contains(e.target as Node)) return;
      setShowEmojiPicker(false);
    };
    const handleResize = () => setShowEmojiPicker(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showEmojiPicker]);

  useScrollLock(showEmojiPicker);

  const handleEmojiSelect = (emoji: { emoji: string }) => {
    if (onEmojiChange) {
      onEmojiChange(block.id, emoji.emoji);
    }
    setShowEmojiPicker(false);
  };

  const { handleChildBlockUpdate, handleChildKeyDown } = useNestedBlockHandlers({
    parentBlockId: block.id,
    parentBlockType: block.type,
    children: block.children,
    onChildUpdate: onChildUpdate!,
    onSlashMenu,
    parentElementRef: childrenContainerRef,
    onExitToParent: onCreateBlockAfterCallout ? () => onCreateBlockAfterCallout(block.id) : undefined,
    onDissolveParent: onDissolveCallout ? () => onDissolveCallout(block.id) : undefined,
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


  return (
    <div className="w-full my-2">
      <div 
        data-block-id={block.id}
        className="w-full max-w-full bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4 relative"
      >
        {showEmojiPicker && pickerPosition && createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowEmojiPicker(false)}
            />
            <div
              ref={pickerRef}
              className="fixed z-50"
              style={{ top: pickerPosition.top, left: pickerPosition.left }}
            >
              <EmojiPicker
                className="h-[420px] w-[370px]"
                onEmojiSelect={handleEmojiSelect}
              >
                <EmojiPickerSearch />
                <EmojiPickerContent />
                <EmojiPickerFooter />
              </EmojiPicker>
            </div>
          </>,
          document.body
        )}

        <div className="flex items-start gap-3">
          <button
            ref={emojiButtonRef}
            type="button"
            className="flex-shrink-0 text-2xl hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded p-1 transition-colors cursor-pointer select-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleEmojiPicker();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
            }}
            aria-label={t('editor.selectEmoji')}
          >
            {emoji}
          </button>

          <div 
            ref={childrenContainerRef}
            className={`flex-1 min-w-0 space-y-1 relative ${nestedIsSelecting ? 'select-none' : ''}`}
            onMouseDown={(e) => {
              handleContainerMouseDown(e);
              e.stopPropagation();
            }}
          >
            {block.text && (!block.children || block.children.length === 0) && (
              <div className="mt-1">
                {hasLatex && !isEditing ? (
                  <div 
                    data-block-id={block.id}
                    className={`${textColorClass} cursor-text`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    {renderTextWithHtml(block.text)}
                  </div>
                ) : (
                  <div 
                    ref={editableRef}
                    data-block-id={block.id}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => {
                      if (contentProps?.onInput) {
                        contentProps.onInput(e);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (contentProps?.onKeyDown) {
                        contentProps.onKeyDown(e);
                      }
                    }}
                    className={`${baseClasses} ${textColorClass}`}
                    onFocus={() => {
                      setIsEditing(true);
                    }}
                    onBlur={() => {
                      setIsEditing(false);
                    }}
                    {...(contentProps && (contentProps as any)['data-placeholder'] ? { 'data-placeholder': (contentProps as any)['data-placeholder'] } : {})}
                  />
                )}
              </div>
            )}

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
        </div>
      </div>
    </div>
  );
};

