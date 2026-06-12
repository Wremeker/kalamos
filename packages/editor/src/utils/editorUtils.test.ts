import { describe, it, expect } from 'vitest';
import {
  generateId,
  createBlock,
  isURL,
  decodeHtmlEntities,
  isBulletListTrigger,
  getNumberedListTrigger,
  getImageMarkdown,
  findBlockLocation,
  getTargetIndexAfterDeletion,
  convertBlocksToMarkdown,
  parseMarkdownToBlocks,
} from './editorUtils';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_COLUMNS3,
} from '../constants/blockTypes';
import type { Block } from '../types/editor';

describe('generateId', () => {
  it('returns unique non-empty strings', () => {
    const a = generateId();
    const b = generateId();
    expect(a).toBeTruthy();
    expect(typeof a).toBe('string');
    expect(a).not.toBe(b);
  });
});

describe('createBlock', () => {
  it('creates a paragraph by default', () => {
    const block = createBlock();
    expect(block.type).toBe(BLOCK_TYPE_PARAGRAPH);
    expect(block.text).toBe('');
    expect(block.id).toBeTruthy();
  });

  it('initializes todo with checked=false', () => {
    expect(createBlock(BLOCK_TYPE_TODO).checked).toBe(false);
  });

  it('initializes code with a default language', () => {
    expect(createBlock(BLOCK_TYPE_CODE).language).toBe('javascript');
  });

  it('initializes column blocks with the right number of columns', () => {
    const block = createBlock(BLOCK_TYPE_COLUMNS3);
    expect(block.columns).toHaveLength(3);
    expect(block.columns?.[0][0].type).toBe(BLOCK_TYPE_PARAGRAPH);
  });
});

describe('isURL', () => {
  it('accepts http/https URLs', () => {
    expect(isURL('https://example.com')).toBe(true);
    expect(isURL('http://example.com/path?q=1')).toBe(true);
  });
  it('rejects non-URLs and non-http protocols', () => {
    expect(isURL('not a url')).toBe(false);
    expect(isURL('ftp://example.com')).toBe(false);
    expect(isURL('')).toBe(false);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes entities to characters', () => {
    expect(decodeHtmlEntities('&lt;div&gt; &amp; more')).toBe('<div> & more');
  });
});

describe('list triggers', () => {
  it('detects a bullet trigger', () => {
    expect(isBulletListTrigger('- ')).toBe(true);
    expect(isBulletListTrigger('hello')).toBe(false);
  });

  it('detects a numbered trigger and returns the start number', () => {
    expect(getNumberedListTrigger('1. ')).toBe(1);
    expect(getNumberedListTrigger('3. ')).toBe(3);
    expect(getNumberedListTrigger('text')).toBeNull();
  });
});

describe('getImageMarkdown', () => {
  it('parses image markdown into a url', () => {
    expect(getImageMarkdown('![alt](https://x/y.png)')).toEqual({
      url: 'https://x/y.png',
      width: undefined,
    });
    expect(getImageMarkdown('plain text')).toBeNull();
  });
});

describe('findBlockLocation', () => {
  const blocks: Block[] = [
    { id: 'a', type: 'paragraph', text: 'A' },
    {
      id: 'cols',
      type: 'columns2',
      text: '',
      columns: [
        [{ id: 'nested', type: 'paragraph', text: 'N' }],
        [{ id: 'other', type: 'paragraph', text: 'O' }],
      ],
    },
  ];

  it('finds a top-level block', () => {
    const loc = findBlockLocation('a', blocks);
    expect(loc.block?.id).toBe('a');
    expect(loc.blockIndex).toBe(0);
    expect(loc.isNested).toBe(false);
  });

  it('finds a nested block inside a column', () => {
    const loc = findBlockLocation('nested', blocks);
    expect(loc.block?.id).toBe('nested');
    expect(loc.isNested).toBe(true);
    expect(loc.parentBlockIndex).toBe(1);
    expect(loc.columnIndex).toBe(0);
  });

  it('returns null block when not found', () => {
    expect(findBlockLocation('missing', blocks).block).toBeNull();
  });
});

describe('getTargetIndexAfterDeletion', () => {
  const blocks: Block[] = [
    { id: 'a', type: 'paragraph', text: '' },
    { id: 'b', type: 'paragraph', text: '' },
    { id: 'c', type: 'paragraph', text: '' },
  ];

  it('focuses the block before the first deleted block', () => {
    const newBlocks = [blocks[0], blocks[2]];
    const idx = getTargetIndexAfterDeletion(blocks, new Set(['b']), newBlocks);
    expect(idx).toBe(0);
  });

  it('stays at 0 when deleting from the start', () => {
    const newBlocks = [blocks[2]];
    const idx = getTargetIndexAfterDeletion(blocks, new Set(['a', 'b']), newBlocks);
    expect(idx).toBe(0);
  });
});

describe('markdown round-trip', () => {
  it('converts headings, paragraphs and lists to markdown', () => {
    const blocks: Block[] = [
      { id: '1', type: 'h1', text: 'Title' },
      { id: '2', type: 'paragraph', text: 'Body' },
      { id: '3', type: 'bulleted', text: 'Item' },
    ];
    const md = convertBlocksToMarkdown(blocks);
    expect(md).toContain('# Title');
    expect(md).toContain('Body');
    expect(md).toContain('- Item');
  });

  it('parses markdown back into blocks', () => {
    const blocks = parseMarkdownToBlocks('# Hello\n\nWorld');
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks[0].type).toBe('h1');
    expect(blocks[0].text).toContain('Hello');
  });
});
