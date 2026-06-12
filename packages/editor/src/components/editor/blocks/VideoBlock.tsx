import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2, CopyPlus, AlignLeft, AlignCenter, AlignRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getFullMediaUrl } from '@/utils/urlUtils';
import { VideoPlayer } from '@/components/VideoPlayer';

export const VideoBlock: React.FC<BlockRendererProps> = ({
  block,
  imageWidth,
  imageRef: _imageRef,
  fileInputRef,
  triggerFileInput,
  handleFileSelect,
  handleResizeStart,
  isResizing,
  setIsFocused,
  onVideoUpload,
  videoUploadProgress,
  onVideoDelete,
  onVideoResize,
  onVideoAlignmentChange,
  onVideoDuplicate,
  onUpdateBlock,
  isSelecting,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditingCaption && captionRef.current) {
      captionRef.current.focus();
    }
  }, [isEditingCaption]);

  const handleCaptionBlur = useCallback(() => {
    const newCaption = captionRef.current?.textContent?.trim() || '';
    if (onUpdateBlock) {
      onUpdateBlock(block.id, { ...block, caption: newCaption || undefined });
    }
    if (!newCaption) {
      setIsEditingCaption(false);
    }
  }, [block, onUpdateBlock]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) {
        if (onVideoUpload) {
          onVideoUpload(block.id, file);
        }
      } else {
        toast.error(t('editor.pleaseUploadVideo'));
      }
    },
    [block.id, onVideoUpload, t]
  );

  const handleVideoClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      return;
    }
    wrapperRef.current?.focus();
  };

  const handleDeleteKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onVideoDelete?.(block.id);
    }
  };

  useEffect(() => {
    if (!block.videoUrl || !onVideoResize || !containerRef.current) {
      return;
    }

    let columnParent = containerRef.current.closest('[class*="w-1/"]');
    
    if (!columnParent) {
      let parent = containerRef.current.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.width && parent.style.width && parent.style.width.includes('%')) {
          columnParent = parent;
          break;
        }
        parent = parent.parentElement;
        if (parent?.classList.contains('px-10')) break;
      }
    }

    if (!columnParent) {
      return;
    }

    const videoWidthRef = { current: block.videoWidth || 0 };
    const previousMaxWidthRef = { current: 0 };

    const constrainToColumn = () => {
      if (!columnParent) return;
      
      const columnWidth = columnParent.getBoundingClientRect().width;
      const innerDiv = columnParent.querySelector('[class*="pl-16"]');
      
      let maxWidth = Math.floor(columnWidth);
      if (innerDiv && innerDiv.contains(containerRef.current)) {
        maxWidth -= 64;
      }
      maxWidth = Math.max(200, maxWidth - 16);

      const currentWidth = videoWidthRef.current || 800;
      
      if (previousMaxWidthRef.current > 0 && Math.abs(maxWidth - previousMaxWidthRef.current) > 5) {
        const widthRatio = maxWidth / previousMaxWidthRef.current;
        let newWidth = Math.round(currentWidth * widthRatio);
        newWidth = Math.max(200, Math.min(newWidth, maxWidth));
        
        const aspectRatio = 16 / 9;
        const newHeight = Math.round(newWidth / aspectRatio);
        onVideoResize(block.id, newWidth, newHeight);
      } else if (currentWidth > maxWidth) {
        const constrainedWidth = maxWidth;
        const aspectRatio = 16 / 9;
        const constrainedHeight = Math.round(constrainedWidth / aspectRatio);
        onVideoResize(block.id, constrainedWidth, constrainedHeight);
      }
      
      previousMaxWidthRef.current = maxWidth;
    };

    constrainToColumn();

    const resizeObserver = new ResizeObserver(() => {
      constrainToColumn();
    });

    resizeObserver.observe(columnParent);

    return () => {
      resizeObserver.disconnect();
      previousMaxWidthRef.current = 0;
    };
  }, [block.videoUrl, block.id, onVideoResize]);

  const isVideoUploading = videoUploadProgress != null;

  if (!block.videoUrl) {
    return (
      <div className="my-2">
        <div
          className={`relative border-2 ${
            isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-dashed border-gray-300 dark:border-gray-600'
          } rounded-md p-3 text-center transition-colors cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={isVideoUploading ? undefined : triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          {isVideoUploading ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${videoUploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(videoUploadProgress ?? 0) >= 100
                  ? t('exercises.video.processing')
                  : t('exercises.video.uploading', { percent: videoUploadProgress ?? 0 })}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg
                className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <div className="text-left">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('editor.clickOrDragVideo')}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-500">
                  MP4, WebM, MOV, MKV, AVI
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const alignment = block.videoAlignment || 'left';
  
  const getAlignmentClass = () => {
    switch (alignment) {
      case 'center':
        return 'items-center';
      case 'right':
        return 'items-end';
      case 'left':
      default:
        return 'items-start';
    }
  };

  const width = imageWidth || block.videoWidth || 800;

  return (
    <div ref={containerRef} className="my-4" data-block-id={block.id}>
      <div className={`flex flex-col ${getAlignmentClass()} w-full group`}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={wrapperRef}
            tabIndex={0}
            onKeyDown={handleDeleteKey}
            onFocus={() => setIsFocused?.(true)}
            onBlur={() => setIsFocused?.(false)}
            className="relative group outline-none max-w-full"
            style={{
              width: `${width}px`,
              maxWidth: '100%',
            }}
          >
            <div
              style={{
                pointerEvents: (isSelecting || isResizing) ? 'none' : 'auto',
                userSelect: 'none',
              }}
              onClick={handleVideoClick}
            >
              <VideoPlayer
                src={getFullMediaUrl(block.videoUrl) || ''}
                className="rounded-lg w-full"
              />
            </div>

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10 bg-black/70 rounded-lg p-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoAlignmentChange?.(block.id, 'left');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                  (!block.videoAlignment || block.videoAlignment === 'left') ? 'ring-2 ring-blue-500' : ''
                }`}
                title={t('editor.alignLeft')}
              >
                <AlignLeft size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoAlignmentChange?.(block.id, 'center');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                  block.videoAlignment === 'center' ? 'ring-2 ring-blue-500' : ''
                }`}
                title={t('editor.alignCenter')}
              >
                <AlignCenter size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoAlignmentChange?.(block.id, 'right');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                  block.videoAlignment === 'right' ? 'ring-2 ring-blue-500' : ''
                }`}
                title={t('editor.alignRight')}
              >
                <AlignRight size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onVideoDelete?.(block.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 p-1.5 rounded-md text-sm hover:bg-red-50 dark:hover:bg-red-950 border border-gray-300 dark:border-gray-600"
                title={t('editor.delete')}
              >
                <Trash2 size={11} />
              </button>
            </div>

            {!isResizing && (
              <>
                <div
                  className="absolute top-0 left-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart?.(e, 'l')}
                  style={{
                    background: 'linear-gradient(270deg, transparent, rgba(59, 130, 246, 0.5))',
                  }}
                />
                <div
                  className="absolute top-0 right-0 w-2 h-full cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                  onMouseDown={(e) => handleResizeStart?.(e, 'r')}
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.5))',
                  }}
                />
              </>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onVideoDuplicate?.(block.id)}>
            <CopyPlus className="mr-2 h-4 w-4" />
            <span>{t('editor.duplicate')}</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onVideoAlignmentChange?.(block.id, 'left')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlignLeft className="mr-2 h-4 w-4" />
              <span>{t('editor.alignLeft')}</span>
            </div>
            {alignment === 'left' && <Check className="h-4 w-4" />}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onVideoAlignmentChange?.(block.id, 'center')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlignCenter className="mr-2 h-4 w-4" />
              <span>{t('editor.alignCenter')}</span>
            </div>
            {alignment === 'center' && <Check className="h-4 w-4" />}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onVideoAlignmentChange?.(block.id, 'right')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlignRight className="mr-2 h-4 w-4" />
              <span>{t('editor.alignRight')}</span>
            </div>
            {alignment === 'right' && <Check className="h-4 w-4" />}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onVideoDelete?.(block.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>{t('editor.delete')}</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {block.caption || isEditingCaption ? (
        <div
          ref={captionRef}
          contentEditable
          suppressContentEditableWarning
          className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center outline-none focus:text-gray-700 dark:focus:text-gray-300 w-full empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500"
          data-placeholder={t('editor.addCaption')}
          style={{ maxWidth: `${width}px` }}
          onBlur={handleCaptionBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              captionRef.current?.blur();
            }
            e.stopPropagation();
          }}
          dangerouslySetInnerHTML={{ __html: block.caption || '' }}
        />
      ) : (
        <div
          className="mt-1 text-sm text-gray-400 dark:text-gray-500 text-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ maxWidth: `${width}px` }}
          onClick={() => setIsEditingCaption(true)}
        >
          {t('editor.addCaption')}
        </div>
      )}
      </div>
    </div>
  );
};

