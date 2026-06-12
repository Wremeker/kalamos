import React, { useState, useEffect, useRef } from 'react';
import katex from 'katex';
import { BlockRendererProps } from './types';
import { AlignLeft, AlignCenter } from 'lucide-react';

export const LatexBlock: React.FC<BlockRendererProps> = ({
  block,
  baseClasses,
  contentProps,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const latexMode = block.latexMode || 'block';
  const latex = block.text || '';

  useEffect(() => {
    if (!isEditing && latex) {
      try {
        const html = katex.renderToString(latex, {
          displayMode: latexMode === 'block',
          throwOnError: true,
          output: 'html',
        });
        setRenderedHtml(html);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid LaTeX syntax');
        setRenderedHtml('');
      }
    }
  }, [latex, latexMode, isEditing]);

  useEffect(() => {
    if (isEditing && editorRef.current) {
      editorRef.current.focus();
      
      const sel = window.getSelection();
      if (sel && editorRef.current.childNodes.length > 0) {
        const range = document.createRange();
        const firstChild = editorRef.current.childNodes[0];
        if (firstChild.nodeType === Node.TEXT_NODE) {
          range.setStart(firstChild, firstChild.textContent?.length || 0);
        } else {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        }
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [isEditing]);

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const toggleMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Toggle mode - currently just triggers onInput if available
    if (contentProps.onInput) {
      contentProps.onInput(e as unknown as React.FormEvent<HTMLDivElement>);
    }
  };

  if (isEditing) {
    return (
      <div className="my-2" onMouseDown={handleMouseDown}>
        <div className="relative rounded-lg border p-4 bg-gray-50 border-gray-300">
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              type="button"
              className={`p-1.5 rounded transition-colors ${
                latexMode === 'inline'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={toggleMode}
              title="Inline mode"
            >
              <AlignLeft size={14} />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded transition-colors ${
                latexMode === 'block'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              onClick={toggleMode}
              title="Block mode"
            >
              <AlignCenter size={14} />
            </button>
          </div>

          <div
            {...contentProps}
            ref={editorRef}
            className={`${baseClasses} min-h-[60px] pr-20 text-gray-900`}
            style={{
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '0.95rem',
              lineHeight: '1.6',
            }}
            onBlur={handleBlur}
            data-placeholder="Enter LaTeX formula (e.g., E = mc^2)"
          />
          
          <div className="mt-2 text-xs text-gray-500">
            Click outside to render. Examples: x^2, \frac{'{a}{b}'}, \sum_{'{i=1}'}^{'{n}'} x_i
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="my-2 cursor-pointer group"
      onClick={handlePreviewClick}
      onMouseDown={handleMouseDown}
    >
      {error ? (
        <div className="rounded-lg border p-4 bg-red-50 border-red-300 text-red-700">
          <div className="font-semibold text-sm mb-1">LaTeX Error</div>
          <div className="text-xs font-mono">{error}</div>
          <div className="text-xs mt-2 text-gray-600">
            Click to edit
          </div>
        </div>
      ) : latex ? (
        <div
          className={`relative rounded-lg border p-4 transition-colors bg-gray-50 border-gray-200 group-hover:bg-gray-100 group-hover:border-gray-300 ${latexMode === 'block' ? 'text-center' : ''}`}
        >
          <div
            ref={previewRef}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
            className="text-gray-900"
          />
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500">
            Click to edit
          </div>
          
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded bg-white text-gray-600">
            {latexMode === 'block' ? 'Block' : 'Inline'}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-center cursor-pointer transition-colors bg-gray-50 border-gray-300 text-gray-400 hover:bg-gray-100 hover:border-gray-400">
          <div className="text-sm">Click to add LaTeX formula</div>
          <div className="text-xs mt-1 text-gray-500">
            Example: E = mc^2
          </div>
        </div>
      )}
    </div>
  );
};
