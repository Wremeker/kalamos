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
import { Trash2, CopyPlus, AlignLeft, AlignCenter, AlignRight, Check, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useSignedUrl } from '@/hooks/useSignedUrl';

export const PDFBlock: React.FC<BlockRendererProps> = ({
  block,
  imageWidth,
  imageRef,
  fileInputRef,
  triggerFileInput,
  handleFileSelect,
  handleResizeStart,
  isResizing,
  setIsFocused,
  onPdfUpload,
  onPdfDelete,
  onPdfResize,
  onPdfAlignmentChange,
  onPdfDuplicate,
  isSelecting,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { signedUrl: pdfSrc } = useSignedUrl(block.pdfUrl);

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
      if (file && file.type === 'application/pdf') {
        if (onPdfUpload) {
          onPdfUpload(block.id, file);
        }
      } else {
        toast.error(t('editor.pleaseUploadPdf'));
      }
    },
    [block.id, onPdfUpload, t]
  );

  const handlePdfClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      return;
    }
    wrapperRef.current?.focus();
  };

  const handleDeleteKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onPdfDelete?.(block.id);
    }
  };

  useEffect(() => {
    if (!block.pdfUrl || !onPdfResize || !containerRef.current) {
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

    const iframe = imageRef?.current as HTMLIFrameElement | null;
    if (!iframe || !(iframe instanceof HTMLIFrameElement)) {
      return;
    }

    const pdfWidthRef = { current: block.pdfWidth || 0 };
    const previousMaxWidthRef = { current: 0 };

    const constrainToColumn = () => {
      if (!columnParent || !iframe) return;
      
      const columnWidth = columnParent.getBoundingClientRect().width;
      const innerDiv = columnParent.querySelector('[class*="pl-16"]');
      
      let maxWidth = Math.floor(columnWidth);
      if (innerDiv && innerDiv.contains(containerRef.current)) {
        maxWidth -= 64;
      }
      maxWidth = Math.max(200, maxWidth - 16);

      const currentWidth = pdfWidthRef.current || maxWidth;
      
      if (previousMaxWidthRef.current > 0 && Math.abs(maxWidth - previousMaxWidthRef.current) > 5) {
        const widthRatio = maxWidth / previousMaxWidthRef.current;
        let newWidth = Math.round(currentWidth * widthRatio);
        newWidth = Math.max(200, Math.min(newWidth, maxWidth));
        
        // A4 aspect ratio
        const aspectRatio = 1 / 1.414;
        const newHeight = Math.round(newWidth / aspectRatio);
        onPdfResize(block.id, newWidth, newHeight);
      } else if (currentWidth > maxWidth) {
        const constrainedWidth = maxWidth;
        const aspectRatio = 1 / 1.414;
        const constrainedHeight = Math.round(constrainedWidth / aspectRatio);
        onPdfResize(block.id, constrainedWidth, constrainedHeight);
      }
      
      previousMaxWidthRef.current = maxWidth;
    };

    const loadHandler = () => {
      constrainToColumn();
    };

    if (iframe.contentWindow) {
      constrainToColumn();
    } else {
      iframe.addEventListener('load', loadHandler);
    }

    const resizeObserver = new ResizeObserver(() => {
      constrainToColumn();
    });

    if (columnParent) {
      resizeObserver.observe(columnParent);
    }

    return () => {
      iframe.removeEventListener('load', loadHandler);
      resizeObserver.disconnect();
      previousMaxWidthRef.current = 0;
    };
  }, [block.pdfUrl, block.id, onPdfResize, imageRef]);

  if (!block.pdfUrl) {
    return (
      <div className="my-2">
        <div
          className={`relative border-2 ${
            isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-dashed border-gray-300 dark:border-gray-600'
          } rounded-md p-3 text-center transition-colors cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <div className="text-left">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('editor.clickOrDragPdf')}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-500">
                {t('editor.pdfDocument')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const alignment = block.pdfAlignment || 'left';
  
  const getAlignmentClass = () => {
    switch (alignment) {
      case 'center':
        return 'justify-center';
      case 'right':
        return 'justify-end';
      case 'left':
      default:
        return 'justify-start';
    }
  };

  const width = imageWidth || block.pdfWidth || 800;
  const height = block.pdfHeight || Math.round(width / (1 / 1.414));

  return (
    <div ref={containerRef} className="my-4" data-block-id={block.id}>
      <div className={`flex ${getAlignmentClass()} w-full`}>
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
            <iframe
              ref={imageRef as unknown as React.RefObject<HTMLIFrameElement>}
              src={pdfSrc || ''}
              className="rounded-lg w-full border border-gray-300 dark:border-gray-600"
              style={{
                height: `${height}px`,
                pointerEvents: (isSelecting || isResizing) ? 'none' : 'auto',
                userSelect: 'none',
              }}
              onClick={handlePdfClick}
              title="PDF Document"
            />

            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10 bg-black/70 rounded-lg p-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPdfAlignmentChange?.(block.id, 'left');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                  (!block.pdfAlignment || block.pdfAlignment === 'left') ? 'ring-2 ring-blue-500' : ''
                }`}
                title={t('editor.alignLeft')}
              >
                <AlignLeft size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPdfAlignmentChange?.(block.id, 'center');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                  block.pdfAlignment === 'center' ? 'ring-2 ring-blue-500' : ''
                }`}
                title={t('editor.alignCenter')}
              >
                <AlignCenter size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPdfAlignmentChange?.(block.id, 'right');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                  block.pdfAlignment === 'right' ? 'ring-2 ring-blue-500' : ''
                }`}
                title={t('editor.alignRight')}
              >
                <AlignRight size={11} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPdfDelete?.(block.id);
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
          <ContextMenuItem onClick={() => onPdfDuplicate?.(block.id)}>
            <CopyPlus className="mr-2 h-4 w-4" />
            <span>{t('editor.duplicate')}</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onPdfAlignmentChange?.(block.id, 'left')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlignLeft className="mr-2 h-4 w-4" />
              <span>{t('editor.alignLeft')}</span>
            </div>
            {alignment === 'left' && <Check className="h-4 w-4" />}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onPdfAlignmentChange?.(block.id, 'center')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlignCenter className="mr-2 h-4 w-4" />
              <span>{t('editor.alignCenter')}</span>
            </div>
            {alignment === 'center' && <Check className="h-4 w-4" />}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onPdfAlignmentChange?.(block.id, 'right')}
            className="flex items-center justify-between"
          >
            <div className="flex items-center">
              <AlignRight className="mr-2 h-4 w-4" />
              <span>{t('editor.alignRight')}</span>
            </div>
            {alignment === 'right' && <Check className="h-4 w-4" />}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onPdfDelete?.(block.id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            <span>{t('editor.delete')}</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      </div>
    </div>
  );
};

