import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import { ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { linkPreviewApi } from '@/services/api';

export const BookmarkBlock: React.FC<BlockRendererProps> = ({
  block,
  handleDeleteImage,
  onImageUpload,
  onUpdateBlock,
}) => {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState('');
  const [metadata, setMetadata] = useState<{
    title?: string;
    description?: string;
    favicon?: string;
    image?: string;
  }>({
    title: block.title,
    description: block.description,
    favicon: block.favicon,
    image: block.imageUrl,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (block.title && block.description) {
      setMetadata({
        title: block.title,
        description: block.description,
        favicon: block.favicon,
        image: block.imageUrl,
      });
      return;
    }

    const fetchMetadata = async () => {
      if (!block.url) return;
      
      setLoading(true);
      try {
        const data = await linkPreviewApi.fetchMetadata(block.url);
        
        const newMetadata = {
          title: data.title,
          description: data.description,
          favicon: data.favicon,
          image: data.image,
        };
        
        setMetadata(newMetadata);
        
        if (onUpdateBlock) {
          onUpdateBlock(block.id, {
            ...block,
            title: data.title,
            description: data.description,
            favicon: data.favicon,
            imageUrl: data.image,
          });
        }
      } catch {
        try {
          const url = new URL(block.url);
          const fallbackMetadata = {
            title: url.hostname,
            description: block.url,
            favicon: `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`,
          };
          setMetadata(fallbackMetadata);
          
          if (onUpdateBlock) {
            onUpdateBlock(block.id, {
              ...block,
              ...fallbackMetadata,
            });
          }
        } catch {
          setMetadata({
            title: block.url,
            description: 'Invalid URL',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [block.url, block.title, block.description, block.favicon, block.id, onUpdateBlock]);

  const handleClick = () => {
    if (block.url) {
      window.open(block.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSubmitUrl = () => {
    if (urlInput && onImageUpload) {
      onImageUpload(block.id, urlInput);
      setUrlInput('');
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  if (!block.url) {
    return (
      <div className="my-4 w-full" data-block-id={block.id}>
        <div className="relative border border-gray-300 dark:border-gray-600 rounded-lg p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bookmark URL
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitUrl();
                    }
                  }}
                  onPaste={handlePaste}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 bg-white dark:bg-gray-800"
                  autoFocus
                />
                <Button 
                  onClick={handleSubmitUrl} 
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={!urlInput}
                  className="bg-white hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
                >
                  {t('schedule.add')}
                </Button>
              </div>
            </div>
          </div>
        
          <button
            onClick={handleDeleteImage}
            className="absolute bottom-4 right-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 p-2 rounded-md text-sm border border-gray-300 dark:border-gray-600 transition-colors"
            title={t('editor.deleteBlock')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-hidden" data-block-id={block.id}>
      <div className="relative group overflow-hidden">
        <a
          href={block.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors overflow-hidden"
          onClick={(e) => {
            e.preventDefault();
            handleClick();
          }}
        >
          <div className="flex flex-col sm:flex-row overflow-hidden">
            {/* Text content */}
            <div className="flex-1 min-w-0 p-4 overflow-hidden order-2 sm:order-1">
              <div className="flex items-start gap-3">
                {metadata.favicon && (
                  <img
                    src={metadata.favicon}
                    alt=""
                    className="w-6 h-6 flex-shrink-0 mt-1"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2">
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Loading preview...</span>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-1 min-w-0 line-clamp-2 break-words">
                          {metadata.title || 'Untitled'}
                        </h3>
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </>
                    )}
                  </div>
                  {!loading && metadata.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 break-words">
                      {metadata.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 line-clamp-2 ">
                    {block.url}
                  </p>
                </div>
              </div>
            </div>
            {/* Image section */}
            {metadata.image && !loading && (
              <div className="w-full h-32 sm:w-40 sm:h-auto flex-shrink-0 overflow-hidden order-1 sm:order-2">
                <img
                  src={metadata.image}
                  alt=""
                  className="w-full h-full object-cover sm:rounded-r-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        </a>

        <button
          onClick={handleDeleteImage}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-2 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600"
          title={t('editor.deleteBookmark')}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

