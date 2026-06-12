import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { BlockComment } from '@/types/editor';
import { Send, Trash2, CheckCircle, X, Eraser } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface CommentThreadProps {
  blockId: string;
  comments: BlockComment[];
  onAddComment: (blockId: string, content: string) => void;
  onDeleteComment: (blockId: string, commentId: string) => void;
  onResolveComment: (blockId: string, commentId: string) => void;
  onClose: () => void;
  onRemoveThread?: () => void;
  highlightedText?: string;
  style?: React.CSSProperties;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  blockId,
  comments = [],
  onAddComment,
  onDeleteComment,
  onResolveComment,
  onClose,
  onRemoveThread,
  style,
}) => {
  const { t, i18n } = useTranslation();
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleAddComment = () => {
    if (newComment.trim()) {
      onAddComment(blockId, newComment.trim());
      setNewComment('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const unresolvedComments = comments.filter(c => !c.resolved);

  return (
    <div
      ref={containerRef}
      className="absolute bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-800 rounded-[10px] shadow-lg w-72 z-[9999]"
      style={style}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-zinc-800">
        <span className="text-xs font-medium text-[#4B5566] dark:text-zinc-400">
          {t('editor.comments')}
          {unresolvedComments.length > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-white bg-[#31A2FF] rounded-full">
              {unresolvedComments.length}
            </span>
          )}
        </span>
        <div className="flex items-center gap-0.5">
          {onRemoveThread && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemoveThread();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
              title={t('editor.removeHighlight')}
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-0.5 text-gray-400 hover:text-[#293241] dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
            title={t('editor.closeComments')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Comments list */}
      <div className={`${comments.length > 0 ? 'px-2 py-1.5' : ''} max-h-52 overflow-y-auto`}>
        {comments.length === 0 ? (
          <div className="text-xs text-[#4B5566] dark:text-zinc-500 italic px-3 py-3 text-center">
            {t('editor.noComments')}
          </div>
        ) : (
          <div className="space-y-1">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`px-2.5 py-2 rounded-lg ${
                  comment.resolved
                    ? 'bg-gray-50 dark:bg-zinc-800/50 opacity-50'
                    : 'bg-[#EFF9FF] dark:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {comment.authorColor && (
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: comment.authorColor }}
                      />
                    )}
                    <span className="text-[11px] font-medium text-[#293241] dark:text-zinc-300 truncate">
                      {comment.authorName || comment.author}
                    </span>
                    <span className="text-[10px] text-[#4B5566] dark:text-zinc-500 flex-shrink-0">
                      {new Date(comment.createdAt).toLocaleDateString(i18n.language, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {!comment.resolved && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResolveComment(blockId, comment.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-0.5 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                        title={t('editor.markAsResolved')}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </button>
                    )}
                    {user?.email === comment.author && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteComment(blockId, comment.id);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title={t('editor.deleteComment')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-[#293241] dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
                {comment.resolved && (
                  <div className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-0.5">
                    <CheckCircle className="h-2.5 w-2.5" />
                    {t('editor.resolved')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-2.5 py-2 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-end gap-1.5">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            placeholder={t('editor.addCommentPlaceholder')}
            className="flex-1 text-xs text-[#293241] dark:text-zinc-300 placeholder-[#4B5566]/50 dark:placeholder-zinc-600 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#31A2FF] focus:ring-1 focus:ring-[#31A2FF]/20 transition-colors"
            rows={1}
            autoFocus
            style={{ minHeight: '30px', maxHeight: '80px' }}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddComment();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={!newComment.trim()}
            className="flex-shrink-0 p-1.5 rounded-full bg-[#31A2FF] text-white hover:bg-[#0086F4] disabled:bg-[#92CEFF] disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
