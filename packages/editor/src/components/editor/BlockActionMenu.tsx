import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMenuPosition } from '@/hooks/editor/useMenuPosition.ts';
import { useTranslation } from 'react-i18next';
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  List,
  ListOrdered,
  CheckSquare,
  Image as ImageIcon,
  Minus,
  Code,
  Bookmark,
  FileCode,
  Trash2,
  Copy,
  ChevronRight,
  Link as LinkIcon,
  MessageSquare,
  ClipboardList,
  LucideIcon,
  Quote,
  Sigma,
} from 'lucide-react';
import { BlockType } from '@/types/editor.ts';
import { TEXT_COLORS, BACKGROUND_COLORS, TextColor, BackgroundColor } from '@/constants/colors.ts';

interface CommandItemWithIcon {
  id: BlockType | 'link';
  label: string;
  icon: LucideIcon;
}

interface BlockActionMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onComment?: () => void;
  onAddToHomework?: () => void;
  onTurnInto: (type: BlockType) => void;
  onAddLink?: () => void;
  onColorChange: (textColor?: TextColor, backgroundColor?: BackgroundColor) => void;
  currentTextColor?: TextColor;
  currentBackgroundColor?: BackgroundColor;
  isNested?: boolean;
}

export const BlockActionMenu: React.FC<BlockActionMenuProps> = ({
  position,
  onClose,
  onDelete,
  onDuplicate,
  onComment,
  onAddToHomework,
  onTurnInto,
  onAddLink,
  onColorChange,
  currentTextColor = 'default',
  currentBackgroundColor = 'default',
  isNested = false,
}) => {
  const { t } = useTranslation();
  const [activeSubmenu, setActiveSubmenu] = useState<'color' | 'turnInto' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  const homeworkIdx = onAddToHomework ? 3 : -1;
  const commentIdx = onComment ? (3 + (onAddToHomework ? 1 : 0)) : -1;
  const deleteIdx = 3 + (onAddToHomework ? 1 : 0) + (onComment ? 1 : 0);
  const mainItemsCount = deleteIdx + 1;

  const mainMenuHeight = 200 + (onComment ? 40 : 0) + (onAddToHomework ? 40 : 0);
  const { menuTop, menuLeft } = useMenuPosition({
    position,
    menuHeight: mainMenuHeight,
    menuWidth: 220,
  });

  const ALL_TURN_INTO_COMMANDS: CommandItemWithIcon[] = useMemo(() => [
    { id: 'paragraph', label: t('editor.text'), icon: Type },
    { id: 'h1', label: t('editor.h1'), icon: Heading1 },
    { id: 'h2', label: t('editor.h2'), icon: Heading2 },
    { id: 'h3', label: t('editor.h3'), icon: Heading3 },
    { id: 'h4', label: t('editor.h4'), icon: Heading4 },
    { id: 'h5', label: t('editor.h5'), icon: Heading5 },
    { id: 'toggle_h1', label: t('editor.toggleH1'), icon: ChevronRight },
    { id: 'toggle_h2', label: t('editor.toggleH2'), icon: ChevronRight },
    { id: 'toggle_h3', label: t('editor.toggleH3'), icon: ChevronRight },
    { id: 'toggle_list', label: t('editor.toggleList'), icon: ChevronRight },
    { id: 'quote', label: t('editor.quote'), icon: Quote },
    { id: 'bulleted', label: t('editor.bulleted'), icon: List },
    { id: 'numbered', label: t('editor.numbered'), icon: ListOrdered },
    { id: 'todo', label: t('editor.task'), icon: CheckSquare },
    { id: 'code', label: t('editor.code'), icon: Code },
    { id: 'image', label: t('editor.image'), icon: ImageIcon },
    { id: 'link', label: t('editor.link'), icon: LinkIcon },
    { id: 'bookmark', label: t('editor.bookmark'), icon: Bookmark },
    { id: 'latex', label: t('editor.latex'), icon: Sigma },
    { id: 'embed', label: t('editor.embed'), icon: FileCode },
    { id: 'divider', label: t('editor.divider'), icon: Minus },
  ], [t]);

  // Nested container block types that cannot be added inside nested blocks
  const nestedContainerTypes = ['toggle_h1', 'toggle_h2', 'toggle_h3', 'toggle_list', 'callout', 'columns2', 'columns3', 'columns4', 'columns5'];
  
  const TURN_INTO_COMMANDS = isNested 
    ? ALL_TURN_INTO_COMMANDS.filter(cmd => !nestedContainerTypes.includes(cmd.id as string))
    : ALL_TURN_INTO_COMMANDS;

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeSubmenu]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const items = activeSubmenu === 'turnInto' ? TURN_INTO_COMMANDS : activeSubmenu === 'color' ? [...TEXT_COLORS, ...BACKGROUND_COLORS] : [];

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeSubmenu) {
          setSelectedIndex((prev) => (prev + 1) % items.length);
        } else {
          setSelectedIndex((prev) => (prev + 1) % mainItemsCount);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeSubmenu) {
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
        } else {
          setSelectedIndex((prev) => (prev - 1 + mainItemsCount) % mainItemsCount);
        }
      } else if (e.key === 'ArrowRight' && !activeSubmenu) {
        e.preventDefault();
        if (selectedIndex === 0) {
          setActiveSubmenu('turnInto');
        } else if (selectedIndex === 1) {
          setActiveSubmenu('color');
        }
      } else if (e.key === 'ArrowLeft' && activeSubmenu) {
        e.preventDefault();
        setActiveSubmenu(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSubmenu === 'turnInto') {
          const selectedCommand = TURN_INTO_COMMANDS[selectedIndex];
          if (selectedCommand.id === 'link') {
            onAddLink?.();
          } else {
            onTurnInto(selectedCommand.id as BlockType);
          }
          onClose();
        } else if (activeSubmenu === 'color') {
          if (selectedIndex < TEXT_COLORS.length) {
            onColorChange(TEXT_COLORS[selectedIndex].value, undefined);
          } else {
            onColorChange(undefined, BACKGROUND_COLORS[selectedIndex - TEXT_COLORS.length].value);
          }
          onClose();
        } else {
          if (selectedIndex === 0) {
            setActiveSubmenu('turnInto');
          } else if (selectedIndex === 1) {
            setActiveSubmenu('color');
          } else if (selectedIndex === 2) {
            onDuplicate();
            onClose();
          } else if (selectedIndex === homeworkIdx) {
            onAddToHomework?.();
            onClose();
          } else if (selectedIndex === commentIdx) {
            onComment?.();
            onClose();
          } else if (selectedIndex === deleteIdx) {
            onDelete();
            onClose();
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (activeSubmenu) {
          setActiveSubmenu(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSubmenu, selectedIndex, onClose, onDelete, onDuplicate, onComment, onAddToHomework, onTurnInto, onColorChange, mainItemsCount, homeworkIdx, commentIdx, deleteIdx]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const clickedInsideMenu = menuRef.current?.contains(e.target as Node);
      const clickedInsideSubmenu = submenuRef.current?.contains(e.target as Node);
      
      if (!clickedInsideMenu && !clickedInsideSubmenu) {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [position, onClose]);

  if (!position) return null;

  return (
    <>
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[160px] sm:min-w-[220px]"
        style={{
          left: `${menuLeft}px`,
          top: `${menuTop}px`,
        }}
      >
        <button
          type="button"
          role="menuitem"
          className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 transition-all ${
            selectedIndex === 0 && !activeSubmenu
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
          onClick={() => setActiveSubmenu(activeSubmenu === 'turnInto' ? null : 'turnInto')}
          onMouseEnter={() => {
            setSelectedIndex(0);
            setActiveSubmenu('turnInto');
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Type size={14} className="sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t('editor.turnInto')}</span>
          </div>
          <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400" />
        </button>

        {/* Color */}
        <button
          type="button"
          role="menuitem"
          className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2 transition-all ${
            selectedIndex === 1 && !activeSubmenu
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
          onClick={() => setActiveSubmenu(activeSubmenu === 'color' ? null : 'color')}
          onMouseEnter={() => {
            setSelectedIndex(1);
            setActiveSubmenu('color');
          }}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t('editor.color')}</span>
          </div>
          <ChevronRight size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400" />
        </button>

        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

        {/* Duplicate */}
        <button
          type="button"
          role="menuitem"
          className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all ${
            selectedIndex === 2 && !activeSubmenu
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
          onClick={() => {
            onDuplicate();
            onClose();
          }}
          onMouseEnter={() => {
            setSelectedIndex(2);
            setActiveSubmenu(null);
          }}
        >
          <Copy size={14} className="sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t('editor.duplicate')}</span>
        </button>

        {onAddToHomework && (
          <button
            type="button"
            role="menuitem"
            className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all ${
              selectedIndex === homeworkIdx && !activeSubmenu
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            onClick={() => {
              onAddToHomework();
              onClose();
            }}
            onMouseEnter={() => {
              setSelectedIndex(homeworkIdx);
              setActiveSubmenu(null);
            }}
          >
            <ClipboardList size={14} className="sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t('editor.addToHomework')}</span>
          </button>
        )}

        {onComment && (
          <button
            type="button"
            role="menuitem"
            className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all ${
              selectedIndex === commentIdx && !activeSubmenu
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
            }`}
            onClick={() => {
              onComment();
              onClose();
            }}
            onMouseEnter={() => {
              setSelectedIndex(commentIdx);
              setActiveSubmenu(null);
            }}
          >
            <MessageSquare size={14} className="sm:w-4 sm:h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t('editor.comment')}</span>
          </button>
        )}

        <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

        <button
          type="button"
          role="menuitem"
          className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 sm:gap-2 transition-all ${
            selectedIndex === deleteIdx && !activeSubmenu
              ? 'bg-gray-100 dark:bg-gray-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
          onClick={() => {
            onDelete();
            onClose();
          }}
          onMouseEnter={() => {
            setSelectedIndex(deleteIdx);
            setActiveSubmenu(null);
          }}
        >
          <Trash2 size={14} className="sm:w-4 sm:h-4 text-red-500 dark:text-red-400" />
          <span className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400">{t('editor.delete')}</span>
        </button>
      </div>

      {/* Turn Into Submenu */}
      {activeSubmenu === 'turnInto' && (
        <div
          ref={submenuRef}
          className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 min-w-[150px] sm:min-w-[200px] max-h-[300px] sm:max-h-[400px] overflow-y-auto"
          style={{
            left: `${Math.min(menuLeft + 170, window.innerWidth - 160)}px`,
            top: `${menuTop}px`,
          }}
        >
          {TURN_INTO_COMMANDS.map((cmd, index) => {
            const IconComponent = cmd.icon;
            const isSelected = index === selectedIndex;
            return (
              <button
                type="button"
                key={cmd.id}
                role="menuitem"
                className={`w-full text-left px-1.5 sm:px-2 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 transition-all rounded mx-0.5 ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
                onClick={() => {
                  if (cmd.id === 'link') {
                    onAddLink?.();
                  } else {
                    onTurnInto(cmd.id as BlockType);
                  }
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0">
                  <IconComponent
                    size={14}
                    className={`sm:w-4 sm:h-4 ${
                      isSelected ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'
                    }`}
                    strokeWidth={2}
                  />
                </div>
                <span
                  className={`text-xs sm:text-sm font-semibold ${
                    isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {cmd.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Color Submenu */}
      {activeSubmenu === 'color' && (
        <div
          ref={submenuRef}
          className="fixed z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 sm:py-2 min-w-[160px] sm:min-w-[220px] max-h-[300px] sm:max-h-[400px] overflow-y-auto"
          style={{
            left: `${Math.min(menuLeft + 170, window.innerWidth - 170)}px`,
            top: `${menuTop}px`,
          }}
        >
          <div className="px-2 sm:px-3 py-1">
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('editor.textColor')}
            </span>
          </div>
          {TEXT_COLORS.map((color, index) => {
            const isSelected = index === selectedIndex;
            const isCurrent = color.value === currentTextColor;
            return (
              <button
                type="button"
                key={color.value}
                role="menuitem"
                className={`w-full text-left px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 sm:gap-3 transition-all ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
                onClick={() => {
                  onColorChange(color.value, undefined);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                  {isCurrent && (
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <span className={`text-xs sm:text-sm ${color.colorClass}`}>A</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t(color.labelKey)}</span>
              </button>
            );
          })}

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5 sm:my-2" />

          <div className="px-2 sm:px-3 py-1">
            <span className="text-[10px] sm:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('editor.backgroundColor')}
            </span>
          </div>
          {BACKGROUND_COLORS.map((color, index) => {
            const actualIndex = index + TEXT_COLORS.length;
            const isSelected = actualIndex === selectedIndex;
            const isCurrent = color.value === currentBackgroundColor;
            return (
              <button
                type="button"
                key={color.value}
                role="menuitem"
                className={`w-full text-left px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-2 sm:gap-3 transition-all ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-gray-800'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
                onClick={() => {
                  onColorChange(undefined, color.value);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(actualIndex)}
              >
                <div className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                  {isCurrent && (
                    <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-blue-600" />
                  )}
                </div>
                <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded ${color.colorClass} border border-gray-300 dark:border-gray-600`} />
                <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t(color.labelKey)}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};
