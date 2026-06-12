import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import { Trash2 } from 'lucide-react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';

export const EmbedBlock: React.FC<BlockRendererProps> = ({
  block,
  handleDeleteImage,
  onImageUpload,
  setIsFocused,
  imageRef,
  isSelecting,
  imageWidth,
  isResizing,
  handleResizeStart,
  onImageResize,
}) => {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const getEmbedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      
      if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
        let videoId = '';
        if (urlObj.hostname.includes('youtu.be')) {
          videoId = urlObj.pathname.slice(1);
        } else {
          videoId = urlObj.searchParams.get('v') || '';
        }
        return `https://www.youtube.com/embed/${videoId}`;
      }
      
      if (urlObj.hostname.includes('rutube.ru')) {
        const match = urlObj.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
        if (match && match[1]) {
          const videoId = match[1];
          return `https://rutube.ru/play/embed/${videoId}`;
        }
        if (urlObj.pathname.includes('/play/embed/')) {
          return url;
        }
      }
      
      if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
        return url;
      }
      
      return url;
    } catch (error) {
      return url;
    }
  };

  const handleSubmitUrl = () => {
    if (urlInput && onImageUpload) {
      onImageUpload(block.id, urlInput);
      setUrlInput('');
    }
  };

  const handleDeleteKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDeleteImage?.();
    }
  };

  useEffect(() => {
    if (!block.url || !onImageResize || !containerRef.current) {
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

    const iframe = imageRef?.current;
    if (!iframe || !(iframe instanceof HTMLIFrameElement)) {
      return;
    }

    const constrainToColumn = () => {
      if (!columnParent) return;
      
      const columnWidth = columnParent.getBoundingClientRect().width;
      const innerDiv = columnParent.querySelector('[class*="pl-16"]');
      
      let maxWidth = Math.floor(columnWidth);
      if (innerDiv && innerDiv.contains(containerRef.current)) {
        maxWidth -= 64;
      }
      maxWidth = Math.max(200, maxWidth - 16);

      const currentWidth = block.embedWidth || iframe.offsetWidth || 800;
      
      if (currentWidth > maxWidth) {
        const constrainedWidth = maxWidth;
        const constrainedHeight = Math.round((constrainedWidth * 9) / 16);
        onImageResize(block.id, constrainedWidth, constrainedHeight);
      }
    };

    const timer = setTimeout(constrainToColumn, 100);

    const resizeObserver = new ResizeObserver(() => {
      constrainToColumn();
    });

    if (columnParent) {
      resizeObserver.observe(columnParent);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, [block.url, block.embedWidth, block.id, onImageResize, imageRef]);

  const renderEmbed = () => {
    if (!block.url) return null;

    const embedUrl = getEmbedUrl(block.url);
    const isYouTube = embedUrl.includes('youtube.com/embed');
    const isRutube = embedUrl.includes('rutube.ru/play/embed');
    const hasExplicitSize = imageWidth || block.embedWidth;

    if (isYouTube || isRutube) {
      return (
        <iframe
          ref={imageRef as React.RefObject<HTMLIFrameElement>}
          src={embedUrl}
          className="rounded-lg w-full border border-gray-200 dark:border-gray-700"
          style={{
            height: hasExplicitSize ? '100%' : '450px',
            aspectRatio: hasExplicitSize ? undefined : '16/9',
            pointerEvents: (isSelecting || isResizing) ? 'none' : 'auto'
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={t('editor.embeddedContentTitle')}
        />
      );
    }

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-full">
        <iframe
          ref={imageRef as React.RefObject<HTMLIFrameElement>}
          src={embedUrl}
          className="w-full max-w-full"
          style={{ 
            height: '600px',
            minHeight: '600px',
            pointerEvents: (isSelecting || isResizing) ? 'none' : 'auto'
          }}
          title={t('editor.embeddedContentTitle')}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    );
  };

  if (!block.url) {
    return (
      <div className="my-4" data-block-id={block.id}>
        <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('editor.embedUrlLabel')}
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder={t('editor.embedUrlPlaceholder')}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitUrl();
                    }
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleSubmitUrl}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!urlInput}
                >
                  {t('editor.embedInsertButton')}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('editor.embedSupportedHint')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleDeleteImage?.()}
            className="absolute bottom-4 right-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 p-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 transition-colors"
            title={t('editor.deleteBlock')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  const embedUrl = block.url ? getEmbedUrl(block.url) : '';
  const isYouTube = embedUrl.includes('youtube.com/embed');
  const isRutube = embedUrl.includes('rutube.ru/play/embed');
  
  const hasExplicitSize = !!(imageWidth || block.embedWidth);
  const width = imageWidth || block.embedWidth || 800;

  return (
    <div ref={containerRef} className="my-4" data-block-id={block.id}>
      <div
        className="group block outline-none"
        tabIndex={0}
        onKeyDown={handleDeleteKey}
        onFocus={() => setIsFocused?.(true)}
        onBlur={() => setIsFocused?.(false)}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className={`relative ${hasExplicitSize ? 'inline-block' : 'block'} max-w-full`}
          style={(isYouTube || isRutube) && hasExplicitSize ? { width: `${width}px`, maxWidth: '100%', height: 'auto', aspectRatio: '16/9' } : undefined}
        >
          {renderEmbed()}

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteImage?.();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 z-10"
            title={t('editor.deleteEmbed')}
          >
            <Trash2 size={16} />
          </button>

          {handleResizeStart && (isYouTube || isRutube) && (
            <>
              <div
                className="absolute top-0 left-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 -translate-y-1/2"
                onMouseDown={(e) => handleResizeStart(e, 'tl')}
                title={t('editor.resize')}
              />
              <div
                className="absolute top-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 -translate-y-1/2"
                onMouseDown={(e) => handleResizeStart(e, 'tr')}
                title={t('editor.resize')}
              />
              <div
                className="absolute bottom-0 left-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nesw-resize opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 translate-y-1/2"
                onMouseDown={(e) => handleResizeStart(e, 'bl')}
                title={t('editor.resize')}
              />
              <div
                className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 border-2 border-white dark:border-gray-800 rounded-full cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2 translate-y-1/2"
                onMouseDown={(e) => handleResizeStart(e, 'br')}
                title={t('editor.resize')}
              />

              <div
                className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 hover:bg-blue-500 hover:bg-opacity-30 transition-colors"
                onMouseDown={(e) => handleResizeStart(e, 'r')}
                title={t('editor.resize')}
              />

              {isResizing && imageWidth && (
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {imageWidth}px
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

