import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from '../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2, Search, Loader2, ExternalLink, Pencil, Copy, CopyPlus, ClipboardCopy, AlignLeft, AlignCenter, AlignRight, Check, ZoomIn, X } from 'lucide-react';
import { imagesApi, UnsplashImage } from '@/api/images';
import { useImageDrawing } from '@/hooks/editor/useImageDrawing';
import { useScrollLock } from '@/hooks/editor/useScrollLock';
import { ImageDrawingToolbar } from './ImageDrawingToolbar';

export const ImageBlock: React.FC<BlockRendererProps> = ({
  block,
  imageWidth,
  imageRef,
  fileInputRef,
  triggerFileInput,
  handleFileSelect,
  handleDeleteImage,
  handleResizeStart,
  isResizing,
  setIsFocused,
  onImageUpload,
  onImageResize,
  onImageAlignmentChange,
  onImageDuplicate,
  onDrawingUpdate,
  onDrawingStrokeProgress,
  onDrawingStrokeComplete,
  onDrawingAction,
  remoteDrawingBlockState,
  isUploading,
}) => {
  const { t } = useTranslation();
  const [embedUrl, setEmbedUrl] = useState('');
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<UnsplashImage[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [hasLoadedDefault, setHasLoadedDefault] = useState(false);
  const [isImageFocused, setIsImageFocused] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewZoomLevel, setPreviewZoomLevel] = useState(0);
  const [previewZoomDirection, setPreviewZoomDirection] = useState<'in' | 'out'>('in');
  const [activeTab, setActiveTab] = useState('upload');
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [contextMenuOpen, setContextMenuOpen] = useState(false);

  useScrollLock(contextMenuOpen);

  // Hook for drawing on image
  const drawing = useImageDrawing({
    imageWidth: imageDimensions.width,
    imageHeight: imageDimensions.height,
    initialStrokes: block.drawingData?.strokes || [],
    onSaveDrawing: (strokes) => {
      if (onDrawingUpdate) {
        onDrawingUpdate(block.id, { strokes });
      }
    },
    onStrokeProgress: onDrawingStrokeProgress
      ? (points, color, thickness) => onDrawingStrokeProgress(block.id, points, color, thickness)
      : undefined,
    onStrokeComplete: onDrawingStrokeComplete
      ? (stroke) => onDrawingStrokeComplete(block.id, stroke)
      : undefined,
    onDrawingAction: onDrawingAction
      ? (strokes) => onDrawingAction(block.id, strokes)
      : undefined,
    remoteCurrentStroke: remoteDrawingBlockState?.currentStroke,
    remoteStrokes: remoteDrawingBlockState?.strokes,
  });

  const handleDeleteKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteImage?.();
    }
  };

  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPreviewOpen) {
        setIsPreviewOpen(false);
      }
    };

    if (isPreviewOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => document.removeEventListener('keydown', handleEscapeKey);
    }
  }, [isPreviewOpen]);

  const handleCopyImage = async (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      e.preventDefault();
      if (block.imageUrl) {
        const markdownText = `![](${block.imageUrl})${imageWidth ? `<!-- width:${imageWidth} -->` : ''}`;
        try {
          await navigator.clipboard.writeText(markdownText);
        } catch (err) {
          const textArea = document.createElement('textarea');
          textArea.value = markdownText;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
      }
    }
  };

  // Copy image URL handler from context menu
  const handleCopyImageUrl = async () => {
    if (block.imageUrl) {
      try {
        await navigator.clipboard.writeText(block.imageUrl);
      } catch (err) {
        // Fallback for browsers without clipboard API support
        const textArea = document.createElement('textarea');
        textArea.value = block.imageUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  };

  const handleCopyImageToClipboard = async () => {
    const img = imageRef?.current;
    if (!img || !(img instanceof HTMLImageElement)) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      }
    } catch {
      // Fallback: copy the URL if image clipboard write is not supported
      handleCopyImageUrl();
    }
  };

  // Duplicate image handler
  const handleDuplicateImage = () => {
    if (onImageDuplicate) {
      onImageDuplicate(block.id);
    }
  };

  // Delete image handler from context menu
  const handleDeleteFromMenu = () => {
    handleDeleteImage?.();
  };

  const handleEmbedUrl = () => {
    if (embedUrl && onImageUpload) {
      onImageUpload(block.id, embedUrl);
      setEmbedUrl('');
    }
  };

  const handleUnsplashSearch = useCallback(async () => {
    if (!unsplashQuery.trim()) return;

    setUnsplashLoading(true);
    setUnsplashError(null);

    try {
      const results = await imagesApi.searchUnsplash(unsplashQuery, 1, 20);
      setUnsplashResults(results.results);
    } catch (error: any) {
      setUnsplashError(error.response?.data?.error || 'Failed to search');
      setUnsplashResults([]);
    } finally {
      setUnsplashLoading(false);
    }
  }, [unsplashQuery]);

  const handleUnsplashSelect = useCallback(async (image: UnsplashImage) => {
    if (onImageUpload) {
      onImageUpload(block.id, image.urls.regular);
      
      // Track download as required by Unsplash API rules
      try {
        await imagesApi.trackUnsplashDownload(image.links.download_location);
      } catch {
        // Failed to track download
      }

      // Reset state
      setUnsplashQuery('');
      setUnsplashResults([]);
    }
  }, [block.id, onImageUpload]);

  // Load default Unsplash results when switching to Unsplash tab
  useEffect(() => {
    if (!hasLoadedDefault && !block.imageUrl && activeTab === 'unsplash') {
      const loadDefaultResults = async () => {
        setUnsplashLoading(true);
        setUnsplashError(null);

        try {
          const results = await imagesApi.searchUnsplash('Nature', 1, 20);
          setUnsplashResults(results.results);
          setHasLoadedDefault(true);
          setUnsplashQuery('');
        } catch (error: any) {
          setUnsplashError(error.response?.data?.error || 'Failed to load images');
        } finally {
          setUnsplashLoading(false);
        }
      };

      loadDefaultResults();
    }
  }, [hasLoadedDefault, block.imageUrl, activeTab]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const previousMaxWidthRef = useRef<number>(0);
  const imageWidthRef = useRef<number | undefined>(block.imageWidth);

  // Keep imageWidthRef up to date
  useEffect(() => {
    imageWidthRef.current = block.imageWidth;
  }, [block.imageWidth]);

  useEffect(() => {
    if (!block.imageUrl || !onImageResize || !containerRef.current) {
      return;
    }

    // Find the column parent - check both Tailwind classes and inline-styled columns
    let columnParent: Element | null = null;
    
    // First try to find Tailwind column classes
    columnParent = containerRef.current.closest('[class*="w-1/"]');
    
    // If not found, look for inline-styled columns from ColumnBlock
    if (!columnParent) {
      let parent = containerRef.current.parentElement;
      while (parent) {
        // Check if it's a column with inline width style or has a group/column class
        if ((parent.style.width && parent.style.width.includes('%')) || 
            parent.classList.contains('group/column')) {
          columnParent = parent;
          break;
        }
        parent = parent.parentElement;
        // Stop at the main editor container
        if (parent?.classList.contains('px-10') || parent?.classList.contains('group/columnblock')) break;
      }
    }

    if (!columnParent) {
      return;
    }

    const img = imageRef?.current;
    if (!img || !(img instanceof HTMLImageElement)) {
      return;
    }

    const constrainToColumn = () => {
      if (!columnParent || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const columnRect = columnParent.getBoundingClientRect();
      
      // Calculate available width considering all constraints
      const rightBoundary = window.innerWidth;
      let maxWidth = columnRect.right - containerRect.left;
      
      const innerDiv = columnParent.querySelector('[class*="pl-16"]');
      if (innerDiv && innerDiv.contains(containerRef.current)) {
        maxWidth -= 16;
      }
      
      // Account for viewport right edge
      const maxWidthByViewport = rightBoundary - containerRect.left - 32;
      maxWidth = Math.min(maxWidth - 16, maxWidthByViewport);
      maxWidth = Math.max(200, maxWidth);

      const naturalWidth = img.naturalWidth || 0;
      const naturalHeight = img.naturalHeight || 0;
      
      if (naturalWidth === 0 || naturalHeight === 0) return;

      const currentWidth = imageWidthRef.current || naturalWidth;
      
      // If column width changed significantly, resize image proportionally
      if (previousMaxWidthRef.current > 0 && Math.abs(maxWidth - previousMaxWidthRef.current) > 5) {
        // Calculate the ratio of column width change
        const widthRatio = maxWidth / previousMaxWidthRef.current;
        
        // Apply the same ratio to the image width
        let newWidth = Math.round(currentWidth * widthRatio);
        
        // Ensure the new width is within reasonable bounds
        newWidth = Math.max(200, Math.min(newWidth, maxWidth));
        
        const newHeight = Math.round(newWidth * (naturalHeight / naturalWidth));
        onImageResize(block.id, newWidth, newHeight);
      } else if (currentWidth > maxWidth) {
        // Image is too large for column, constrain it
        const constrainedWidth = maxWidth;
        const constrainedHeight = Math.round(constrainedWidth * (naturalHeight / naturalWidth));
        onImageResize(block.id, constrainedWidth, constrainedHeight);
      }
      
      previousMaxWidthRef.current = maxWidth;
    };

    if (img.complete && img.naturalWidth > 0) {
      constrainToColumn();
    } else {
      img.addEventListener('load', constrainToColumn);
      return () => {
        img.removeEventListener('load', constrainToColumn);
      };
    }

    const resizeObserver = new ResizeObserver(() => {
      if (img.complete && img.naturalWidth > 0) {
        constrainToColumn();
      }
    });

    if (columnParent) {
      resizeObserver.observe(columnParent);
    }

    return () => {
      resizeObserver.disconnect();
      previousMaxWidthRef.current = 0;
    };
  }, [block.imageUrl, block.id, onImageResize, imageRef]);

  const handleImageClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      return;
    }
    wrapperRef.current?.focus();
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      return;
    }
  };

  // Track image dimensions for canvas
  useEffect(() => {
    const img = imageRef?.current;
    if (!img || !(img instanceof HTMLImageElement)) return;

    const updateDimensions = () => {
      const rect = img.getBoundingClientRect();
      setImageDimensions({
        width: rect.width,
        height: rect.height,
      });
    };

    if (img.complete) {
      updateDimensions();
    }

    img.addEventListener('load', updateDimensions);
    window.addEventListener('resize', updateDimensions);

    return () => {
      img.removeEventListener('load', updateDimensions);
      window.removeEventListener('resize', updateDimensions);
    };
  }, [imageRef, block.imageUrl, imageWidth, block.imageWidth, block.imageHeight]);

  // Additional size update when block dimensions change
  useEffect(() => {
    const img = imageRef?.current;
    if (!img || !(img instanceof HTMLImageElement)) return;

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const rect = img.getBoundingClientRect();
      setImageDimensions({
        width: rect.width,
        height: rect.height,
      });
    });
  }, [block.imageWidth, block.imageHeight, imageRef]);

  // Update dimensions during active resize
  useEffect(() => {
    if (!isResizing) return;

    const img = imageRef?.current;
    if (!img || !(img instanceof HTMLImageElement)) return;

    const updateDuringResize = () => {
      const rect = img.getBoundingClientRect();
      setImageDimensions({
        width: rect.width,
        height: rect.height,
      });
      if (isResizing) {
        requestAnimationFrame(updateDuringResize);
      }
    };

    requestAnimationFrame(updateDuringResize);
  }, [isResizing, imageRef]);

  // Recalculate image dimensions and toolbar position when entering drawing mode
  useEffect(() => {
    if (!drawing.isDrawingMode) return;

    const img = imageRef?.current;
    if (!img || !(img instanceof HTMLImageElement)) return;

    const update = () => {
      const rect = img.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setImageDimensions({ width: rect.width, height: rect.height });
      }
      setToolbarPosition({ top: rect.top, left: rect.right + 16 });
    };

    // Run immediately + after a frame to ensure layout is settled
    update();
    requestAnimationFrame(update);

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [drawing.isDrawingMode, imageRef]);

  const drawingCursorSize = Math.max(drawing.thickness * 2, 8);
  const drawingCursorHalf = drawingCursorSize / 2;
  const drawingCursorSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='${drawingCursorSize}' height='${drawingCursorSize}'><circle cx='${drawingCursorHalf}' cy='${drawingCursorHalf}' r='${drawingCursorHalf - 1}' fill='${drawing.color}' fill-opacity='0.3' stroke='${drawing.color}' stroke-width='1.5'/></svg>`;
  const drawingCursor = `url("data:image/svg+xml,${encodeURIComponent(drawingCursorSvg)}") ${drawingCursorHalf} ${drawingCursorHalf}, crosshair`;

  // Determine alignment class based on imageAlignment
  const getAlignmentClass = () => {
    const alignment = block.imageAlignment || 'left';
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

  return (
    <div ref={containerRef} className="my-4" data-block-id={block.id}>
      {block.imageUrl ? (
        <div className={`flex ${getAlignmentClass()} w-full`}>
        <ContextMenu onOpenChange={setContextMenuOpen}>
          <ContextMenuTrigger asChild>
            <div
              ref={wrapperRef}
              className="relative group block outline-none max-w-full"
              tabIndex={0}
              onKeyDown={(e) => {
                handleDeleteKey(e);
                handleCopyImage(e);
              }}
              onFocus={() => {
                setIsFocused?.(true);
                setIsImageFocused(true);
              }}
              onBlur={() => {
                setIsFocused?.(false);
                setIsImageFocused(false);
              }}
              onMouseDown={(e) => {
                if (drawing.isDrawingMode) {
                  // Stop propagation so block selection doesn't start while drawing
                  e.stopPropagation();
                  e.preventDefault();
                } else {
                  handleImageMouseDown(e);
                }
              }}
              onClick={(e) => {
                if (!drawing.isDrawingMode) {
                  handleImageClick(e);
                }
              }}
            >
              <div className="relative max-w-full">
                <div
                  className="relative"
                  style={{ 
                    width: imageWidth ? `${imageWidth}px` : '100%', 
                    maxWidth: '100%' 
                  }}
                >
                  <img
                    ref={imageRef as React.RefObject<HTMLImageElement>}
                    src={block.imageUrl}
                    alt="Uploaded"
                    className={`h-auto rounded-lg border transition-all ${
                      isImageFocused 
                        ? 'border-blue-500 ring-2 ring-blue-500' 
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    style={{ width: '100%', maxWidth: '100%' }}
                  />

              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 rounded-lg z-20">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              )}

              {!drawing.isDrawingMode && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10 bg-black/70 rounded-lg p-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageAlignmentChange?.(block.id, 'left');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                    (!block.imageAlignment || block.imageAlignment === 'left') ? 'ring-2 ring-blue-500' : ''
                  }`}
                  title={t('editor.alignLeft')}
                >
                  <AlignLeft size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageAlignmentChange?.(block.id, 'center');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                    block.imageAlignment === 'center' ? 'ring-2 ring-blue-500' : ''
                  }`}
                  title={t('editor.alignCenter')}
                >
                  <AlignCenter size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageAlignmentChange?.(block.id, 'right');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  className={`bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 ${
                    block.imageAlignment === 'right' ? 'ring-2 ring-blue-500' : ''
                  }`}
                  title={t('editor.alignRight')}
                >
                  <AlignRight size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewZoomLevel(0);
                    setPreviewZoomDirection('in');
                    setIsPreviewOpen(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                  title={t('editor.preview')}
                >
                  <ZoomIn size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Capture image dimensions BEFORE entering drawing mode so the
                    // canvas renders on the very first re-render and the event
                    // listener effect in useImageDrawing finds a valid canvasRef.
                    const img = imageRef?.current;
                    if (img && img instanceof HTMLImageElement) {
                      const rect = img.getBoundingClientRect();
                      if (rect.width > 0 && rect.height > 0) {
                        setImageDimensions({ width: rect.width, height: rect.height });
                      }
                    }
                    drawing.setIsDrawingMode(true);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
                  title={t('editor.drawOnImage')}
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteImage?.();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.stopPropagation()}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 p-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-600 transition-colors"
                  title={t('editor.deleteImage')}
                >
                  <Trash2 size={11} />
                </button>
                </div>
              )}

              {!drawing.isDrawingMode && (
                <>
              <div
                className="absolute top-0 left-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 -translate-y-1/2"
                onMouseDown={(e) => handleResizeStart?.(e, 'tl')}
                onContextMenu={(e) => e.preventDefault()}
                title={t('editor.resize')}
              />
              <div
                className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 -translate-y-1/2"
                onMouseDown={(e) => handleResizeStart?.(e, 'tr')}
                onContextMenu={(e) => e.preventDefault()}
                title={t('editor.resize')}
              />
              <div
                className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 translate-y-1/2"
                onMouseDown={(e) => handleResizeStart?.(e, 'bl')}
                onContextMenu={(e) => e.preventDefault()}
                title={t('editor.resize')}
              />
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 translate-y-1/2"
                onMouseDown={(e) => handleResizeStart?.(e, 'br')}
                onContextMenu={(e) => e.preventDefault()}
                title={t('editor.resize')}
              />

              <div
                className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:bg-opacity-30 transition-colors"
                onMouseDown={(e) => handleResizeStart?.(e, 'r')}
                onContextMenu={(e) => e.preventDefault()}
                title={t('editor.resize')}
              />
              </>
              )}

              {drawing.isDrawingMode && imageDimensions.width > 0 && (
                <canvas
                  key={`drawing-${block.id}`}
                  ref={drawing.canvasRef}
                  className="absolute top-0 left-0"
                  data-drawing-canvas="true"
                  style={{
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                    cursor: drawingCursor,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}

              {/* Display saved drawing (when not in drawing mode) */}
              {!drawing.isDrawingMode && (drawing.hasRemoteDrawing || (block.drawingData?.strokes && block.drawingData.strokes.length > 0)) && imageDimensions.width > 0 && (
                <canvas
                  key={`display-${block.id}`}
                  ref={drawing.displayCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none"
                  style={{
                    width: `${imageDimensions.width}px`,
                    height: `${imageDimensions.height}px`,
                  }}
                />
              )}
                </div>

                {/* Toolbar to the right of the image (via portal) */}
                {drawing.isDrawingMode && imageDimensions.width > 0 && createPortal(
                  <div 
                    className="fixed z-[9999]"
                    style={{ 
                      top: `${toolbarPosition.top}px`,
                      left: `${toolbarPosition.left}px`,
                    }}
                  >
                    <ImageDrawingToolbar
                      color={drawing.color}
                      thickness={drawing.thickness}
                      onColorChange={drawing.setColor}
                      onThicknessChange={drawing.setThickness}
                      onClear={drawing.clearCanvas}
                      onDone={drawing.saveDrawing}
                      onUndo={drawing.undo}
                      onRedo={drawing.redo}
                      canUndo={drawing.canUndo}
                      canRedo={drawing.canRedo}
                    />
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </ContextMenuTrigger>
          
          <ContextMenuContent className="w-48">
            <ContextMenuItem onClick={handleCopyImageToClipboard} className="cursor-pointer">
              <ClipboardCopy className="mr-2 h-4 w-4" />
              <span>{t('editor.copyImage')}</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleCopyImageUrl} className="cursor-pointer">
              <Copy className="mr-2 h-4 w-4" />
              <span>{t('editor.copyUrl')}</span>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleDuplicateImage} className="cursor-pointer">
              <CopyPlus className="mr-2 h-4 w-4" />
              <span>{t('editor.duplicate')}</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem 
              onClick={() => onImageAlignmentChange?.(block.id, 'left')} 
              className="cursor-pointer"
            >
              <AlignLeft className="mr-2 h-4 w-4" />
              <span>{t('editor.alignLeft')}</span>
              {(!block.imageAlignment || block.imageAlignment === 'left') && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onImageAlignmentChange?.(block.id, 'center')} 
              className="cursor-pointer"
            >
              <AlignCenter className="mr-2 h-4 w-4" />
              <span>{t('editor.alignCenter')}</span>
              {block.imageAlignment === 'center' && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onImageAlignmentChange?.(block.id, 'right')} 
              className="cursor-pointer"
            >
              <AlignRight className="mr-2 h-4 w-4" />
              <span>{t('editor.alignRight')}</span>
              {block.imageAlignment === 'right' && (
                <Check className="ml-auto h-4 w-4" />
              )}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleDeleteFromMenu} className="cursor-pointer text-red-600 dark:text-red-400">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>{t('editor.delete')}</span>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        </div>
      ) : isUploading ? (
        <div 
          className="relative w-full max-w-[400px] border border-gray-300 dark:border-gray-600 rounded-lg p-3"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-sm font-medium">{t('editor.uploadingImage')}</span>
          </div>
        </div>
      ) : (
        <div 
          className="relative w-full max-w-[400px] border border-gray-300 dark:border-gray-600 rounded-lg p-3"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="upload" className="text-xs">{t('editor.upload')}</TabsTrigger>
              <TabsTrigger value="embed" className="text-xs">{t('editor.link')}</TabsTrigger>
              <TabsTrigger value="unsplash" className="text-xs">Unsplash</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-2">
              <button
                type="button"
                onClick={triggerFileInput}
                onFocus={() => setIsFocused?.(true)}
                onBlur={() => setIsFocused?.(false)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors flex flex-col items-start gap-1.5 text-gray-500 dark:text-gray-400"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="8" y="8" width="32" height="32" rx="2" />
                  <circle cx="16" cy="18" r="3" />
                  <path d="M8 32 L16 24 L24 32 L32 24 L40 32 L40 40 L8 40 Z" />
                </svg>
                <span className="text-sm font-medium">{t('editor.clickToUpload')}</span>
                <span className="text-xs">JPG, PNG, GIF, WebP, SVG up to 5MB</span>
              </button>
            </TabsContent>

            <TabsContent value="embed" className="mt-2">
              <div className="space-y-2 p-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Image URL
                </label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={embedUrl}
                    onChange={(e) => setEmbedUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleEmbedUrl();
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm h-8"
                  />
                  <Button 
                    type="button"
                    onClick={handleEmbedUrl} 
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!embedUrl} 
                    size="sm" 
                    className="h-8"
                  >
                    Insert
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="unsplash" className="mt-2">
              <div className="space-y-2 p-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Search on Unsplash
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={t('editor.searchImages')}
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUnsplashSearch();
                      }
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 text-sm h-8"
                  />
                  <Button 
                    type="button"
                    onClick={handleUnsplashSearch} 
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!unsplashQuery.trim() || unsplashLoading}
                    size="sm"
                    className="h-8 px-2"
                  >
                    {unsplashLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3" />
                    )}
                  </Button>
                </div>

                {unsplashError && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {unsplashError}
                  </div>
                )}

                {unsplashResults.length > 0 && (
                  <div className="max-h-[300px] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {unsplashResults.map((image) => (
                        <div
                          key={image.id}
                          className="group relative aspect-square cursor-pointer rounded overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                          onClick={() => handleUnsplashSelect(image)}
                        >
                          <img
                            src={imagesApi.getProxiedImageUrl(image.urls.small)}
                            alt={image.alt_description || image.description || 'Unsplash image'}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity flex items-end p-1.5">
                            <div className="text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="font-medium truncate">
                                {image.user.name}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      Photo by <a
                        href="https://unsplash.com/?utm_source=teachly&utm_medium=referral" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Unsplash
                      </a>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          <button
            type="button"
            onClick={handleDeleteImage}
            className="absolute bottom-2 right-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 p-1.5 rounded text-sm border border-gray-300 dark:border-gray-600 transition-colors"
            title={t('editor.deleteBlock')}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {isPreviewOpen && block.imageUrl && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 overflow-auto"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            title={t('editor.close')}
          >
            <X size={24} />
          </button>
          <img
            src={block.imageUrl}
            alt="Preview"
            className="object-contain rounded-lg transition-transform duration-200"
            style={{
              maxWidth: previewZoomLevel === 0 ? '90vw' : 'none',
              maxHeight: previewZoomLevel === 0 ? '90vh' : 'none',
              transform: `scale(${1 + previewZoomLevel * 0.5})`,
              cursor: previewZoomDirection === 'in' ? 'zoom-in' : 'zoom-out',
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (previewZoomDirection === 'in') {
                const next = previewZoomLevel + 1;
                setPreviewZoomLevel(next);
                if (next >= 2) setPreviewZoomDirection('out');
              } else {
                const next = previewZoomLevel - 1;
                setPreviewZoomLevel(next);
                if (next <= 0) setPreviewZoomDirection('in');
              }
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

