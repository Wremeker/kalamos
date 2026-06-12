import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Minus,
  Bookmark,
  ExternalLink,
  Quote
} from 'lucide-react';
import { BlockType } from '@/types/editor.ts';


interface SelectionMenuProps {
  onClose: () => void;
  onBlockTypeChange?: (type: BlockType) => void;
  onAddLink?: (existingUrl: string, position: { x: number; y: number }, callback: (url: string) => void) => void;
  onComment?: () => void;
  onFormatApplied?: () => void;
  currentBlockType?: BlockType | null;
  isInsideToggle?: boolean;
  isInsideTable?: boolean;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({
  onClose,
  onBlockTypeChange,
  onAddLink,
  onComment,
  onFormatApplied,
  currentBlockType,
  isInsideToggle = false,
  isInsideTable = false
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);
  const savedSelectionRef = useRef<Range | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [showBelow, setShowBelow] = useState(false);
  const [showTurnIntoMenu, setShowTurnIntoMenu] = useState(false);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    link: false,
  });
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const TEXT_COLORS = [
    { name: 'black', color: '#000000' },
    { name: 'red', color: '#ef4444' },
    { name: 'orange', color: '#f97316' },
    { name: 'green', color: '#22c55e' },
    { name: 'blue', color: '#3b82f6' },
    { name: 'purple', color: '#a855f7' },
  ];

  const checkFormat = useCallback((tag: string, element: Node | null): boolean => {
    if (!element) return false;
    
    let el: Node | null = element;
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

  const checkActiveColor = useCallback((element: Node | null): string | null => {
    if (!element) return null;
    let el: Node | null = element;
    if (el.nodeType === Node.TEXT_NODE) {
      el = el.parentElement;
    }
    while (el && el instanceof HTMLElement && !el.hasAttribute('data-block-id')) {
      if (el.tagName === 'SPAN' && el.style.color) {
        return el.style.color;
      }
      el = el.parentElement;
    }
    return null;
  }, []);

  useEffect(() => {
    const updatePosition = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        onClose();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width === 0 && rect.height === 0) {
        onClose();
        return;
      }

      savedSelectionRef.current = range.cloneRange();


      const menuHeight = 50;
      const shouldShowBelow = rect.top - menuHeight < 0;
      setShowBelow(shouldShowBelow);

      setPosition({
        x: rect.left + rect.width / 2,
        y: shouldShowBelow ? rect.bottom + 10 : rect.top - 10,
      });

      const parentElement = range.commonAncestorContainer.parentElement;
      const hasLink = parentElement?.closest('a') !== null;
      
      setActiveFormats({
        bold: checkFormat('STRONG', range.commonAncestorContainer),
        italic: checkFormat('EM', range.commonAncestorContainer),
        underline: checkFormat('U', range.commonAncestorContainer),
        strikethrough: checkFormat('S', range.commonAncestorContainer),
        link: hasLink,
      });

      setActiveColor(checkActiveColor(range.commonAncestorContainer));
    };

    updatePosition();

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        onClose();
      } else {
        updatePosition();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [onClose, checkFormat, checkActiveColor]);

  useEffect(() => {
    if (!menuRef.current || !position) return;
    const menu = menuRef.current;
    const menuRect = menu.getBoundingClientRect();
    const padding = 8;

    if (menuRect.left < padding) {
      menu.style.left = `${position.x - menuRect.left + padding}px`;
    } else if (menuRect.right > window.innerWidth - padding) {
      menu.style.left = `${position.x - (menuRect.right - window.innerWidth) - padding}px`;
    }
  }, [position]);

  const restoreSelection = () => {
    if (savedSelectionRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRef.current);
      }
    }
  };

  const applyFormat = (command: string) => {
    restoreSelection();
    
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
    
    // Check whether format is applied
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
      savedSelectionRef.current = newRange.cloneRange();
    } else {
      try {
        const fragment = range.extractContents();
        const wrapper = document.createElement(tagName.toLowerCase());
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);
        
        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedSelectionRef.current = newRange.cloneRange();
      } catch (e) {
        document.execCommand(command, false);
      }
    }
    
    const sel = window.getSelection();
    const parentElement = sel?.anchorNode?.parentElement;
    const hasLink = parentElement?.closest('a') !== null;
    
    setActiveFormats({
      bold: checkFormat('STRONG', sel?.anchorNode || null),
      italic: checkFormat('EM', sel?.anchorNode || null),
      underline: checkFormat('U', sel?.anchorNode || null),
      strikethrough: checkFormat('S', sel?.anchorNode || null),
      link: hasLink,
    });

    // Notify parent that formatting was applied to trigger collaboration update
    if (onFormatApplied) {
      // Use setTimeout to ensure DOM is fully updated
      setTimeout(() => {
        onFormatApplied();
      }, 0);
    }
  };

  const applyColor = (color: string) => {
    restoreSelection();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    let element = range.commonAncestorContainer as Node;
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement as Node;
    }

    let colorSpan: HTMLElement | null = null;
    let currentEl = element as HTMLElement;
    while (currentEl && currentEl instanceof HTMLElement && !currentEl.hasAttribute('data-block-id')) {
      if (currentEl.tagName === 'SPAN' && currentEl.style.color) {
        colorSpan = currentEl;
        break;
      }
      currentEl = currentEl.parentElement as HTMLElement;
    }

    if (colorSpan) {
      // If same color, remove it; if different color, change it
      const currentColor = colorSpan.style.color;
      const tempEl = document.createElement('span');
      tempEl.style.color = color;
      const normalizedNew = tempEl.style.color;

      if (currentColor === normalizedNew) {
        // Remove color
        const textNode = document.createTextNode(colorSpan.textContent || '');
        colorSpan.parentNode?.replaceChild(textNode, colorSpan);

        const newRange = document.createRange();
        newRange.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedSelectionRef.current = newRange.cloneRange();
        setActiveColor(null);
      } else {
        // Change color
        colorSpan.style.color = color;
        setActiveColor(color);
      }
    } else {
      // Wrap selection in colored span
      try {
        const fragment = range.extractContents();
        const wrapper = document.createElement('span');
        wrapper.style.color = color;
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);

        const newRange = document.createRange();
        newRange.selectNodeContents(wrapper);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedSelectionRef.current = newRange.cloneRange();
        setActiveColor(color);
      } catch (e) {
        document.execCommand('foreColor', false, color);
        setActiveColor(color);
      }
    }

    if (onFormatApplied) {
      setTimeout(() => {
        onFormatApplied();
      }, 0);
    }
  };

  const handleLinkToggle = () => {
    restoreSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const parentElement = range.commonAncestorContainer.parentElement;
    const linkElement = parentElement?.closest('a');
    
    if (linkElement) {
      // Remove existing link
      const textNode = document.createTextNode(linkElement.textContent || '');
      linkElement.parentNode?.replaceChild(textNode, linkElement);
      
      // Update state
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
        setActiveFormats(prev => ({ ...prev, link: false }));
      }

      // Notify parent that formatting was applied to trigger collaboration update
      if (onFormatApplied) {
        setTimeout(() => {
          onFormatApplied();
        }, 0);
      }
    } else {
      // Add new link via modal
      if (onAddLink) {
        // Calculate modal position from saved selection
        let modalPosition: { x: number; y: number } | null = null;
        
        if (savedSelectionRef.current) {
          const rect = savedSelectionRef.current.getBoundingClientRect();
          // Check that rect is valid (not collapsed/empty)
          if (rect.width > 0 || rect.height > 0) {
            modalPosition = { x: rect.left, y: rect.bottom + 8 };
          }
        }
        
        // If saved selection failed, try current selection
        if (!modalPosition) {
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width > 0 || rect.height > 0) {
              modalPosition = { x: rect.left, y: rect.bottom + 8 };
            }
          }
        }
        
        // If still no position, use menu position as fallback
        if (!modalPosition && position) {
          modalPosition = { x: position.x, y: position.y + 40 };
        }
        
        // If still no position, try active element (for empty blocks)
        if (!modalPosition) {
          const activeElement = document.activeElement as HTMLElement;
          if (activeElement && activeElement.hasAttribute('data-block-id')) {
            const rect = activeElement.getBoundingClientRect();
            modalPosition = { x: rect.left, y: rect.bottom + 8 };
          }
        }
        
        // If we have a position, open modal
        if (modalPosition) {
          onAddLink('https://', modalPosition, (url: string) => {
          restoreSelection();
          const sel = window.getSelection();
          if (!sel) return;
          
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'text-blue-600 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300';
          
          // If there's a selection, wrap it in a link
          if (sel.rangeCount > 0 && !sel.isCollapsed) {
            const r = sel.getRangeAt(0);
            
            try {
              r.surroundContents(link);
            } catch (e) {
              const fragment = r.extractContents();
              link.appendChild(fragment);
              r.insertNode(link);
            }
            
            // Update state
            if (sel.rangeCount > 0) {
              savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
              setActiveFormats(prev => ({ ...prev, link: true }));
            }
          } else {
            // If no selection (empty block), insert the link at cursor position
            link.textContent = url;
            
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && activeElement.hasAttribute('data-block-id')) {
              if (sel.rangeCount > 0) {
                const range = sel.getRangeAt(0);
                range.insertNode(link);
                // Move cursor after the link
                range.setStartAfter(link);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                savedSelectionRef.current = range.cloneRange();
              } else {
                activeElement.appendChild(link);
              }
            }
          }

          // Notify parent that formatting was applied to trigger collaboration update
          if (onFormatApplied) {
            setTimeout(() => {
              onFormatApplied();
            }, 0);
          }
        });
        }
      }
    }
  };

  const handleBlockTypeChange = (type: BlockType) => {
    // Restore selection before changing block type
    restoreSelection();
    
    if (onBlockTypeChange) {
      onBlockTypeChange(type);
    }
    
    setShowTurnIntoMenu(false);
  };

  const handleComment = () => {
    if (onComment) {
      onComment();
    }
  };

  if (!position) return null;

  const buttonClass = (isActive: boolean) =>
    `px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
      isActive ? 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
    }`;

  const iconButtonClass = (isActive: boolean) =>
    `p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
      isActive ? 'bg-gray-200 dark:bg-gray-600' : ''
    }`;

  // Main block types (shown as direct buttons)
  const mainBlockTypes = [
    { type: 'paragraph' as BlockType, label: t('editor.text'), icon: Type },
    { type: 'h1' as BlockType, label: t('editor.h1'), icon: Heading1 },
    { type: 'h2' as BlockType, label: t('editor.h2'), icon: Heading2 },
    { type: 'h3' as BlockType, label: t('editor.h3'), icon: Heading3 },
    { type: 'h4' as BlockType, label: t('editor.h4'), icon: Heading4 },
    { type: 'h5' as BlockType, label: t('editor.h5'), icon: Heading5 },
    { type: 'quote' as BlockType, label: t('editor.quote'), icon: Quote },
  ];

  // Dropdown menu block types (shown in "Turn into" menu)
  const allDropdownBlockTypes = [
    { type: 'bulleted' as BlockType, label: t('editor.bulleted'), icon: List, category: 'list' },
    { type: 'numbered' as BlockType, label: t('editor.numbered'), icon: ListOrdered, category: 'list' },
    { type: 'todo' as BlockType, label: t('editor.todo'), icon: CheckSquare, category: 'list' },
    { type: 'toggle_list' as BlockType, label: t('editor.toggleList'), icon: ChevronRight, category: 'list' },
    { type: 'code' as BlockType, label: t('editor.code'), icon: Code, category: 'other' },
    { type: 'bookmark' as BlockType, label: t('editor.bookmark'), icon: Bookmark, category: 'other' },
    { type: 'embed' as BlockType, label: t('editor.embed'), icon: ExternalLink, category: 'other' },
    { type: 'divider' as BlockType, label: t('editor.divider'), icon: Minus, category: 'other' },
  ];

  // Filter out toggle blocks if we're inside a toggle
  const dropdownBlockTypes = isInsideToggle 
    ? allDropdownBlockTypes.filter(item => item.type !== 'toggle_list')
    : allDropdownBlockTypes;

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: showBelow ? 'translateX(-50%)' : 'translate(-50%, -100%)',
        maxWidth: 'calc(100vw - 16px)',
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex items-center gap-0.5 px-1.5 py-1">
        {/* Show block types only if NOT inside a table */}
        {!isInsideTable && (
          <>
            <div 
              className="relative"
              onMouseEnter={() => setShowTurnIntoMenu(true)}
              onMouseLeave={() => setShowTurnIntoMenu(false)}
            >
              <button
                type="button"
                className={`${buttonClass(false)} flex items-center gap-1`}
                onMouseDown={(e) => e.preventDefault()}
                title={t('editor.changeBlockType')}
                aria-label={t('editor.changeBlockType')}
              >
                <span className="text-xs font-medium">{t('editor.turnInto')}</span>
                <ChevronDown size={12} className="text-gray-700 dark:text-gray-300" />
              </button>
              
              {showTurnIntoMenu && (
                <div className="absolute top-full left-0 -mt-px bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[220px] max-h-[400px] overflow-y-auto">
                  {dropdownBlockTypes.map(({ type, label, icon: Icon, category }, index) => {
                    const prevCategory = index > 0 ? dropdownBlockTypes[index - 1].category : null;
                    const currentCategory = category;
                    const showDivider = prevCategory && prevCategory !== currentCategory;
                    
                    return (
                      <React.Fragment key={type}>
                        {showDivider && (
                          <div className="h-px bg-gray-200 dark:bg-gray-700 my-0.5" />
                        )}
                        <button
                          type="button"
                          className="w-full text-left px-2.5 py-1 text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleBlockTypeChange(type)}
                        >
                          <Icon size={14} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span>{label}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Main block type buttons */}
            {mainBlockTypes.map(({ type, label, icon: Icon }) => (
              <button
                type="button"
                key={type}
                className={iconButtonClass(currentBlockType === type)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleBlockTypeChange(type)}
                title={label}
                aria-label={label}
              >
                <Icon size={14} className="text-gray-700 dark:text-gray-300" />
              </button>
            ))}

            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
          </>
        )}

      <button
        type="button"
        className={iconButtonClass(activeFormats.bold)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyFormat('bold')}
        title={t('editor.boldShortcut')}
        aria-label={t('editor.bold')}
      >
        <Bold size={14} className="text-gray-700 dark:text-gray-300" />
      </button>
      
      <button
        type="button"
        className={iconButtonClass(activeFormats.italic)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyFormat('italic')}
        title={t('editor.italicShortcut')}
        aria-label={t('editor.italic')}
      >
        <Italic size={14} className="text-gray-700 dark:text-gray-300" />
      </button>
      
      <button
        type="button"
        className={iconButtonClass(activeFormats.underline)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyFormat('underline')}
        title={t('editor.underlineShortcut')}
        aria-label={t('editor.underline')}
      >
        <Underline size={14} className="text-gray-700 dark:text-gray-300" />
      </button>
      
      <button
        type="button"
        className={iconButtonClass(activeFormats.strikethrough)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => applyFormat('strikethrough')}
        title={t('editor.strikethrough')}
        aria-label={t('editor.strikethrough')}
      >
        <Strikethrough size={14} className="text-gray-700 dark:text-gray-300" />
      </button>

      {/* Color Buttons */}
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      {TEXT_COLORS.map(({ name, color }) => {
        const tempEl = document.createElement('span');
        tempEl.style.color = color;
        const normalizedColor = tempEl.style.color;
        const isActive = activeColor === normalizedColor;

        return (
          <button
            key={name}
            type="button"
            className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-200 dark:bg-gray-600' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyColor(color)}
            title={name.charAt(0).toUpperCase() + name.slice(1)}
            aria-label={name}
          >
            <span
              className="block w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-500"
              style={{ backgroundColor: color }}
            />
          </button>
        );
      })}

      {/* Link Button */}
      <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      <button
        type="button"
        className={iconButtonClass(activeFormats.link)}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleLinkToggle}
        title={t('editor.linkShortcut')}
        aria-label={t('editor.link')}
      >
        <LinkIcon size={14} className="text-gray-700 dark:text-gray-300" />
      </button>

      {/* Comment Button */}
      {!isInsideTable && onComment && (
        <button
          type="button"
          className={iconButtonClass(false)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleComment}
          title={t('editor.comment')}
          aria-label={t('editor.comment')}
        >
          <MessageSquare size={14} className="text-gray-700 dark:text-gray-300" />
        </button>
      )}
      </div>
    </div>
  );
};

