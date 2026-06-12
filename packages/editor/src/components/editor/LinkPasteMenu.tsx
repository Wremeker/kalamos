import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Link, Image, Video, BookOpen } from 'lucide-react';

interface LinkPasteMenuProps {
  position: { x: number; y: number };
  url: string;
  onSelect: (action: 'bookmark' | 'url' | 'image' | 'embed' | 'lesson') => void;
  onDismiss: () => void;
}

// Checks whether URL is an image
const isImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(pathname);
  } catch {
    return false;
  }
};

// Checks whether URL is a YouTube video
const isYouTubeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be');
  } catch {
    return false;
  }
};

// Checks whether URL is a Rutube video
const isRutubeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('rutube.ru');
  } catch {
    return false;
  }
};

// Checks whether URL is a lesson link and returns lesson slug
const getLessonSlugFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const match = urlObj.pathname.match(/\/lessons\/([^/]+)/);
    if (match && match[1] && match[1] !== 'edit') {
      return match[1];
    }
    return null;
  } catch {
    return null;
  }
};

export const LinkPasteMenu: React.FC<LinkPasteMenuProps> = ({
  position,
  url,
  onSelect,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isImage = useMemo(() => isImageUrl(url), [url]);
  const isYouTube = useMemo(() => isYouTubeUrl(url), [url]);
  const isRutube = useMemo(() => isRutubeUrl(url), [url]);
  const lessonSlug = useMemo(() => getLessonSlugFromUrl(url), [url]);

  const options = useMemo(() => {
    const baseOptions = [
      { 
        id: 'bookmark' as const, 
        label: t('editor.insertBookmark'), 
        icon: Bookmark,
        description: t('editor.insertBookmarkDesc')
      },
    ];

    if (lessonSlug !== null) {
      return [
        { 
          id: 'lesson' as const, 
          label: t('editor.insertLesson'), 
          icon: BookOpen,
          description: t('editor.insertLessonDesc')
        },
        { 
          id: 'url' as const, 
          label: t('editor.insertUrl'), 
          icon: Link,
          description: t('editor.insertUrlDesc')
        },
        ...baseOptions,
      ];
    } else if (isImage) {
      return [
        { 
          id: 'image' as const, 
          label: t('editor.embedImage'), 
          icon: Image,
          description: t('editor.embedImageDesc')
        },
        ...baseOptions,
      ];
    } else if (isYouTube || isRutube) {
      return [
        { 
          id: 'embed' as const, 
          label: t('editor.embedVideo'), 
          icon: Video,
          description: t('editor.embedVideoDesc')
        },
        { 
          id: 'url' as const, 
          label: t('editor.insertUrl'), 
          icon: Link,
          description: t('editor.insertUrlDesc')
        },
        ...baseOptions,
      ];
    } else {
      return [
        { 
          id: 'url' as const, 
          label: t('editor.insertUrl'), 
          icon: Link,
          description: t('editor.insertUrlDesc')
        },
        ...baseOptions,
      ];
    }
  }, [isImage, isYouTube, isRutube, lessonSlug, t]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSelect(options[selectedIndex].id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedIndex, onSelect, onDismiss, options]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 min-w-[280px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 mb-2">
        <span className="font-medium">{t('editor.insertAs')}</span>
      </div>
      {options.map((option, index) => {
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            className={`w-full px-3 py-2 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
            }`}
            onClick={() => onSelect(option.id)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {option.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {option.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

