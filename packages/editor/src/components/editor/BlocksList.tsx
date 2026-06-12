import React, { useState } from 'react';
import { Block } from '../../types/editor';
import {
  BLOCK_TYPE_H1,
  BLOCK_TYPE_H2,
  BLOCK_TYPE_H3,
  BLOCK_TYPE_H4,
  BLOCK_TYPE_H5,
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_QUOTE,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_VIDEO,
  BLOCK_TYPE_AUDIO,
  BLOCK_TYPE_PDF,
  BLOCK_TYPE_CALLOUT,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_LATEX,
  BLOCK_TYPE_TABLE,
  BLOCK_TYPE_EXERCISE,
} from '../../constants/blockTypes';
import type { ExerciseResultData } from '../../api/exerciseResults';
import { getBlockPlugin } from '../../registry/blockRegistry';
import { renderTextWithLatex } from '../../utils/latexRenderer';
import { TEXT_COLORS, BACKGROUND_COLORS } from '../../constants/colors';
import { ChevronDown, ChevronRight } from 'lucide-react';
import katex from 'katex';
import { VideoPlayer } from '@/components/VideoPlayer';
import { SignedAudio } from '@/components/SignedAudio';
import { useSignedUrl } from '@/hooks/useSignedUrl';

function SignedPdfIframe({ src }: { src: string }) {
  const { signedUrl } = useSignedUrl(src);
  return (
    <iframe
      src={signedUrl || ''}
      className="w-full h-96 border rounded-lg max-w-full"
      title="PDF Document"
    />
  );
}

interface ToggleBlockProps {
  block: Block;
  colorStyles: React.CSSProperties;
  renderBlock: (block: Block, index: number) => React.ReactNode;
  renderTextWithLatex: (text: string) => React.ReactNode[];
}

const ToggleBlock: React.FC<ToggleBlockProps> = ({
  block,
  colorStyles,
  renderBlock,
  renderTextWithLatex,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { type, text = '' } = block;

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const getToggleConfig = () => {
    switch (type) {
      case BLOCK_TYPE_TOGGLE_H1:
        return { tag: 'h1', className: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold', iconSize: 28 };
      case BLOCK_TYPE_TOGGLE_H2:
        return { tag: 'h2', className: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold', iconSize: 24 };
      case BLOCK_TYPE_TOGGLE_H3:
        return { tag: 'h3', className: 'text-base sm:text-lg md:text-xl lg:text-2xl font-bold', iconSize: 20 };
      default:
        return { tag: 'div', className: 'text-base font-bold', iconSize: 24 };
    }
  };

  const config = getToggleConfig();
  const HeadingTag = config.tag as keyof React.JSX.IntrinsicElements;

  return (
    <div id={block.id} className="space-y-2 scroll-mt-28" style={colorStyles}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleToggle}
          className="flex-shrink-0 p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          aria-label={isOpen ? 'Collapse' : 'Expand'}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronDown size={config.iconSize} className="text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight size={config.iconSize} className="text-gray-600 dark:text-gray-400" />
          )}
        </button>
        <HeadingTag className={`${config.className} text-gray-900 dark:text-white flex-1 min-w-0`}>
          {renderTextWithLatex(text)}
        </HeadingTag>
      </div>
      {isOpen && block.children && block.children.length > 0 && (
        <div className="pl-8 space-y-2">
          {block.children.map((child, idx) => renderBlock(child, idx))}
        </div>
      )}
    </div>
  );
};

interface BlocksListProps {
  blocks: Block[];
  containerClassName?: string;
  exerciseResults?: Record<string, ExerciseResultData>;
  onExerciseResultSubmit?: (blockId: string, result: Omit<ExerciseResultData, 'completedAt'>) => void;
  exerciseReadOnly?: boolean;
}

export const BlocksList: React.FC<BlocksListProps> = ({
  blocks,
  containerClassName = 'space-y-1',
  exerciseResults,
  onExerciseResultSubmit,
  exerciseReadOnly,
}) => {
  const renderTextContent = (text: string): React.ReactNode => {
    const rendered = renderTextWithLatex(text);
    return rendered.length > 0 ? rendered : <br />;
  };

  const getNumberedListNumber = (index: number): number => {
    let count = 1;
    for (let i = index - 1; i >= 0; i--) {
      if (blocks[i].type === BLOCK_TYPE_NUMBERED) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  const renderBlock = (block: Block, index: number): React.ReactNode => {
    const { type, text = '', textColor, backgroundColor } = block;

    const colorStyles: React.CSSProperties = {};
    if (textColor && textColor !== 'default') {
      colorStyles.color = `var(--color-${textColor})`;
    }
    if (backgroundColor && backgroundColor !== 'default') {
      colorStyles.backgroundColor = `var(--bg-${backgroundColor})`;
      colorStyles.padding = '0.5rem';
      colorStyles.borderRadius = '0.5rem';
    }

    const plugin = getBlockPlugin(type);
    if (plugin) {
      return (
        <div key={block.id} className="my-4">
          {plugin.render({
            block,
            index,
            contentRef: { current: null } as any,
            baseClasses: '',
            contentProps: {} as any,
            onKeyDown: () => {},
          } as any)}
        </div>
      );
    }

    switch (type) {
      case BLOCK_TYPE_H1:
        return (
          <h1 key={block.id} id={block.id} className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white scroll-mt-28" style={colorStyles}>
            {renderTextContent(text)}
          </h1>
        );
      
      case BLOCK_TYPE_H2:
        return (
          <h2 key={block.id} id={block.id} className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white scroll-mt-28" style={colorStyles}>
            {renderTextContent(text)}
          </h2>
        );
      
      case BLOCK_TYPE_H3:
        return (
          <h3 key={block.id} id={block.id} className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white scroll-mt-28" style={colorStyles}>
            {renderTextContent(text)}
          </h3>
        );
      
      case BLOCK_TYPE_H4:
        return (
          <h4 key={block.id} id={block.id} className="text-base sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white scroll-mt-28" style={colorStyles}>
            {renderTextContent(text)}
          </h4>
        );
      
      case BLOCK_TYPE_H5:
        return (
          <h5 key={block.id} id={block.id} className="text-sm sm:text-base md:text-base lg:text-lg font-bold text-gray-900 dark:text-white scroll-mt-28" style={colorStyles}>
            {renderTextContent(text)}
          </h5>
        );
      
      case BLOCK_TYPE_PARAGRAPH:
        return (
          <p key={block.id} className="text-base text-gray-700 dark:text-gray-300" style={colorStyles}>
            {renderTextContent(text)}
          </p>
        );
      
      case BLOCK_TYPE_BULLETED:
        return (
          <div key={block.id} className="flex items-start gap-2 text-gray-700 dark:text-gray-300" style={colorStyles}>
            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
            <div className="flex-1">{renderTextWithLatex(text)}</div>
          </div>
        );
      
      case BLOCK_TYPE_NUMBERED:
        return (
          <div key={block.id} className="flex items-start gap-2 text-gray-700 dark:text-gray-300" style={colorStyles}>
            <span className="flex-shrink-0">{getNumberedListNumber(index)}.</span>
            <div className="flex-1">{renderTextWithLatex(text)}</div>
          </div>
        );
      
      case BLOCK_TYPE_TODO:
        return (
          <div key={block.id} className="flex items-start gap-2 text-gray-700 dark:text-gray-300" style={colorStyles}>
            <input
              type="checkbox"
              checked={block.checked || false}
              readOnly
              className="mt-1 flex-shrink-0 pointer-events-none"
            />
            <div className="flex-1">{renderTextWithLatex(text)}</div>
          </div>
        );
      
      case BLOCK_TYPE_QUOTE:
        return (
          <blockquote
            key={block.id}
            className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-700 dark:text-gray-300"
            style={colorStyles}
          >
            {renderTextWithLatex(text)}
          </blockquote>
        );
      
      case BLOCK_TYPE_CODE:
        return (
          <pre key={block.id} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-gray-800 dark:text-gray-200 max-w-full" style={colorStyles}>
            <code className="break-words" dangerouslySetInnerHTML={{ __html: text }} />
          </pre>
        );
      
      case BLOCK_TYPE_LATEX:
        const latexMode = block.latexMode || 'block';
        const latex = block.text || '';
        try {
          const html = katex.renderToString(latex, {
            displayMode: latexMode === 'block',
            throwOnError: false,
            output: 'html',
          });
          return (
            <div key={block.id} className="my-2" style={colorStyles}>
              <div dangerouslySetInnerHTML={{ __html: html }} />
            </div>
          );
        } catch (err) {
          return (
            <div key={block.id} className="my-2 text-red-500 font-mono text-sm" style={colorStyles}>
              Invalid LaTeX: {latex}
            </div>
          );
        }
      
      case BLOCK_TYPE_DIVIDER:
        return (
          <hr key={block.id} className="border-t border-gray-300 dark:border-gray-600 my-4" />
        );
      
      case BLOCK_TYPE_IMAGE:
        if (!block.imageUrl && !block.imageFile) return null;
        return (
          <div key={block.id} className="my-4 overflow-x-hidden">
            <img
              src={block.imageUrl || block.imageFile}
              alt={text || 'Image'}
              className="max-w-full h-auto rounded-lg"
              style={{
                width: block.imageWidth ? Math.min(block.imageWidth, typeof window !== 'undefined' ? window.innerWidth - 32 : block.imageWidth) : 'auto',
                height: 'auto',
                maxWidth: '100%',
                margin: block.imageAlignment === 'center' ? '0 auto' : block.imageAlignment === 'right' ? '0 0 0 auto' : '0',
              }}
            />
          </div>
        );
      
      case BLOCK_TYPE_VIDEO:
        if (!block.videoUrl) return null;
        return (
          <div key={block.id} className="my-4 overflow-x-hidden">
            <VideoPlayer
              src={block.videoUrl}
              className="max-w-full rounded-lg"
            />
            {block.caption && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">{block.caption}</p>
            )}
          </div>
        );
      
      case BLOCK_TYPE_AUDIO:
        if (!block.audioUrl) return null;
        return (
          <div key={block.id} className="my-4">
            <SignedAudio src={block.audioUrl} controls className="w-full" />
            {block.caption && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 text-center">{block.caption}</p>
            )}
          </div>
        );
      
      case BLOCK_TYPE_PDF:
        if (!block.pdfUrl) return null;
        return (
          <div key={block.id} className="my-4 max-w-full overflow-x-hidden">
            <SignedPdfIframe src={block.pdfUrl} />
          </div>
        );
      
      case BLOCK_TYPE_EMBED:
        if (!block.url) return null;
        const getEmbedUrl = (url: string): string => {
          try {
            const urlObj = new URL(url);
            
            if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
              let videoId = '';
              if (urlObj.hostname.includes('youtu.be')) {
                videoId = urlObj.pathname.slice(1);
              } else {
                videoId = urlObj.searchParams.get('v') || '';
              }
              return `https://www.youtube.com/embed/${videoId}`;
            }
            
            if (urlObj.hostname.includes('rutube.ru')) {
              const match = urlObj.pathname.match(/\/video\/([a-zA-Z0-9]+)/);
              if (match && match[1]) {
                const videoId = match[1];
                return `https://rutube.ru/play/embed/${videoId}`;
              }
              if (urlObj.pathname.includes('/play/embed/')) {
                return url;
              }
            }
            
            return url;
          } catch (error) {
            return url;
          }
        };

        const embedUrl = getEmbedUrl(block.url);
        const isYouTube = embedUrl.includes('youtube.com/embed');
        const isRutube = embedUrl.includes('rutube.ru/play/embed');
        const width = block.embedWidth || 800;

        if (isYouTube || isRutube) {
          return (
            <div key={block.id} className="my-4 overflow-x-hidden" style={{ maxWidth: '100%' }}>
              <div style={{ width: `${width}px`, maxWidth: '100%' }}>
                <iframe
                  src={embedUrl}
                  className="rounded-lg w-full border border-gray-200 dark:border-gray-700 max-w-full"
                  style={{
                    height: '450px',
                    aspectRatio: '16/9',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Embedded content"
                />
              </div>
            </div>
          );
        }

        return (
          <div key={block.id} className="my-4 overflow-x-hidden">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-full">
              <iframe
                src={embedUrl}
                className="w-full max-w-full"
                style={{ 
                  height: '600px',
                  minHeight: '600px',
                }}
                title="Embedded content"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </div>
        );
      
      case BLOCK_TYPE_BOOKMARK:
        if (!block.url) return null;
        return (
          <div key={block.id} className="my-4">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors no-underline"
            >
              <div className="flex h-[100px]">
                <div className="flex-1 p-3 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    {block.favicon && (
                      <img
                        src={block.favicon}
                        alt=""
                        className="w-4 h-4 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {block.title || block.url}
                    </span>
                  </div>
                  {block.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-1">
                      {block.description}
                    </p>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-500 truncate block">
                    {block.url}
                  </span>
                </div>
                {block.imageUrl && (
                  <div className="flex-shrink-0 w-[120px] sm:w-[160px]">
                    <img
                      src={block.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </a>
          </div>
        );
      
      case BLOCK_TYPE_CALLOUT:
        const emoji = block.emoji || '💡';
        return (
          <div 
            key={block.id} 
            className="flex items-start w-full bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-lg p-4 gap-6 text-gray-700 dark:text-gray-300" 
            style={colorStyles}
          >
            <span className="flex-shrink-0 text-2xl">
              {emoji}
            </span>
            <div className="flex-1 min-w-0 space-y-2">
              {block.text && (!block.children || block.children.length === 0) && (
                <div className="text-base">
                  {renderTextWithLatex(block.text)}
                </div>
              )}
              {block.children && block.children.length > 0 && (
                <div className="space-y-2">
                  {block.children.map((child, idx) => renderBlock(child, idx))}
                </div>
              )}
            </div>
          </div>
        );
      
      case BLOCK_TYPE_TOGGLE_H1:
      case BLOCK_TYPE_TOGGLE_H2:
      case BLOCK_TYPE_TOGGLE_H3:
      case BLOCK_TYPE_TOGGLE_LIST:
        return (
          <ToggleBlock
            key={block.id}
            block={block}
            colorStyles={colorStyles}
            renderBlock={renderBlock}
            renderTextWithLatex={renderTextWithLatex}
          />
        );
      
      case BLOCK_TYPE_COLUMNS2:
      case BLOCK_TYPE_COLUMNS3:
      case BLOCK_TYPE_COLUMNS4:
      case BLOCK_TYPE_COLUMNS5:
        const columnCount = type === BLOCK_TYPE_COLUMNS2 ? 2 : 
                           type === BLOCK_TYPE_COLUMNS3 ? 3 : 
                           type === BLOCK_TYPE_COLUMNS4 ? 4 : 5;
        return (
          <div key={block.id} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-hidden" style={{ 
            gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 640 ? '1fr' : `repeat(${columnCount}, 1fr)`,
            ...colorStyles 
          }}>
            {block.columns?.map((column, colIdx) => (
              <div key={colIdx} className="space-y-2 max-w-full overflow-x-hidden">
                {column.map((child, idx) => renderBlock(child, idx))}
              </div>
            ))}
          </div>
        );
      
      case BLOCK_TYPE_TABLE:
        const tableData = block.tableData;
        if (!tableData?.cells) return null;
        
        const tableCells = tableData.cells;
        const tableColumnWidths = tableData.columnWidths || [];
        const rowBgColors = tableData.rowBackgroundColors || [];
        const colBgColors = tableData.columnBackgroundColors || [];
        const rowTxtColors = tableData.rowTextColors || [];
        const colTxtColors = tableData.columnTextColors || [];
        
        const getCellClasses = (rowIdx: number, colIdx: number): string => {
          const rowBgColor = rowBgColors[rowIdx] || 'default';
          const colBgColor = colBgColors[colIdx] || 'default';
          const rowTxtColor = rowTxtColors[rowIdx] || 'default';
          const colTxtColor = colTxtColors[colIdx] || 'default';
          
          let bgClass = '';
          if (rowBgColor !== 'default') {
            const colorConfig = BACKGROUND_COLORS.find(c => c.value === rowBgColor);
            bgClass = colorConfig?.colorClass || '';
          } else if (colBgColor !== 'default') {
            const colorConfig = BACKGROUND_COLORS.find(c => c.value === colBgColor);
            bgClass = colorConfig?.colorClass || '';
          }
          
          let txtClass = 'text-black dark:text-gray-100';
          if (rowTxtColor !== 'default') {
            const colorConfig = TEXT_COLORS.find(c => c.value === rowTxtColor);
            txtClass = colorConfig?.colorClass || 'text-black dark:text-gray-100';
          } else if (colTxtColor !== 'default') {
            const colorConfig = TEXT_COLORS.find(c => c.value === colTxtColor);
            txtClass = colorConfig?.colorClass || 'text-black dark:text-gray-100';
          }
          
          return `${bgClass} ${txtClass}`;
        };
        
        return (
          <div key={block.id} className="my-4 overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <tbody>
                {tableCells.map((row: string[], rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.map((cell: string, colIdx: number) => (
                      <td
                        key={colIdx}
                        className={`border border-gray-300 dark:border-gray-600 px-3 py-2 ${getCellClasses(rowIdx, colIdx)}`}
                        style={{
                          width: tableColumnWidths[colIdx] ? `${tableColumnWidths[colIdx]}%` : 'auto',
                        }}
                        dangerouslySetInnerHTML={{ __html: cell || '' }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      
      default:
        return (
          <p key={block.id} className="text-base text-gray-700 dark:text-gray-300" style={colorStyles}>
            {renderTextContent(text)}
          </p>
        );
    }
  };

  return (
    <div className={containerClassName}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
};
