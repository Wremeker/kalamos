export type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'toggle_h1' | 'toggle_h2' | 'toggle_h3' | 'toggle_list' | 'bulleted' | 'numbered' | 'todo' | 'image' | 'video' | 'audio' | 'pdf' | 'divider' | 'code' | 'bookmark' | 'embed' | 'quote' | 'callout' | 'columns2' | 'columns3' | 'columns4' | 'columns5' | 'table' | 'lesson' | 'latex' | 'exercise';

export interface BlockComment {
  id: string;
  content: string;
  author: string;
  authorName?: string;
  authorColor?: string;
  createdAt: string;
  resolved?: boolean;
}

export interface InlineComment {
  id: string;
  highlightedText: string;
  comments: BlockComment[];
}

// Interface for a drawing point
export interface DrawingPoint {
  x: number; // coordinate as a percentage (0-1)
  y: number; // coordinate as a percentage (0-1)
}

// Interface for a drawing stroke
export interface DrawingStroke {
  points: DrawingPoint[]; // array of stroke points
  color: string; // color in hex format
  thickness: number; // line thickness in pixels
}

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean; // todo only
  imageUrl?: string; // image only
  imageFile?: string; // base64 data for the image
  imageWidth?: number; // image only - image width in pixels
  imageHeight?: number; // image only - image height in pixels
  imageAlignment?: 'left' | 'center' | 'right'; // image only - image alignment
  drawingData?: { strokes: DrawingStroke[] }; // image only - drawing data on the image
  videoUrl?: string; // video only - video URL
  videoWidth?: number; // video only - video width in pixels
  videoHeight?: number; // video only - video height in pixels
  videoAlignment?: 'left' | 'center' | 'right'; // video only - video alignment
  audioUrl?: string; // audio only - audio URL
  caption?: string; // caption for media blocks (video, audio)
  pdfUrl?: string; // pdf only - PDF file URL
  pdfWidth?: number; // pdf only - PDF width in pixels
  pdfHeight?: number; // pdf only - PDF height in pixels
  pdfAlignment?: 'left' | 'center' | 'right'; // pdf only - PDF alignment
  startNumber?: number; // numbered only - starting number for the list
  language?: string; // code only - programming language
  latexMode?: 'inline' | 'block'; // latex only - formula display mode
  url?: string; // for bookmark and embed - link URL
  title?: string; // for bookmark - page title
  description?: string; // for bookmark - page description
  favicon?: string; // for bookmark - site icon
  embedType?: 'youtube' | 'twitter' | 'generic'; // for embed - embed type
  embedWidth?: number; // embed only - video width in pixels
  embedHeight?: number; // embed only - video height in pixels
  textColor?: string; // block text color
  backgroundColor?: string; // block background color
  alignment?: 'left' | 'center' | 'right'; // block alignment
  emoji?: string; // for callout - emoji icon
  lessonSlug?: string; // for lesson - slug of the linked lesson
  exerciseTypeId?: number; // for exercise - exercise type ID
  exerciseTypeName?: string; // for exercise - exercise type name
  exerciseData?: any; // for exercise - exercise data
  exerciseName?: string; // for exercise - exercise name
  exerciseDbId?: number; // for exercise - database record ID (for saving results)
  comments?: BlockComment[]; // block comments
  inlineComments?: InlineComment[]; // inline comments for highlighted text within block
  columns?: Block[][]; // for columns2-5 - array of columns, each column contains an array of blocks
  columnWidths?: number[]; // for columns2-5 - array of column widths in percent (e.g. [50, 50] or [30, 70])
  isOpen?: boolean; // for toggle_h1-3, toggle_list - expanded state
  children?: Block[]; // for toggle_h1-3, toggle_list - nested blocks
  tableData?: { // for table - table data
    cells: string[][]; // 2D array of rows and columns with HTML cell content
    columnWidths?: number[]; // array of column widths in percent
    rowBackgroundColors?: string[]; // array of background colors for rows
    columnBackgroundColors?: string[]; // array of background colors for columns
    rowTextColors?: string[]; // array of text colors for rows
    columnTextColors?: string[]; // array of text colors for columns
  };
}

export interface CaretPosition {
  blockId: string;
  offset: number;
}

export interface CommandItem {
  id: BlockType;
  label: string;
  icon: string;
  keywords: string[];
}

export interface HistoryEntry {
  id: string;
  timestamp: Date;
  title: string;
  blocks: Block[];
  description?: string;
}
