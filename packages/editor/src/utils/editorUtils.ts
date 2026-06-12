import { Block, BlockType, CaretPosition } from '../types/editor';
import type { TextColor } from '../constants/colors';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_H1,
  BLOCK_TYPE_H2,
  BLOCK_TYPE_H3,
  BLOCK_TYPE_H4,
  BLOCK_TYPE_H5,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  isNonTextBlockType,
} from '../constants/blockTypes';

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}


export function getTextColorClass(textColor?: string, defaultColor: string = 'text-black dark:text-gray-100'): string {
  if (!textColor || textColor === 'default') return defaultColor;
  switch (textColor) {
    case 'gray': return 'text-gray-500';
    case 'brown': return 'text-amber-700';
    case 'orange': return 'text-orange-600';
    case 'yellow': return 'text-yellow-600';
    case 'green': return 'text-green-600';
    case 'blue': return 'text-blue-600';
    case 'purple': return 'text-purple-600';
    case 'pink': return 'text-pink-600';
    case 'red': return 'text-red-600';
    default: return defaultColor;
  }
}

/** Hex palette used by SelectionMenu inline colors — maps to block TextColor tokens for menu sync. */
const INLINE_HEX_TO_TEXT_COLOR: { hex: string; textColor: TextColor }[] = [
  { hex: '#000000', textColor: 'default' },
  { hex: '#ef4444', textColor: 'red' },
  { hex: '#f97316', textColor: 'orange' },
  { hex: '#22c55e', textColor: 'green' },
  { hex: '#3b82f6', textColor: 'blue' },
  { hex: '#a855f7', textColor: 'purple' },
];

function parseRgbTuple(css: string): [number, number, number] | null {
  const m = css.trim().match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/**
 * Removes inline `color` from elements in block HTML so block-level `textColor` (Tailwind) can apply.
 * Unwraps attribute-less spans left empty after stripping.
 */
export function stripInlineTextColorsFromHtml(html: string): string {
  if (typeof document === 'undefined') return html;
  if (!html || !/\bcolor\s*:/i.test(html)) return html;

  const div = document.createElement('div');
  div.innerHTML = html;

  div.querySelectorAll('[style]').forEach((node) => {
    const el = node as HTMLElement;
    if (!el.style.color) return;
    el.style.removeProperty('color');
    const styleAttr = el.getAttribute('style');
    if (!styleAttr || !styleAttr.trim()) {
      el.removeAttribute('style');
    }
  });

  let unwrapped = true;
  while (unwrapped) {
    unwrapped = false;
    div.querySelectorAll('span').forEach((span) => {
      if (span.attributes.length === 0) {
        const parent = span.parentNode;
        if (!parent) return;
        while (span.firstChild) {
          parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        unwrapped = true;
      }
    });
  }

  return div.innerHTML;
}

/**
 * When the whole block is a single colored span (typical after SelectionMenu “select all” + color),
 * return the matching block TextColor so the action menu stays in sync.
 */
export function inferWholeBlockInlineTextColor(html: string): TextColor | null {
  if (typeof document === 'undefined' || !html?.trim()) return null;

  const div = document.createElement('div');
  div.innerHTML = html.trim();

  const meaningfulChildNodes = [...div.childNodes].filter(
    (n) => n.nodeType !== Node.TEXT_NODE || (n.textContent && n.textContent.trim() !== '')
  );
  if (meaningfulChildNodes.length !== 1) return null;

  const only = meaningfulChildNodes[0];
  if (only.nodeType !== Node.ELEMENT_NODE) return null;

  const el = only as HTMLElement;
  if (el.tagName !== 'SPAN' || !el.style.color) return null;

  const rgb = parseRgbTuple(el.style.color);
  if (!rgb) return null;

  for (const { hex, textColor } of INLINE_HEX_TO_TEXT_COLOR) {
    const target = hexToRgb(hex);
    if (
      Math.abs(target[0] - rgb[0]) <= 2 &&
      Math.abs(target[1] - rgb[1]) <= 2 &&
      Math.abs(target[2] - rgb[2]) <= 2
    ) {
      return textColor;
    }
  }
  return null;
}

/**
 * Checks whether a string is a valid URL
 */
export function isURL(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Decodes HTML entities into plain text
 * Used for code so that &gt; becomes >, &lt; becomes <, etc.
 */
export function decodeHtmlEntities(text: string): string {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

export function createBlock(type: BlockType = BLOCK_TYPE_PARAGRAPH, text: string = ''): Block {
  const baseBlock = {
    id: generateId(),
    type,
    text,
    ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
    ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
  };

  // Initialize columns for column blocks
  if (type === BLOCK_TYPE_COLUMNS2 || type === BLOCK_TYPE_COLUMNS3 || type === BLOCK_TYPE_COLUMNS4 || type === BLOCK_TYPE_COLUMNS5) {
    const columnCount = type === BLOCK_TYPE_COLUMNS2 ? 2 : 
                       type === BLOCK_TYPE_COLUMNS3 ? 3 : 
                       type === BLOCK_TYPE_COLUMNS4 ? 4 : 5;
    
    const columns = Array.from({ length: columnCount }, (): Block[] => [
      {
        id: generateId(),
        type: BLOCK_TYPE_PARAGRAPH,
        text: '',
      }
    ]);
    
    return {
      ...baseBlock,
      columns,
    };
  }

  return baseBlock;
}

/**
 * Checks whether text is a bulleted list trigger (markdown): "- "
 */
export function isBulletListTrigger(text: string): boolean {
  const textContent = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
  
  return (
    textContent === '- ' || 
    textContent === '-&nbsp;' || 
    textContent === '- \u00A0' || // Non-breaking space
    text === '- ' ||
    text === '-&nbsp;' ||
    (textContent.startsWith('- ') && textContent.length === 2) ||
    (textContent.startsWith('-') && textContent.length >= 2 && /\s/.test(textContent[1]))
  );
}

/**
 * Checks whether text is an image in markdown format: ![](url)<!-- width:xxx -->
 * Returns an object with url and width, or null if it does not match
 */
export function getImageMarkdown(text: string): { url: string; width?: number } | null {
  const textContent = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
  
  // Check pattern: ![](url) with optional width <!-- width:XXX -->
  const match = textContent.match(/^!\[.*?\]\((.+?)\)(?:<!--\s*width:(\d+(?:\.\d+)?)\s*-->)?$/);
  
  if (match) {
    const url = match[1];
    const width = match[2] ? parseFloat(match[2]) : undefined;
    return { url, width };
  }
  
  return null;
}

/**
 * Checks whether text is a numbered list trigger (markdown): "1. ", "2. ", etc.
 * Returns the starting number on match, otherwise null
 */
export function getNumberedListTrigger(text: string): number | null {
  const textContent = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
  
  const numberedMatch = textContent.match(/^(\d+)\.\s*$/);
  const isNumberedTrigger = 
    numberedMatch ||
    textContent.match(/^(\d+)\.&nbsp;$/) ||
    textContent.match(/^(\d+)\.\u00A0$/); // Non-breaking space
  
  if (isNumberedTrigger) {
    return parseInt(numberedMatch?.[1] || '1', 10);
  }
  
  return null;
}

export function saveCaretPosition(blockId: string): CaretPosition | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  const offset = range.startOffset;

  return { blockId, offset };
}

export function restoreCaretPosition(position: CaretPosition | null) {
  if (!position) return;

  const element = document.querySelector(`[data-block-id="${position.blockId}"]`);
  if (!element) return;

  const selection = window.getSelection();
  if (!selection) return;

  try {
    const range = document.createRange();
    const textNode = element.firstChild;
    
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const offset = Math.min(position.offset, textNode.textContent?.length || 0);
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset);
    } else {
      range.selectNodeContents(element);
      range.collapse(false);
    }

    selection.removeAllRanges();
    selection.addRange(range);
  } catch (e) {
    console.warn('Failed to restore caret position', e);
  }
}

export function getCaretCoordinates(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

export function setCaretToEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function setCaretToStart(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Gets the block index to focus after deleting selected blocks
 * @param blocks - Array of all blocks before deletion
 * @param selectedBlockIds - Set of block IDs to be deleted
 * @param newBlocks - Array of blocks after deletion
 * @returns Index of the block to focus in the newBlocks array
 */
export function getTargetIndexAfterDeletion(
  blocks: Block[],
  selectedBlockIds: Set<string>,
  newBlocks: Block[]
): number {
  // Find index of the first selected block before deletion
  let firstSelectedIndex = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (selectedBlockIds.has(blocks[i].id)) {
      firstSelectedIndex = i;
      break;
    }
  }

  if (firstSelectedIndex === -1) return 0;

  // Focus on the block before the selection, or stay at the same position if deleting from the start
  let targetIndex = Math.max(0, firstSelectedIndex - 1);

  // If deleting from the start, stay at position 0
  if (firstSelectedIndex === 0) {
    targetIndex = 0;
  }

  // Ensure we do not exceed the length of the new blocks array
  targetIndex = Math.min(targetIndex, newBlocks.length - 1);

  return targetIndex;
}

export function getTextContent(element: HTMLElement): string {
  return element.innerText || '';
}

export function isCaretAtStart(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  // Use getCaretOffset to get the position from the start of the element
  // Works correctly even with nested HTML elements
  return getCaretOffset(element) === 0;
}

export function isCaretAtEnd(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  // Calculate cursor position from the start of the element
  const caretOffset = getCaretOffset(element);
  
  // Get total text length (textContent for code blocks, innerText for others)
  const textLength = element.textContent?.length || element.innerText?.length || 0;
  
  return caretOffset >= textLength;
}

/**
 * Gets the cursor position in the element's text content
 */
export function getCaretOffset(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  
  return preCaretRange.toString().length;
}

function findTextNodeAtCharacterOffset(root: Node, targetOffset: number): { node: Node; offset: number } | null {
  if (root.nodeType === Node.TEXT_NODE) {
    const length = root.textContent?.length || 0;
    return { node: root, offset: Math.min(targetOffset, length) };
  }
  let currentOffset = 0;
  for (let i = 0; i < root.childNodes.length; i++) {
    const child = root.childNodes[i];
    const childLength = child.textContent?.length || 0;
    if (currentOffset + childLength >= targetOffset) {
      return findTextNodeAtCharacterOffset(child, targetOffset - currentOffset);
    }
    currentOffset += childLength;
  }
  if (root.childNodes.length > 0) {
    const lastChild = root.childNodes[root.childNodes.length - 1];
    if (lastChild.nodeType === Node.TEXT_NODE) {
      return { node: lastChild, offset: lastChild.textContent?.length || 0 };
    }
    return findTextNodeAtCharacterOffset(lastChild, lastChild.textContent?.length || 0);
  }
  return null;
}

/** Move caret to a character offset within a contenteditable block (mirrors {@link getCaretOffset}). */
export function setCaretToCharacterOffset(element: HTMLElement, characterOffset: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const result = findTextNodeAtCharacterOffset(element, characterOffset);
  if (result) {
    const range = document.createRange();
    range.setStart(result.node, result.offset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  } else {
    setCaretToStart(element);
  }
}

/**
 * Splits the element's inner HTML at the cursor position
 * Returns [beforeHTML, afterHTML]
 */
export function splitHTMLAtCaret(element: HTMLElement): [string, string] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return [element.innerHTML, ''];
  }

  const range = selection.getRangeAt(0);
  
  // Create a range from the start of the element to the cursor
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  
  // Create a range from the cursor to the end of the element
  const postCaretRange = range.cloneRange();
  postCaretRange.selectNodeContents(element);
  postCaretRange.setStart(range.endContainer, range.endOffset);
  
  // Extract content
  const beforeFragment = preCaretRange.cloneContents();
  const afterFragment = postCaretRange.cloneContents();
  
  // Convert fragments to HTML
  const tempDiv = document.createElement('div');
  
  tempDiv.appendChild(beforeFragment);
  const beforeHTML = tempDiv.innerHTML;
  
  tempDiv.innerHTML = '';
  tempDiv.appendChild(afterFragment);
  const afterHTML = tempDiv.innerHTML;
  
  return [beforeHTML, afterHTML];
}

/**
 * Converts inline markdown formatting to HTML
 */
function convertInlineMarkdown(text: string): string {
  // Convert links [text](url) to <a href="url">text</a>
  text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  
  // Convert **bold** to <strong>bold</strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert *italic* to <em>italic</em> (but not if it is part of **)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  
  // Convert inline code `code` to <code>code</code>
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  
  return text;
}

/**
 * Parses markdown text and converts it to blocks
 */
export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines
    if (line.trim() === '') {
      continue;
    }
    
    // Check code block: ```language
    const codeBlockMatch = line.match(/^```(\w+)?$/);
    if (codeBlockMatch) {
      const language = codeBlockMatch[1] || 'plaintext';
      const codeLines: string[] = [];
      
      // Collect code lines until closing ```
      i++; // Move to the next line after opening ```
      while (i < lines.length && !lines[i].match(/^```$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      
      // Create code block
      blocks.push({
        ...createBlock(BLOCK_TYPE_CODE, codeLines.join('\n')),
        language,
      });
      continue;
    }
    
    // Check image: ![alt](url) with optional width <!-- width:XXX -->
    const imageMatch = line.match(/^!\[.*?\]\((.+?)\)(?:<!--\s*width:(\d+(?:\.\d+)?)\s*-->)?$/);
    if (imageMatch) {
      const imageUrl = imageMatch[1];
      const imageWidth = imageMatch[2] ? parseFloat(imageMatch[2]) : undefined;
      blocks.push({
        ...createBlock(BLOCK_TYPE_IMAGE, ''),
        imageUrl,
        imageFile: imageUrl,
        ...(imageWidth ? { imageWidth } : {}),
      });
      continue;
    }
    
    // Check headings (longest to shortest to avoid false matches)
    const h5Match = line.match(/^#{5}\s+(.+)$/);
    if (h5Match) {
      blocks.push(createBlock(BLOCK_TYPE_H5, convertInlineMarkdown(h5Match[1])));
      continue;
    }
    
    const h4Match = line.match(/^#{4}\s+(.+)$/);
    if (h4Match) {
      blocks.push(createBlock(BLOCK_TYPE_H4, convertInlineMarkdown(h4Match[1])));
      continue;
    }
    
    const h3Match = line.match(/^#{3}\s+(.+)$/);
    if (h3Match) {
      blocks.push(createBlock(BLOCK_TYPE_H3, convertInlineMarkdown(h3Match[1])));
      continue;
    }
    
    const h2Match = line.match(/^#{2}\s+(.+)$/);
    if (h2Match) {
      blocks.push(createBlock(BLOCK_TYPE_H2, convertInlineMarkdown(h2Match[1])));
      continue;
    }
    
    const h1Match = line.match(/^#{1}\s+(.+)$/);
    if (h1Match) {
      blocks.push(createBlock(BLOCK_TYPE_H1, convertInlineMarkdown(h1Match[1])));
      continue;
    }
    
    // Check bulleted list: - item or * item
    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push(createBlock(BLOCK_TYPE_BULLETED, convertInlineMarkdown(bulletMatch[1])));
      continue;
    }
    
    // Check numbered list: 1. item
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push(createBlock(BLOCK_TYPE_NUMBERED, convertInlineMarkdown(numberedMatch[1])));
      continue;
    }
    
    // Check todo list: - [ ] item or - [x] item
    const todoMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === 'x';
      blocks.push({
        ...createBlock(BLOCK_TYPE_TODO, convertInlineMarkdown(todoMatch[2])),
        checked,
      });
      continue;
    }
    
    // Check horizontal rule: --- or ***
    if (line.match(/^(---|\*\*\*)$/)) {
      blocks.push(createBlock(BLOCK_TYPE_DIVIDER, ''));
      continue;
    }
    
    // Default to creating a paragraph
    blocks.push(createBlock(BLOCK_TYPE_PARAGRAPH, convertInlineMarkdown(line)));
  }
  
  return blocks;
}

/**
 * Converts blocks to markdown format
 */
export function convertBlocksToMarkdown(blocks: Block[]): string {
  const lines: string[] = [];
  
  for (const block of blocks) {
    switch (block.type) {
      case BLOCK_TYPE_H1:
        lines.push(`# ${block.text}`);
        break;
      case BLOCK_TYPE_H2:
        lines.push(`## ${block.text}`);
        break;
      case BLOCK_TYPE_H3:
        lines.push(`### ${block.text}`);
        break;
      case BLOCK_TYPE_H4:
        lines.push(`#### ${block.text}`);
        break;
      case BLOCK_TYPE_H5:
        lines.push(`##### ${block.text}`);
        break;
      case BLOCK_TYPE_BULLETED:
        lines.push(`- ${block.text}`);
        break;
      case BLOCK_TYPE_NUMBERED:
        lines.push(`1. ${block.text}`);
        break;
      case BLOCK_TYPE_TODO:
        const checkbox = block.checked ? '[x]' : '[ ]';
        lines.push(`- ${checkbox} ${block.text}`);
        break;
      case BLOCK_TYPE_CODE:
        const language = block.language || 'plaintext';
        lines.push(`\`\`\`${language}`);
        lines.push(block.text);
        lines.push('```');
        break;
      case BLOCK_TYPE_IMAGE:
        if (block.imageUrl) {
          const widthMeta = block.imageWidth ? `<!-- width:${block.imageWidth} -->` : '';
          lines.push(`![](${block.imageUrl})${widthMeta}`);
        }
        break;
      case BLOCK_TYPE_DIVIDER:
        lines.push('---');
        break;
      case BLOCK_TYPE_COLUMNS2:
      case BLOCK_TYPE_COLUMNS3:
      case BLOCK_TYPE_COLUMNS4:
      case BLOCK_TYPE_COLUMNS5:
        // Column blocks cannot be represented in markdown
        // They will be handled as JSON in copyBlocksToClipboard
        lines.push(`[Column Block: ${block.type}]`);
        break;
      case BLOCK_TYPE_PARAGRAPH:
      default:
        lines.push(block.text);
        break;
    }
  }
  
  return lines.join('\n');
}

/**
 * Copies blocks to the clipboard in markdown format
 */
/**
 * Checks whether blocks contain complex structures that require JSON serialization
 */
function needsJsonSerialization(blocks: Block[]): boolean {
  return blocks.some(block => {
    // Column blocks require JSON serialization
    if (block.type === BLOCK_TYPE_COLUMNS2 || 
        block.type === BLOCK_TYPE_COLUMNS3 || 
        block.type === BLOCK_TYPE_COLUMNS4 || 
        block.type === BLOCK_TYPE_COLUMNS5) {
      return true;
    }
    // Toggle blocks with children require JSON serialization
    if ((block.type === BLOCK_TYPE_TOGGLE_H1 || 
         block.type === BLOCK_TYPE_TOGGLE_H2 || 
         block.type === BLOCK_TYPE_TOGGLE_H3 || 
         block.type === BLOCK_TYPE_TOGGLE_LIST) && 
        block.children && block.children.length > 0) {
      return true;
    }
    return false;
  });
}

export async function copyBlocksToClipboard(blocks: Block[]): Promise<void> {
  // Check whether JSON serialization is needed for complex blocks
  const useJson = needsJsonSerialization(blocks);
  
  if (useJson) {
    // For complex blocks, use JSON format with a special marker
    const jsonData = JSON.stringify(blocks);
    const clipboardData = `__TEACHLY_BLOCKS__${jsonData}`;
    
    try {
      await navigator.clipboard.writeText(clipboardData);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = clipboardData;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } else {
    // For simple blocks, use markdown format
    const markdownText = convertBlocksToMarkdown(blocks);

    try {
      await navigator.clipboard.writeText(markdownText);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = markdownText;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Regenerates IDs for blocks and nested structures
 */
function regenerateBlockIds(blocks: Block[]): Block[] {
  return blocks.map(block => {
    const newBlock: Block = {
      ...block,
      id: generateId(),
    };
    
    // Regenerate IDs for column blocks
    if (newBlock.columns) {
      newBlock.columns = newBlock.columns.map(columnBlocks => 
        regenerateBlockIds(columnBlocks)
      );
    }
    
    // Regenerate IDs for toggle children
    if (newBlock.children) {
      newBlock.children = regenerateBlockIds(newBlock.children);
    }
    
    return newBlock;
  });
}

/**
 * Parses clipboard data and returns blocks if present
 */
export function parseBlocksFromClipboard(data: string): Block[] | null {
  if (!data) return null;
  
  // First check whether this is our JSON format with a special marker
  if (data.startsWith('__TEACHLY_BLOCKS__')) {
    try {
      const jsonData = data.substring('__TEACHLY_BLOCKS__'.length);
      const blocks = JSON.parse(jsonData) as Block[];
      // Regenerate IDs to avoid conflicts
      return regenerateBlockIds(blocks);
    } catch (e) {
      console.warn('Failed to parse clipboard data as JSON', e);
    }
  }
  
  // Try to parse as markdown
  try {
    const blocks = parseMarkdownToBlocks(data);
    // If we got at least one block, return the result
    if (blocks.length > 0) {
      return blocks;
    }
  } catch (e) {
    console.warn('Failed to parse clipboard data as markdown', e);
  }
  
  return null;
}

/**
 * Finds a block's location in the blocks array (may be nested in a column)
 */
export function findBlockLocation(blockId: string, blocks: Block[]): {
  block: Block | null;
  parentBlockIndex: number;
  columnIndex: number;
  blockIndex: number;
  isNested: boolean;
  isToggleChild?: boolean;
} {
  // First search in top-level blocks
  const mainIndex = blocks.findIndex((b) => b.id === blockId);
  if (mainIndex !== -1) {
    return {
      block: blocks[mainIndex],
      parentBlockIndex: -1,
      columnIndex: -1,
      blockIndex: mainIndex,
      isNested: false,
      isToggleChild: false,
    };
  }

  // Search in nested blocks (columns)
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.columns) {
      for (let colIdx = 0; colIdx < block.columns.length; colIdx++) {
        const columnBlocks = block.columns[colIdx];
        const nestedIdx = columnBlocks.findIndex((b) => b.id === blockId);
        if (nestedIdx !== -1) {
          return {
            block: columnBlocks[nestedIdx],
            parentBlockIndex: i,
            columnIndex: colIdx,
            blockIndex: nestedIdx,
            isNested: true,
            isToggleChild: false,
          };
        }
      }
    }
    
    // Search in toggle heading child blocks
    if (block.children) {
      const childIdx = block.children.findIndex((b) => b.id === blockId);
      if (childIdx !== -1) {
        return {
          block: block.children[childIdx],
          parentBlockIndex: i,
          columnIndex: -1,
          blockIndex: childIdx,
          isNested: true,
          isToggleChild: true,
        };
      }
    }
  }

  // Block not found
  return {
    block: null,
    parentBlockIndex: -1,
    columnIndex: -1,
    blockIndex: -1,
    isNested: false,
  };
}

/**
 * Focuses on the first block and places the cursor at the start
 * @param containerElement - editor container element (optional)
 */
export function focusFirstBlock(containerElement?: HTMLElement | null) {
  const container = containerElement || window.document;
  const firstBlock = container.querySelector('[data-block-id]') as HTMLElement;
  
  if (firstBlock) {
    firstBlock.focus();
    const selection = window.getSelection();
    if (selection) {
      const range = window.document.createRange();
      if (firstBlock.childNodes.length > 0) {
        range.setStart(firstBlock.childNodes[0], 0);
        range.setEnd(firstBlock.childNodes[0], 0);
      } else {
        range.selectNodeContents(firstBlock);
        range.collapse(true);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

/**
 * Converts an empty list (bulleted, numbered, or todo) to a paragraph and focuses on it
 * Returns true if conversion was performed, otherwise false
 */
export function convertEmptyListToParagraph(
  block: Block,
  blockIndex: number,
  blocks: Block[],
  onBlocksUpdate: (blocks: Block[]) => void
): boolean {
  // Check whether the block is an empty list
  if (![BLOCK_TYPE_BULLETED, BLOCK_TYPE_NUMBERED, BLOCK_TYPE_TODO].includes(block.type)) {
    return false;
  }
  
  // Convert block to paragraph
  const newBlocks = [...blocks];
  newBlocks[blockIndex] = { ...block, type: BLOCK_TYPE_PARAGRAPH, text: '' };
  onBlocksUpdate(newBlocks);
  
  // Focus on the converted block
  setTimeout(() => {
    const currentElement = document.querySelector(`[data-block-id="${block.id}"]`) as HTMLElement;
    if (currentElement) {
      currentElement.focus();
      setCaretToStart(currentElement);
    }
  }, 0);
  
  return true;
}

/**
 * Handles Enter key press in the title field
 * If blocks exist, focuses on the first block
 * If no blocks exist, creates a new empty paragraph
 */
export function handleTitleEnter(
  blocks: Block[],
  onBlocksUpdate: (blocks: Block[]) => void,
  containerElement?: HTMLElement | null
) {
  if (blocks.length > 0) {
    const firstBlock = blocks[0];
    
    // If the first block is not text-based (e.g. YouTube, image, divider), 
    // create a new empty paragraph before it
    if (isNonTextBlockType(firstBlock.type)) {
      const newBlocks = [createBlock(BLOCK_TYPE_PARAGRAPH, ''), ...blocks];
      onBlocksUpdate(newBlocks);
      
      // Focus on the new block
      setTimeout(() => {
        focusFirstBlock(containerElement);
      }, 0);
    } else {
      // Focus on the first block (if it is text-based)
      setTimeout(() => {
        focusFirstBlock(containerElement);
      }, 0);
    }
  } else {
    // If there are no blocks, create one empty paragraph
    const newBlocks = [createBlock(BLOCK_TYPE_PARAGRAPH, '')];
    onBlocksUpdate(newBlocks);

    // Focus on the new block
    setTimeout(() => {
      focusFirstBlock(containerElement);
    }, 0);
  }
}

/**
 * Gets the current cursor position in an element as a character offset from the start
 * @param element - HTML element to get the cursor position from
 * @returns Cursor position as a number, or -1 if there is no selection
 */
export function getCursorPositionInElement(element: HTMLElement): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return -1;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}

/**
 * Sets the cursor position in an element to a specific character offset
 * @param element - HTML element to set the cursor position on
 * @param position - Character offset to place the cursor at
 */
export function setCursorPositionInElement(element: HTMLElement, position: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  try {
    let charCount = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    const walk = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (charCount + textLength >= position) {
          targetNode = node;
          targetOffset = position - charCount;
          return true;
        }
        charCount += textLength;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          if (walk(node.childNodes[i])) {
            return true;
          }
        }
      }
      return false;
    };

    walk(element);

    if (targetNode) {
      const range = document.createRange();
      const maxOffset = (targetNode as Text).length || 0;
      range.setStart(targetNode, Math.min(targetOffset, maxOffset));
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  } catch (e) {
    console.warn('Failed to set cursor position', e);
  }
}

/**
 * Updates element content while preserving cursor position
 * This is critical for real-time collaboration when remote updates
 * must be applied even when the user is actively editing the same block
 * 
 * @param element - HTML element to update
 * @param newContent - New content to set
 * @param isCodeBlock - Whether this is a code block (uses textContent instead of innerHTML)
 */
export function updateElementContentPreservingCursor(
  element: HTMLElement,
  newContent: string,
  isCodeBlock: boolean = false
): void {
  const isActiveElement = document.activeElement === element;
  
  if (!isActiveElement) {
    if (isCodeBlock) {
      element.textContent = decodeHtmlEntities(newContent);
    } else {
      element.innerHTML = newContent;
    }
    return;
  }

  const currentPosition = getCursorPositionInElement(element);
  
  if (isCodeBlock) {
    element.textContent = decodeHtmlEntities(newContent);
  } else {
    element.innerHTML = newContent;
  }

  if (currentPosition >= 0) {
    const newTextLength = element.textContent?.length || 0;
    const adjustedPosition = Math.min(currentPosition, newTextLength);
    setCursorPositionInElement(element, adjustedPosition);
  }
}

