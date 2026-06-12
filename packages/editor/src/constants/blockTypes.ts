export const BLOCK_TYPE_PARAGRAPH = 'paragraph';
export const BLOCK_TYPE_H1 = 'h1';
export const BLOCK_TYPE_H2 = 'h2';
export const BLOCK_TYPE_H3 = 'h3';
export const BLOCK_TYPE_H4 = 'h4';
export const BLOCK_TYPE_H5 = 'h5';
export const BLOCK_TYPE_TOGGLE_H1 = 'toggle_h1';
export const BLOCK_TYPE_TOGGLE_H2 = 'toggle_h2';
export const BLOCK_TYPE_TOGGLE_H3 = 'toggle_h3';
export const BLOCK_TYPE_TOGGLE_LIST = 'toggle_list';
export const BLOCK_TYPE_BULLETED = 'bulleted';
export const BLOCK_TYPE_NUMBERED = 'numbered';
export const BLOCK_TYPE_TODO = 'todo';
export const BLOCK_TYPE_IMAGE = 'image';
export const BLOCK_TYPE_VIDEO = 'video';
export const BLOCK_TYPE_AUDIO = 'audio';
export const BLOCK_TYPE_PDF = 'pdf';
export const BLOCK_TYPE_DIVIDER = 'divider';
export const BLOCK_TYPE_CODE = 'code';
export const BLOCK_TYPE_BOOKMARK = 'bookmark';
export const BLOCK_TYPE_EMBED = 'embed';
export const BLOCK_TYPE_QUOTE = 'quote';
export const BLOCK_TYPE_CALLOUT = 'callout';
export const BLOCK_TYPE_COLUMNS2 = 'columns2';
export const BLOCK_TYPE_COLUMNS3 = 'columns3';
export const BLOCK_TYPE_COLUMNS4 = 'columns4';
export const BLOCK_TYPE_COLUMNS5 = 'columns5';
export const BLOCK_TYPE_TABLE = 'table';
export const BLOCK_TYPE_LATEX = 'latex';
export const BLOCK_TYPE_LESSON = 'lesson';
export const BLOCK_TYPE_EXERCISE = 'exercise';

// Image alignment constants
export const IMAGE_ALIGN_LEFT = 'left';
export const IMAGE_ALIGN_CENTER = 'center';
export const IMAGE_ALIGN_RIGHT = 'right';


export const NON_TEXT_BLOCK_TYPES = [
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_VIDEO,
  BLOCK_TYPE_AUDIO,
  BLOCK_TYPE_PDF,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_TABLE,
  BLOCK_TYPE_LATEX,
  BLOCK_TYPE_LESSON,
  BLOCK_TYPE_EXERCISE,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  BLOCK_TYPE_CALLOUT,
];


export function isNonTextBlockType(blockType: string): boolean {
  return NON_TEXT_BLOCK_TYPES.includes(blockType as any);
}

