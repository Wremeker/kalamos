import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Link as LinkIcon, 
  Type, 
  Heading1, 
  Heading2, 
  Heading3, 
  Heading4,
  List, 
  ListOrdered, 
  CheckSquare,
  Code,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
  ChevronDown,
  Undo2,
  Redo2,
  Smile
} from 'lucide-react';
import { BlockType } from '../../types/editor';

const PANEL_TOOLBAR_WIDTH = 100;
const PANEL_TOOLBAR_GAP = 16;

interface FixedToolbarProps {
  currentBlockType?: BlockType | null;
  currentAlignment?: 'left' | 'center' | 'right';
  onBlockTypeChange?: (type: BlockType) => void;
  onFormatApplied?: () => void;
  onAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onAddLink?: () => void;
  onAddImage?: () => void;
  onAddEmoji?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  readOnly?: boolean;
  stickyToolbar?: boolean;
  variant?: 'horizontal' | 'panel';
  contentRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export const FixedToolbar: React.FC<FixedToolbarProps> = ({
  currentBlockType,
  currentAlignment,
  onBlockTypeChange,
  onFormatApplied,
  onAlignmentChange,
  onAddLink,
  onAddImage,
  onAddEmoji,
  onUndo,
  onRedo,
  readOnly = false,
  stickyToolbar = true,
  variant = 'horizontal',
  contentRef,
  className: extraClassName,
}) => {
  const { t } = useTranslation();
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    link: false,
  });
  const [showBlockTypeDropdown, setShowBlockTypeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const checkFormat = useCallback((tag: string): boolean => {
    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return false;
    
    let el: Node | null = selection.anchorNode;
    if (el.nodeType === Node.TEXT_NODE) {
      el = el.parentElement;
    }
    while (el && el instanceof HTMLElement && !el.hasAttribute('data-block-id')) {
      if (el.tagName === tag || 
          (tag === 'STRONG' && el.tagName === 'B') ||
          (tag === 'EM' && el.tagName === 'I') ||
          (tag === 'S' && el.tagName === 'STRIKE')) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }, []);

  useEffect(() => {
    const updateActiveFormats = () => {
      const selection = window.getSelection();
      if (!selection || !selection.anchorNode) {
        setActiveFormats({
          bold: false,
          italic: false,
          underline: false,
          strikethrough: false,
          link: false,
        });
        return;
      }

      const parentElement = selection.anchorNode.nodeType === Node.TEXT_NODE 
        ? selection.anchorNode.parentElement 
        : selection.anchorNode as HTMLElement;
      const hasLink = parentElement?.closest('a') !== null;
      
      setActiveFormats({
        bold: checkFormat('STRONG'),
        italic: checkFormat('EM'),
        underline: checkFormat('U'),
        strikethrough: checkFormat('S'),
        link: hasLink,
      });
    };

    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [checkFormat]);

  useEffect(() => {
    if (!showBlockTypeDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowBlockTypeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBlockTypeDropdown]);

  const [panelLeft, setPanelLeft] = useState<number>(12);

  useEffect(() => {
    if (variant !== 'panel' || !contentRef?.current) return;

    const update = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPanelLeft(Math.max(4, rect.left - PANEL_TOOLBAR_WIDTH - PANEL_TOOLBAR_GAP));
    };

    update();
    window.addEventListener('resize', update);
    const observer = new ResizeObserver(update);
    observer.observe(contentRef.current);

    return () => {
      window.removeEventListener('resize', update);
      observer.disconnect();
    };
  }, [variant, contentRef]);

  const applyFormat = useCallback((command: string) => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    const tagMap: Record<string, string> = {
      'bold': 'STRONG',
      'italic': 'EM',
      'underline': 'U',
      'strikethrough': 'S',
    };
    
    const tagName = tagMap[command];
    if (!tagName) return;
    
    let element = range.commonAncestorContainer as Node;
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as Node;
    }
    
    let formatElement: HTMLElement | null = null;
    let currentElement = element as HTMLElement;
    
    while (currentElement && currentElement instanceof HTMLElement && !currentElement.hasAttribute('data-block-id')) {
      if (currentElement.tagName === tagName || 
          (tagName === 'STRONG' && currentElement.tagName === 'B') ||
          (tagName === 'EM' && currentElement.tagName === 'I') ||
          (tagName === 'S' && currentElement.tagName === 'STRIKE')) {
        formatElement = currentElement;
        break;
      }
      currentElement = currentElement.parentElement as HTMLElement;
    }

    if (formatElement) {
      const textNode = document.createTextNode(formatElement.textContent || '');
      formatElement.parentNode?.replaceChild(textNode, formatElement);
      
      const newRange = document.createRange();
      newRange.selectNodeContents(textNode);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      try {
        if (range.collapsed) {
          document.execCommand(command, false);
        } else {
          const fragment = range.extractContents();
          const wrapper = document.createElement(tagName.toLowerCase());
          wrapper.appendChild(fragment);
          range.insertNode(wrapper);
          
          const newRange = document.createRange();
          newRange.selectNodeContents(wrapper);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }
      } catch (e) {
        document.execCommand(command, false);
      }
    }
    
    if (onFormatApplied) {
      setTimeout(() => {
        onFormatApplied();
      }, 0);
    }
  }, [readOnly, onFormatApplied]);

  const handleBlockTypeChange = useCallback((type: BlockType) => {
    if (readOnly || !onBlockTypeChange) return;
    onBlockTypeChange(type);
    setShowBlockTypeDropdown(false);
  }, [readOnly, onBlockTypeChange]);

  const handleLinkToggle = useCallback(() => {
    if (readOnly || !onAddLink) return;
    onAddLink();
  }, [readOnly, onAddLink]);

  const handleAddImage = useCallback(() => {
    if (readOnly || !onAddImage) return;
    onAddImage();
  }, [readOnly, onAddImage]);

  const handleAddEmoji = useCallback(() => {
    if (readOnly || !onAddEmoji) return;
    onAddEmoji();
  }, [readOnly, onAddEmoji]);

  const blockTypes: { type: BlockType; label: string; icon: typeof Type }[] = [
    { type: 'paragraph' as BlockType, label: t('editor.text'), icon: Type },
    { type: 'h1' as BlockType, label: t('editor.h1'), icon: Heading1 },
    { type: 'h2' as BlockType, label: t('editor.h2'), icon: Heading2 },
    { type: 'h3' as BlockType, label: t('editor.h3'), icon: Heading3 },
    { type: 'h4' as BlockType, label: t('editor.h4'), icon: Heading4 },
    { type: 'bulleted' as BlockType, label: t('editor.bulleted'), icon: List },
    { type: 'numbered' as BlockType, label: t('editor.numbered'), icon: ListOrdered },
    { type: 'todo' as BlockType, label: t('editor.todo'), icon: CheckSquare },
    { type: 'code' as BlockType, label: t('editor.code'), icon: Code },
    { type: 'quote' as BlockType, label: t('editor.quote'), icon: Quote },
  ];

  const currentType = blockTypes.find(bt => bt.type === currentBlockType) || blockTypes[0];
  const CurrentTypeIcon = currentType.icon;

  if (variant === 'panel') {
    const panelIconBtn = (isActive: boolean) =>
      `p-2 rounded-lg transition-all duration-150 ${
        isActive 
          ? 'bg-[#EFF9FF] text-[#31A2FF] dark:bg-[#31A2FF]/20 dark:text-[#68BBFE]' 
          : 'text-[#4B5566] dark:text-gray-400 hover:bg-[#EFF9FF] hover:text-[#31A2FF] dark:hover:bg-gray-700 dark:hover:text-gray-200'
      } disabled:opacity-40 disabled:cursor-not-allowed`;

    return (
      <div
        data-tour="lesson-view-toolbar"
        className={`fixed top-1/2 -translate-y-1/2 z-50 hidden xl:flex flex-col items-center gap-0.5 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/60 dark:border-gray-700 p-1.5 ${extraClassName || ''}`}
        style={{ left: `${panelLeft}px` }}
      >
        {/* Block Type Button + Flyout */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className={`p-2 rounded-lg transition-all duration-150 flex items-center justify-center ${
              showBlockTypeDropdown 
                ? 'bg-[#EFF9FF] text-[#31A2FF] dark:bg-[#31A2FF]/20 dark:text-[#68BBFE]' 
                : 'text-[#4B5566] dark:text-gray-400 hover:bg-[#EFF9FF] hover:text-[#31A2FF] dark:hover:bg-gray-700'
            } disabled:opacity-40`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowBlockTypeDropdown(!showBlockTypeDropdown)}
            disabled={readOnly}
            title={t('editor.changeBlockType')}
          >
            <CurrentTypeIcon size={18} />
          </button>

          {showBlockTypeDropdown && (
            <div className="absolute left-full top-0 ml-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200/60 dark:border-gray-700 py-1 min-w-[180px] z-50">
              {blockTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2.5 transition-colors ${
                    currentBlockType === type
                      ? 'bg-[#EFF9FF] text-[#31A2FF] dark:bg-[#31A2FF]/20 dark:text-[#68BBFE]'
                      : 'text-[#293241] dark:text-gray-300 hover:bg-[#EFF9FF]/50 dark:hover:bg-gray-700'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockTypeChange(type)}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-6 h-px bg-gray-200 dark:bg-gray-600 my-0.5" />

        {/* Text Formatting */}
        <button type="button" className={panelIconBtn(activeFormats.bold)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} disabled={readOnly} title={`${t('editor.bold')} (⌘B)`} aria-label={t('editor.bold')}>
          <Bold size={18} />
        </button>
        <button type="button" className={panelIconBtn(activeFormats.italic)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} disabled={readOnly} title={`${t('editor.italic')} (⌘I)`} aria-label={t('editor.italic')}>
          <Italic size={18} />
        </button>
        <button type="button" className={panelIconBtn(activeFormats.underline)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} disabled={readOnly} title={`${t('editor.underline')} (⌘U)`} aria-label={t('editor.underline')}>
          <Underline size={18} />
        </button>
        <button type="button" className={panelIconBtn(activeFormats.strikethrough)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('strikethrough')} disabled={readOnly} title={t('editor.strikethrough')} aria-label={t('editor.strikethrough')}>
          <Strikethrough size={18} />
        </button>

        {/* Link Button */}
        {onAddLink && (
          <>
            <div className="w-6 h-px bg-gray-200 dark:bg-gray-600 my-0.5" />
            <button type="button" className={panelIconBtn(activeFormats.link)} onMouseDown={(e) => e.preventDefault()} onClick={handleLinkToggle} disabled={readOnly} title={`${t('editor.link')} (⌘K)`} aria-label={t('editor.link')}>
              <LinkIcon size={18} />
            </button>
          </>
        )}

        {/* Image Button */}
        {onAddImage && (
          <button type="button" className={panelIconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={handleAddImage} disabled={readOnly} title={t('editor.image')} aria-label={t('editor.image')}>
            <ImageIcon size={18} />
          </button>
        )}

        {/* Emoji Button */}
        {onAddEmoji && (
          <button type="button" className={panelIconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={handleAddEmoji} disabled={readOnly} title={t('editor.slashMenu.emoji.label')} aria-label={t('editor.slashMenu.emoji.label')}>
            <Smile size={18} />
          </button>
        )}

        {/* Alignment Buttons */}
        {onAlignmentChange && (
          <>
            <div className="w-6 h-px bg-gray-200 dark:bg-gray-600 my-0.5" />
            <button type="button" className={panelIconBtn(currentAlignment === 'left' || !currentAlignment)} onMouseDown={(e) => e.preventDefault()} onClick={() => onAlignmentChange('left')} disabled={readOnly} title={t('editor.alignLeft')} aria-label={t('editor.alignLeft')}>
              <AlignLeft size={18} />
            </button>
            <button type="button" className={panelIconBtn(currentAlignment === 'center')} onMouseDown={(e) => e.preventDefault()} onClick={() => onAlignmentChange('center')} disabled={readOnly} title={t('editor.alignCenter')} aria-label={t('editor.alignCenter')}>
              <AlignCenter size={18} />
            </button>
            <button type="button" className={panelIconBtn(currentAlignment === 'right')} onMouseDown={(e) => e.preventDefault()} onClick={() => onAlignmentChange('right')} disabled={readOnly} title={t('editor.alignRight')} aria-label={t('editor.alignRight')}>
              <AlignRight size={18} />
            </button>
          </>
        )}

        {/* Undo / Redo */}
        {(onUndo || onRedo) && (
          <>
            <div className="w-6 h-px bg-gray-200 dark:bg-gray-600 my-0.5" />
            <button type="button" className={panelIconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={onUndo} disabled={readOnly || !onUndo} title={`${t('editor.undo')} (⌘Z)`} aria-label={t('editor.undo')}>
              <Undo2 size={18} />
            </button>
            <button type="button" className={panelIconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={onRedo} disabled={readOnly || !onRedo} title={`${t('editor.redo')} (⌘⇧Z)`} aria-label={t('editor.redo')}>
              <Redo2 size={18} />
            </button>
          </>
        )}
      </div>
    );
  }

  const iconBtn = (isActive: boolean) =>
    `p-1.5 rounded-md transition-all duration-150 ${
      isActive 
        ? 'bg-[#EFF9FF] text-[#31A2FF] dark:bg-[#31A2FF]/20 dark:text-[#68BBFE]' 
        : 'text-[#4B5566] dark:text-gray-400 hover:bg-[#EFF9FF] hover:text-[#31A2FF] dark:hover:bg-gray-700 dark:hover:text-gray-200'
    } disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div className={`fixed-toolbar ${stickyToolbar ? 'sticky top-0' : ''} z-[60] bg-white dark:bg-gray-800 border-b border-[#ECF0F7] dark:border-gray-700 mb-6 opacity-70 xl:opacity-100 ${extraClassName || ''}`}>
      <div className="flex items-center gap-0.5 px-0 sm:px-8 md:px-16 py-1.5 flex-wrap">
        {/* Block Type Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
              showBlockTypeDropdown 
                ? 'bg-[#EFF9FF] text-[#31A2FF] dark:bg-[#31A2FF]/20 dark:text-[#68BBFE]' 
                : 'text-[#4B5566] dark:text-gray-400 hover:bg-[#EFF9FF] hover:text-[#31A2FF] dark:hover:bg-gray-700'
            } disabled:opacity-40`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setShowBlockTypeDropdown(!showBlockTypeDropdown)}
            disabled={readOnly}
            title={t('editor.changeBlockType')}
          >
            <CurrentTypeIcon size={14} />
            <span className="hidden sm:inline max-w-[80px] truncate">{currentType.label}</span>
            <ChevronDown size={12} className={`transition-transform duration-150 ${showBlockTypeDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showBlockTypeDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[#ECF0F7] dark:border-gray-700 py-1 min-w-[180px] z-50">
              {blockTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2.5 transition-colors ${
                    currentBlockType === type
                      ? 'bg-[#EFF9FF] text-[#31A2FF] dark:bg-[#31A2FF]/20 dark:text-[#68BBFE]'
                      : 'text-[#293241] dark:text-gray-300 hover:bg-[#EFF9FF]/50 dark:hover:bg-gray-700'
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleBlockTypeChange(type)}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-[#ECF0F7] dark:bg-gray-600 mx-1" />

        {/* Text Formatting */}
        <button type="button" className={iconBtn(activeFormats.bold)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} disabled={readOnly} title={`${t('editor.bold')} (⌘B)`} aria-label={t('editor.bold')}>
          <Bold size={15} />
        </button>
        <button type="button" className={iconBtn(activeFormats.italic)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} disabled={readOnly} title={`${t('editor.italic')} (⌘I)`} aria-label={t('editor.italic')}>
          <Italic size={15} />
        </button>
        <button type="button" className={iconBtn(activeFormats.underline)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} disabled={readOnly} title={`${t('editor.underline')} (⌘U)`} aria-label={t('editor.underline')}>
          <Underline size={15} />
        </button>
        <button type="button" className={iconBtn(activeFormats.strikethrough)} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('strikethrough')} disabled={readOnly} title={t('editor.strikethrough')} aria-label={t('editor.strikethrough')}>
          <Strikethrough size={15} />
        </button>

        {/* Link Button */}
        {onAddLink && (
          <>
            <div className="w-px h-5 bg-[#ECF0F7] dark:bg-gray-600 mx-1" />
            <button type="button" className={iconBtn(activeFormats.link)} onMouseDown={(e) => e.preventDefault()} onClick={handleLinkToggle} disabled={readOnly} title={`${t('editor.link')} (⌘K)`} aria-label={t('editor.link')}>
              <LinkIcon size={15} />
            </button>
          </>
        )}

        {/* Image Button */}
        {onAddImage && (
          <button type="button" className={iconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={handleAddImage} disabled={readOnly} title={t('editor.image')} aria-label={t('editor.image')}>
            <ImageIcon size={15} />
          </button>
        )}

        {/* Emoji Button */}
        {onAddEmoji && (
          <button type="button" className={iconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={handleAddEmoji} disabled={readOnly} title={t('editor.slashMenu.emoji.label')} aria-label={t('editor.slashMenu.emoji.label')}>
            <Smile size={15} />
          </button>
        )}

        {/* Alignment Buttons */}
        {onAlignmentChange && (
          <>
            <div className="w-px h-5 bg-[#ECF0F7] dark:bg-gray-600 mx-1" />
            <button type="button" className={iconBtn(currentAlignment === 'left' || !currentAlignment)} onMouseDown={(e) => e.preventDefault()} onClick={() => onAlignmentChange('left')} disabled={readOnly} title={t('editor.alignLeft')} aria-label={t('editor.alignLeft')}>
              <AlignLeft size={15} />
            </button>
            <button type="button" className={iconBtn(currentAlignment === 'center')} onMouseDown={(e) => e.preventDefault()} onClick={() => onAlignmentChange('center')} disabled={readOnly} title={t('editor.alignCenter')} aria-label={t('editor.alignCenter')}>
              <AlignCenter size={15} />
            </button>
            <button type="button" className={iconBtn(currentAlignment === 'right')} onMouseDown={(e) => e.preventDefault()} onClick={() => onAlignmentChange('right')} disabled={readOnly} title={t('editor.alignRight')} aria-label={t('editor.alignRight')}>
              <AlignRight size={15} />
            </button>
          </>
        )}

        {/* Undo / Redo */}
        {(onUndo || onRedo) && (
          <>
            <div className="w-px h-5 bg-[#ECF0F7] dark:bg-gray-600 mx-1" />
            <button type="button" className={iconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={onUndo} disabled={readOnly || !onUndo} title={`${t('editor.undo')} (⌘Z)`} aria-label={t('editor.undo')}>
              <Undo2 size={15} />
            </button>
            <button type="button" className={iconBtn(false)} onMouseDown={(e) => e.preventDefault()} onClick={onRedo} disabled={readOnly || !onRedo} title={`${t('editor.redo')} (⌘⇧Z)`} aria-label={t('editor.redo')}>
              <Redo2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};
