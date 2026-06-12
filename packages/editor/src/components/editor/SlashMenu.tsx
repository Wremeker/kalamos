import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useMenuPosition } from '../../hooks/editor/useMenuPosition';
import { useTranslation } from 'react-i18next';
import { 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4, 
  Heading5,
  ChevronRight,
  List, 
  ListOrdered, 
  CheckSquare,
  Image as ImageIcon,
  Minus,
  Code,
  Bookmark,
  Link as LinkIcon,
  LucideIcon,
  Quote,
  MessageSquare,
  Columns2,
  Columns3,
  Columns4,
  Table,
  FileText,
  Sigma,
  File as FileIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Smile
} from 'lucide-react';
import { BlockType, CommandItem } from '../../types/editor';
import {
   BLOCK_TYPE_CALLOUT,
   BLOCK_TYPE_TOGGLE_H1,
   BLOCK_TYPE_TOGGLE_H2,
   BLOCK_TYPE_TOGGLE_H3,
   BLOCK_TYPE_TOGGLE_LIST,
   BLOCK_TYPE_COLUMNS2,
   BLOCK_TYPE_COLUMNS3,
   BLOCK_TYPE_COLUMNS4,
   BLOCK_TYPE_COLUMNS5 
} from '@/constants/blockTypes';

interface CommandItemWithIcon extends Omit<CommandItem, 'icon'> {
  icon?: LucideIcon;
  description?: string;
  isSpecial?: boolean;
  specialType?: string;
  category: 'text' | 'list' | 'media';
  translationKey: string;
}

const getBlockColor = (blockId: string, isSpecial?: boolean, specialType?: string): string => {
  // For special items, use the specialType to determine color
  if (isSpecial) {
    if (specialType === 'link') return 'bg-sky-500';
    if (specialType === 'emoji') return 'bg-amber-500';
    if (specialType === 'file') return 'bg-orange-600';
  }
  if (blockId === 'video') return 'bg-red-500';
  if (blockId === 'audio') return 'bg-rose-600';
  if (blockId === 'pdf') return 'bg-purple-600';
  
  const colorMap: Record<string, string> = {
    'paragraph': 'bg-blue-500',
    'h1': 'bg-indigo-600',
    'h2': 'bg-indigo-500',
    'h3': 'bg-indigo-400',
    'h4': 'bg-blue-400',
    'h5': 'bg-blue-300',
    'quote': 'bg-purple-500',
    'callout': 'bg-cyan-500',
    
    'todo': 'bg-emerald-500',
    'bulleted': 'bg-amber-500',
    'numbered': 'bg-orange-500',
    'toggle_list': 'bg-yellow-600',
    'toggle_h1': 'bg-teal-600',
    'toggle_h2': 'bg-teal-500',
    'toggle_h3': 'bg-teal-400',
    
    'image': 'bg-pink-500',
    'pdf': 'bg-purple-600',
    'embed': 'bg-red-500',
    'bookmark': 'bg-violet-500',
    'code': 'bg-slate-700',
    'divider': 'bg-gray-500',
    'table': 'bg-fuchsia-500',
    'latex': 'bg-purple-600',
    'columns2': 'bg-lime-600',
    'columns3': 'bg-lime-500',
    'columns4': 'bg-lime-400',
    'columns5': 'bg-lime-300',
  };
  
  return colorMap[blockId] || 'bg-gray-500';
};

// Command templates - labels and descriptions come from translations
const COMMAND_TEMPLATES: Omit<CommandItemWithIcon, 'label' | 'description'>[] = [
  { id: 'paragraph', icon: Type, keywords: ['paragraph', 'text', 'p'], category: 'text', translationKey: 'text' },
  { id: 'h1', icon: Heading1, keywords: ['heading', 'h1', 'title', 'large'], category: 'text', translationKey: 'heading1' },
  { id: 'h2', icon: Heading2, keywords: ['heading', 'h2', 'subtitle'], category: 'text', translationKey: 'heading2' },
  { id: 'h3', icon: Heading3, keywords: ['heading', 'h3', 'section', 'subheading'], category: 'text', translationKey: 'heading3' },
  { id: 'h4', icon: Heading4, keywords: ['heading', 'h4'], category: 'text', translationKey: 'heading4' },
  { id: 'h5', icon: Heading5, keywords: ['heading', 'h5', 'small'], category: 'text', translationKey: 'heading5' },
  { id: 'quote', icon: Quote, keywords: ['quote', 'blockquote', 'citation', 'highlighted', 'spotlight'], category: 'text', translationKey: 'quote' },
  { id: 'callout', icon: MessageSquare, keywords: ['callout', 'note', 'info'], category: 'text', translationKey: 'callout' },
  { id: 'paragraph', icon: LinkIcon, keywords: ['link', 'url', 'hyperlink'], isSpecial: true, specialType: 'link', category: 'text', translationKey: 'link' },
  { id: 'paragraph', icon: Smile, keywords: ['emoji', 'emoticon', 'smiley', 'face', 'reaction'], isSpecial: true, specialType: 'emoji', category: 'text', translationKey: 'emoji' },
  { id: 'todo', icon: CheckSquare, keywords: ['todo', 'checkbox', 'task', 'check'], category: 'list', translationKey: 'todo' },
  { id: 'bulleted', icon: List, keywords: ['bullet', 'list', 'ul', 'bulleted'], category: 'list', translationKey: 'bulletedList' },
  { id: 'numbered', icon: ListOrdered, keywords: ['number', 'numbered', 'list', 'ol'], category: 'list', translationKey: 'numberedList' },
  { id: 'toggle_list', icon: ChevronRight, keywords: ['toggle', 'list', 'collapsible', 'expandable'], category: 'list', translationKey: 'toggleList' },
  { id: 'paragraph', icon: FileIcon, keywords: ['file', 'upload', 'attachment'], isSpecial: true, specialType: 'file', category: 'media', translationKey: 'file' },
  { id: 'image', icon: ImageIcon, keywords: ['image', 'picture', 'photo', 'img'], category: 'media', translationKey: 'image' },
  { id: 'video', icon: VideoIcon, keywords: ['video', 'mp4', 'webm'], category: 'media', translationKey: 'video' },
  { id: 'audio', icon: MusicIcon, keywords: ['audio', 'music', 'sound', 'mp3'], category: 'media', translationKey: 'audio' },
  { id: 'pdf', icon: FileText, keywords: ['pdf', 'document', 'file'], category: 'media', translationKey: 'pdf' },
  { id: 'bookmark', icon: Bookmark, keywords: ['bookmark', 'link preview', 'preview'], category: 'media', translationKey: 'bookmark' },
  { id: 'code', icon: Code, keywords: ['code', 'programming', 'snippet'], category: 'media', translationKey: 'code' },
  { id: 'toggle_h1', icon: ChevronRight, keywords: ['toggle', 'heading', 'h1', 'collapsible'], category: 'list', translationKey: 'toggleH1' },
  { id: 'toggle_h2', icon: ChevronRight, keywords: ['toggle', 'heading', 'h2', 'collapsible'], category: 'list', translationKey: 'toggleH2' },
  { id: 'toggle_h3', icon: ChevronRight, keywords: ['toggle', 'heading', 'h3', 'collapsible'], category: 'list', translationKey: 'toggleH3' },
  { id: 'divider', icon: Minus, keywords: ['divider', 'separator', 'line', 'hr'], category: 'media', translationKey: 'divider' },
  { id: 'table', icon: Table, keywords: ['table', 'grid', 'spreadsheet'], category: 'media', translationKey: 'table' },
  { id: 'latex', icon: Sigma, keywords: ['latex', 'math', 'formula', 'equation'], category: 'media', translationKey: 'latex' },
  { id: 'columns2', icon: Columns2, keywords: ['columns', '2 columns', 'two columns'], category: 'media', translationKey: 'columns2' },
  { id: 'columns3', icon: Columns3, keywords: ['columns', '3 columns', 'three columns'], category: 'media', translationKey: 'columns3' },
  { id: 'columns4', icon: Columns4, keywords: ['columns', '4 columns', 'four columns'], category: 'media', translationKey: 'columns4' },
  { id: 'columns5', icon: Columns4, keywords: ['columns', '5 columns', 'five columns'], category: 'media', translationKey: 'columns5' },
];

interface SlashMenuProps {
  position: { x: number; y: number } | null;
  filter: string;
  onSelect: (type: BlockType) => void;
  onAddLink?: () => void;
  onEmojiPickerOpen?: () => void;
  onClose: () => void;
  isNested?: boolean;
}

export const SlashMenu: React.FC<SlashMenuProps> = ({ position, filter, onSelect, onAddLink, onEmojiPickerOpen, onClose, isNested = false }) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const nestedContainerTypes = [
    BLOCK_TYPE_TOGGLE_H1, 
    BLOCK_TYPE_TOGGLE_H2, 
    BLOCK_TYPE_TOGGLE_H3, 
    BLOCK_TYPE_TOGGLE_LIST, 
    BLOCK_TYPE_CALLOUT, 
    BLOCK_TYPE_COLUMNS2, 
    BLOCK_TYPE_COLUMNS3, 
    BLOCK_TYPE_COLUMNS4, 
    BLOCK_TYPE_COLUMNS5
  ];

  const commands: CommandItemWithIcon[] = useMemo(() => {
    return COMMAND_TEMPLATES.map(template => ({
      ...template,
      label: t(`editor.slashMenu.${template.translationKey}.label`),
      description: t(`editor.slashMenu.${template.translationKey}.description`),
    }));
  }, [t]);

  const filteredCommands = commands.filter((cmd) => {
    if (isNested && nestedContainerTypes.includes(cmd.id)) {
      return false;
    }
    
    const search = filter.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(search) ||
      (cmd.description && cmd.description.toLowerCase().includes(search)) ||
      cmd.keywords.some((kw) => kw.includes(search))
    );
  });

  const textCommands = filteredCommands.filter(cmd => cmd.category === 'text');
  const listCommands = filteredCommands.filter(cmd => cmd.category === 'list');
  const mediaCommands = filteredCommands.filter(cmd => cmd.category === 'media');

  const sectionHeaderHeight = 24;
  const itemHeight = 56;
  const menuPadding = 12;

  let sectionsCount = 0;
  if (textCommands.length > 0) sectionsCount++;
  if (listCommands.length > 0) sectionsCount++;
  if (mediaCommands.length > 0) sectionsCount++;

  const calculatedHeight =
    (sectionsCount * sectionHeaderHeight) +
    (filteredCommands.length * itemHeight) +
    menuPadding;

  const estimatedMenuHeight = Math.min(calculatedHeight, 420);
  const responsiveMenuWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 220 : 320;

  const { menuTop, menuLeft } = useMenuPosition({
    position,
    menuHeight: estimatedMenuHeight,
    menuWidth: responsiveMenuWidth,
    offset: 16,
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  useEffect(() => {
    if (selectedItemRef.current && menuRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          const cmd = filteredCommands[selectedIndex];
          if (cmd.isSpecial && cmd.specialType === 'emoji' && onEmojiPickerOpen) {
            onEmojiPickerOpen();
          } else if (cmd.isSpecial && onAddLink) {
            onAddLink();
          } else if (!cmd.isSpecial) {
            onSelect(cmd.id);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onAddLink, onEmojiPickerOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (position) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [position, onClose]);

  if (!position || filteredCommands.length === 0) return null;

  const renderCommandSection = (commands: CommandItemWithIcon[], sectionTitle: string) => {
    if (commands.length === 0) return null;
    
    return (
      <>
        <div className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-medium text-gray-500 dark:text-gray-500 tracking-wide uppercase">
          {sectionTitle}
        </div>
        {commands.map((cmd) => {
          const index = filteredCommands.indexOf(cmd);
          const IconComponent = cmd.icon;
          const isSelected = index === selectedIndex;
          return (
            <button
              key={cmd.isSpecial ? `${cmd.id}-special-${cmd.label}` : `${cmd.id}-${cmd.label}`}
              ref={isSelected ? selectedItemRef : null}
              role="menuitem"
              aria-selected={isSelected}
              className={`w-full text-left px-2 sm:px-3 py-1.5 sm:py-2.5 flex items-start gap-2 sm:gap-2.5 transition-colors ${
                isSelected 
                  ? 'bg-gray-100 dark:bg-gray-800' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              onClick={() => {
                if (cmd.isSpecial && cmd.specialType === 'emoji' && onEmojiPickerOpen) {
                  onEmojiPickerOpen();
                } else if (cmd.isSpecial && onAddLink) {
                  onAddLink();
                } else if (!cmd.isSpecial) {
                  onSelect(cmd.id);
                }
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {IconComponent ? (
                <div className={`flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 rounded-md ${getBlockColor(cmd.id, cmd.isSpecial, cmd.specialType)}`}>
                  <IconComponent 
                    size={14} 
                    className="text-white sm:w-[17px] sm:h-[17px]"
                    strokeWidth={2}
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-0 flex-1 min-w-0">
                <span className={`text-xs sm:text-sm font-medium ${
                  isSelected 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-900 dark:text-gray-200'
                }`}>
                  {cmd.label}
                </span>
                {cmd.description && (
                  <span className="text-[10px] sm:text-xs leading-tight text-gray-500 dark:text-gray-500 hidden sm:block">
                    {cmd.description}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </>
    );
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Block types menu"
      className="fixed z-[60] bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-1 sm:py-1.5 overflow-y-auto w-[220px] sm:w-[320px] max-h-[300px] sm:max-h-[420px]"
      style={{
        left: `${menuLeft}px`,
        top: `${menuTop}px`,
      }}
    >
      {renderCommandSection(textCommands, t('editor.slashMenu.categories.text'))}
      {renderCommandSection(listCommands, t('editor.slashMenu.categories.list'))}
      {renderCommandSection(mediaCommands, t('editor.slashMenu.categories.media'))}
    </div>
  );
};

