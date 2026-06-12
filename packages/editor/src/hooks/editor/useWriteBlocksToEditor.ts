import { useCallback } from 'react';
import { useEditorContext } from '../../contexts/EditorContext';
import { Block, BlockType } from '../../types/editor';
import { BLOCK_TYPE_NUMBERED } from '../../constants/blockTypes';

/**
 * Token types for parsing text with LaTeX and markdown
 */
type Token = 
  | { type: 'text'; value: string }
  | { type: 'latex'; value: string; delimiter: '\\(' | '\\[' };

/**
 * Tokenizes text by extracting LaTeX expressions
 * Uses a simple state machine instead of regex for better maintainability
 */
const tokenizeText = (text: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  let currentText = '';

  while (i < text.length) {
    // Check for LaTeX delimiters
    if (i < text.length - 1 && text[i] === '\\') {
      const nextChar = text[i + 1];
      
      if (nextChar === '(' || nextChar === '[') {
        // Save accumulated text
        if (currentText) {
          tokens.push({ type: 'text', value: currentText });
          currentText = '';
        }

        // Find the closing delimiter
        const openDelimiter = nextChar === '(' ? '\\(' : '\\[';
        const closeDelimiter = nextChar === '(' ? '\\)' : '\\]';
        const closeChar = nextChar === '(' ? ')' : ']';
        
        i += 2; // Skip opening delimiter
        let latexContent = '';
        let found = false;

        while (i < text.length) {
          if (i < text.length - 1 && text[i] === '\\' && text[i + 1] === closeChar) {
            found = true;
            i += 2; // Skip closing delimiter
            break;
          }
          latexContent += text[i];
          i++;
        }

        if (found) {
          tokens.push({
            type: 'latex',
            value: openDelimiter + latexContent + closeDelimiter,
            delimiter: openDelimiter,
          });
        } else {
          // Malformed LaTeX, treat as text
          currentText += openDelimiter + latexContent;
        }
      } else {
        currentText += text[i];
        i++;
      }
    } else {
      currentText += text[i];
      i++;
    }
  }

  // Add remaining text
  if (currentText) {
    tokens.push({ type: 'text', value: currentText });
  }

  return tokens;
};

/**
 * Applies markdown formatting to text (without LaTeX)
 * Converts markdown syntax to HTML
 */
const applyMarkdownFormatting = (text: string): string => {
  let result = text;
  
  // Bold: **text** or __text__
  result = result.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\b__([^_]+)__\b/g, '<strong>$1</strong>');
  
  // Italic: *text* or _text_
  result = result.replace(/(?<!\*)\*([^\*]+)\*(?!\*)/g, '<em>$1</em>');
  result = result.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
  
  // Strikethrough: ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<s>$1</s>');
  
  return result;
};

const convertMarkdownToHtml = (text: string): string => {
  if (!text) return text;
  
  try {
    const tokens = tokenizeText(text);
    
    const processedTokens = tokens.map(token => {
      if (token.type === 'latex') {
        return token.value;
      } else {
        return applyMarkdownFormatting(token.value);
      }
    });
    
    return processedTokens.join('');
  } catch {
    return text;
  }
};

export interface SimpleBlock {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlignment?: 'left' | 'center' | 'right';
  startNumber?: number;
  language?: string;
  latexMode?: 'inline' | 'block';
  url?: string;
  title?: string;
  description?: string;
  favicon?: string;
  embedType?: 'youtube' | 'twitter' | 'generic';
  embedWidth?: number;
  embedHeight?: number;
  emoji?: string;
  backgroundColor?: string;
  isOpen?: boolean;
  children?: SimpleBlock[];
  columns?: SimpleBlock[][];
  columnWidths?: number[];
  tableData?: {
    cells: string[][];
    columnWidths?: number[];
    rowBackgroundColors?: string[];
    columnBackgroundColors?: string[];
    rowTextColors?: string[];
    columnTextColors?: string[];
  };
}

/**
 * Hook to write blocks to the editor from a simplified format.
 * Accepts blocks with HTML-formatted text and converts them to the editor's internal format.
 * 
 * @example
 * const { writeBlocks, appendBlocks, insertBlocksAt } = useWriteBlocksToEditor();
 * 
 * // Replace all blocks in the editor
 * writeBlocks([
 *   { id: "1", type: "paragraph", text: "Hello <strong>world</strong>" },
 *   { id: "2", type: "h1", text: "Title" },
 *   { 
 *     id: "3", 
 *     type: "toggle_h1", 
 *     text: "Toggle Heading", 
 *     isOpen: true,
 *     children: [
 *       { id: "3-1", type: "paragraph", text: "Nested content" }
 *     ]
 *   },
 *   {
 *     id: "4",
 *     type: "columns2",
 *     text: "",
 *     columns: [
 *       [{ id: "4-1-1", type: "paragraph", text: "Left column" }],
 *       [{ id: "4-2-1", type: "paragraph", text: "Right column" }]
 *     ],
 *     columnWidths: [50, 50]
 *   }
 * ]);
 * 
 * // Append blocks to the end
 * appendBlocks([
 *   { id: "5", type: "paragraph", text: "New content" }
 * ]);
 * 
 * // Insert blocks at a specific position
 * insertBlocksAt([
 *   { id: "6", type: "divider", text: "" }
 * ], 2); // Insert at index 2
 */
export const useWriteBlocksToEditor = () => {
  const { blocks, onChange } = useEditorContext();

  /**
   * Regenerates block IDs to ensure uniqueness
   */
  const regenerateBlockIds = useCallback((simpleBlocks: SimpleBlock[], existingIds: Set<string>): SimpleBlock[] => {
    let idCounter = blocks.length;
    
    return simpleBlocks.map(block => {
      let newId = String(idCounter++);
      while (existingIds.has(newId)) {
        newId = String(idCounter++);
      }
      existingIds.add(newId);
      
      // Also regenerate child IDs if present
      let childrenWithUniqueIds = block.children;
      if (block.children && block.children.length > 0) {
        childrenWithUniqueIds = block.children.map(child => {
          let childId = `${newId}-${idCounter++}`;
          while (existingIds.has(childId)) {
            childId = `${newId}-${idCounter++}`;
          }
          existingIds.add(childId);
          return { ...child, id: childId };
        });
      }
      
      return { ...block, id: newId, children: childrenWithUniqueIds };
    });
  }, [blocks.length]);

  const convertSimpleBlockToBlock = useCallback((simpleBlock: SimpleBlock): Block => {
    const block: Block = {
      id: simpleBlock.id,
      type: simpleBlock.type,
      text: convertMarkdownToHtml(simpleBlock.text || ''),
    };

    if (simpleBlock.checked) {
      block.checked = simpleBlock.checked;
    }

    if (simpleBlock.imageUrl) {
      block.imageUrl = simpleBlock.imageUrl;
      block.imageFile = simpleBlock.imageUrl; 
    }

    if (simpleBlock.imageWidth) {
      block.imageWidth = simpleBlock.imageWidth;
    }

    if (simpleBlock.imageHeight) {
      block.imageHeight = simpleBlock.imageHeight;
    }

    if (simpleBlock.imageAlignment) {
      block.imageAlignment = simpleBlock.imageAlignment;
    }

    if (simpleBlock.startNumber && simpleBlock.type !== BLOCK_TYPE_NUMBERED) {
      block.startNumber = simpleBlock.startNumber;
    }

    if (simpleBlock.language) {
      block.language = simpleBlock.language;
    }

    if (simpleBlock.latexMode) {
      block.latexMode = simpleBlock.latexMode;
    }

    if (simpleBlock.url) {
      block.url = simpleBlock.url;
    }

    if (simpleBlock.title) {
      block.title = convertMarkdownToHtml(simpleBlock.title);
    }

    if (simpleBlock.description) {
      block.description = convertMarkdownToHtml(simpleBlock.description);
    }

    if (simpleBlock.favicon) {
      block.favicon = simpleBlock.favicon;
    }

    if (simpleBlock.embedType) {
      block.embedType = simpleBlock.embedType;
    }

    if (simpleBlock.embedWidth) {
      block.embedWidth = simpleBlock.embedWidth;
    }

    if (simpleBlock.embedHeight) {
      block.embedHeight = simpleBlock.embedHeight;
    }

    if (simpleBlock.emoji) {
      block.emoji = simpleBlock.emoji;
    }

    if (simpleBlock.backgroundColor) {
      block.backgroundColor = simpleBlock.backgroundColor;
    }

    if (simpleBlock.isOpen) {
      block.isOpen = simpleBlock.isOpen;
    }

    // Handle nested children (for toggle blocks and callouts)
    if (simpleBlock.children && simpleBlock.children.length > 0) {
      block.children = simpleBlock.children.map(convertSimpleBlockToBlock);
    }

    // Handle columns (for column blocks)
    if (simpleBlock.columns && simpleBlock.columns.length > 0) {
      block.columns = simpleBlock.columns.map(column =>
        column.map(convertSimpleBlockToBlock)
      );
    }

    if (simpleBlock.columnWidths) {
      block.columnWidths = simpleBlock.columnWidths;
    }

    // Handle table data
    if (simpleBlock.tableData) {
      block.tableData = {
        // Table cells store HTML directly from contentEditable, so don't convert markdown
        cells: simpleBlock.tableData.cells,
        columnWidths: simpleBlock.tableData.columnWidths,
        rowBackgroundColors: simpleBlock.tableData.rowBackgroundColors,
        columnBackgroundColors: simpleBlock.tableData.columnBackgroundColors,
        rowTextColors: simpleBlock.tableData.rowTextColors,
        columnTextColors: simpleBlock.tableData.columnTextColors,
      };
    }

    return block;
  }, []);


  const writeBlocks = useCallback((simpleBlocks: SimpleBlock[]) => {
    const convertedBlocks = simpleBlocks.map(convertSimpleBlockToBlock);
    onChange(convertedBlocks);
  }, [convertSimpleBlockToBlock, onChange]);

  
  const appendBlocks = useCallback((simpleBlocks: SimpleBlock[]) => {
    const existingIds = new Set(blocks.map(b => b.id));
    const blocksWithUniqueIds = regenerateBlockIds(simpleBlocks, existingIds);
    const convertedBlocks = blocksWithUniqueIds.map(convertSimpleBlockToBlock);
    onChange([...blocks, ...convertedBlocks]);
  }, [blocks, convertSimpleBlockToBlock, onChange, regenerateBlockIds]);

  const insertBlocksAt = useCallback((simpleBlocks: SimpleBlock[], index: number) => {
    const existingIds = new Set(blocks.map(b => b.id));
    const blocksWithUniqueIds = regenerateBlockIds(simpleBlocks, existingIds);
    const convertedBlocks = blocksWithUniqueIds.map(convertSimpleBlockToBlock);
    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, ...convertedBlocks);
    onChange(newBlocks);
  }, [blocks, convertSimpleBlockToBlock, onChange, regenerateBlockIds]);


  const replaceBlocks = useCallback((simpleBlocks: SimpleBlock[], startIndex: number, count: number = 1) => {
    // Get all existing IDs (excluding the ones being replaced)
    const blocksBeforeReplace = blocks.slice(0, startIndex);
    const blocksAfterReplace = blocks.slice(startIndex + count);
    const existingIds = new Set([
      ...blocksBeforeReplace.map(b => b.id),
      ...blocksAfterReplace.map(b => b.id)
    ]);
    
    const blocksWithUniqueIds = regenerateBlockIds(simpleBlocks, existingIds);
    const convertedBlocks = blocksWithUniqueIds.map(convertSimpleBlockToBlock);
    const newBlocks = [...blocks];
    newBlocks.splice(startIndex, count, ...convertedBlocks);
    onChange(newBlocks);
  }, [blocks, convertSimpleBlockToBlock, onChange, regenerateBlockIds]);

  return {
    writeBlocks,
    appendBlocks,
    insertBlocksAt,
    replaceBlocks,
    currentBlocks: blocks,
  };
};

