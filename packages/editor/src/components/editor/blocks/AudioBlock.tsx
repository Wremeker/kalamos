import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getFullMediaUrl } from '@/utils/urlUtils';
import { useSignedUrl } from '@/hooks/useSignedUrl';

export const AudioBlock: React.FC<BlockRendererProps> = ({
  block,
  fileInputRef,
  triggerFileInput,
  handleFileSelect,
  setIsFocused,
  onAudioUpload,
  onAudioDelete,
  onUpdateBlock,
}) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const { signedUrl: audioSrc } = useSignedUrl(getFullMediaUrl(block.audioUrl));

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
      if (file && file.type.startsWith('audio/')) {
        if (onAudioUpload) {
          onAudioUpload(block.id, file);
        }
      } else {
        toast.error(t('editor.pleaseUploadAudio'));
      }
    },
    [block.id, onAudioUpload, t]
  );

  const handleAudioClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      return;
    }
    wrapperRef.current?.focus();
  };

  const handleDeleteKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onAudioDelete?.(block.id);
    }
  };

  if (!block.audioUrl) {
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
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
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
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
            <div className="text-left">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('editor.clickOrDragAudio')}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-500">
                MP3, WAV, OGG
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-4 group" data-block-id={block.id}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={wrapperRef}
            tabIndex={0}
            onKeyDown={handleDeleteKey}
            onFocus={() => setIsFocused?.(true)}
            onBlur={() => setIsFocused?.(false)}
            className="relative group outline-none"
          >
            <audio
              src={audioSrc || ''}
              controls
              className="w-full rounded-lg"
              style={{
                maxWidth: '100%',
                height: '54px',
              }}
              onClick={handleAudioClick}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => onAudioDelete?.(block.id)}>
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
          className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center outline-none focus:text-gray-700 dark:focus:text-gray-300 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 dark:empty:before:text-gray-500"
          data-placeholder={t('editor.addCaption')}
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
          onClick={() => setIsEditingCaption(true)}
        >
          {t('editor.addCaption')}
        </div>
      )}
    </div>
  );
};

