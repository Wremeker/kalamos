import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as LinkIcon } from 'lucide-react';

interface LinkModalProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  initialUrl?: string;
  onConfirm: (url: string) => void;
  onClose: () => void;
}

export const LinkModal: React.FC<LinkModalProps> = ({ isOpen, position, initialUrl = '', onConfirm, onClose }) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState(initialUrl || 'https://');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || 'https://');
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen, initialUrl]);

  useEffect(() => {
    if (isOpen && position && modalRef.current) {
      const modalHeight = modalRef.current.offsetHeight;
      const modalWidth = modalRef.current.offsetWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let { x, y } = position;
      
      const spaceBelow = viewportHeight - y;
      if (spaceBelow < modalHeight + 20) {
        y = position.y - modalHeight - 32;
      }
      
      const spaceRight = viewportWidth - x;
      if (spaceRight < modalWidth + 20) {
        x = viewportWidth - modalWidth - 20;
      }
      
      x = Math.max(20, x);
      y = Math.max(20, y);
      
      setAdjustedPosition({ x, y });
    }
  }, [isOpen, position]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, url, onClose]);

  const handleConfirm = () => {
    if (url.trim() && url !== 'https://') {
      onConfirm(url.trim());
    }
  };

  if (!isOpen || !position) return null;

  const finalPosition = adjustedPosition || position;

  return (
    <div
      ref={modalRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[320px] max-w-[400px]"
      style={{
        left: `${finalPosition.x}px`,
        top: `${finalPosition.y}px`,
      }}
    >
      <div className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
        <span className="font-medium">{t('editor.insertAs')}</span>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-3">
          <LinkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-2.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1.5">
              URL
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('editor.insertUrlDesc')}
            </div>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-shadow"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
      </div>
      <div className="px-3 pb-3">
        <button
          onClick={handleConfirm}
          disabled={!url.trim() || url === 'https://'}
          className="w-full px-3 py-2 text-sm font-medium bg-white hover:bg-gray-100 text-gray-900 border border-gray-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white dark:border-blue-600 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-600 dark:disabled:text-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
        >
          {t('schedule.add')}
        </button>
      </div>
    </div>
  );
};

