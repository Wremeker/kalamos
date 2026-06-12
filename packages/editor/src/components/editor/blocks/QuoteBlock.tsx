import React from 'react';
import { BlockRendererProps } from './types';
import { renderTextWithHtml, hasLatexExpressions } from '../../../utils/latexRenderer';
import { useEditableBlock } from '../../../hooks/editor/useEditableBlock';
import { getTextColorClass } from '../../../utils/editorUtils';

export const QuoteBlock: React.FC<BlockRendererProps> = ({
  block,
  baseClasses,
  contentProps,
}) => {
  const { editableRef, isEditing, setIsEditing } = useEditableBlock<HTMLQuoteElement>(block.text);
  const textColorClass = getTextColorClass(block.textColor, 'text-gray-700 dark:text-gray-300');
  const hasLatex = hasLatexExpressions(block.text || '');

  if (hasLatex && !isEditing && block.text) {
    return (
      <blockquote
        key={`display-${block.id}`}
        data-block-id={block.id}
        className={`${baseClasses} my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 text-lg ${textColorClass} italic leading-relaxed cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1 transition-colors`}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {renderTextWithHtml(block.text)}
      </blockquote>
    );
  }

  return (
    <blockquote
      key={`edit-${block.id}`}
      ref={editableRef}
      data-block-id={block.id}
      contentEditable
      suppressContentEditableWarning
      onInput={(e: any) => {
        if (contentProps?.onInput) {
          contentProps.onInput(e);
        }
      }}
      onKeyDown={(e: any) => {
        if (contentProps?.onKeyDown) {
          contentProps.onKeyDown(e);
        }
      }}
      className={`${baseClasses} my-4 pl-4 border-l-4 border-gray-300 dark:border-gray-600 text-lg ${textColorClass} italic leading-relaxed`}
      onFocus={() => {
        setIsEditing(true);
        if (contentProps?.onFocus) {
          contentProps.onFocus();
        }
      }}
      onBlur={() => {
        setIsEditing(false);
        if (contentProps?.onBlur) {
          contentProps.onBlur();
        }
      }}
      {...(contentProps && (contentProps as any)['data-placeholder'] ? { 'data-placeholder': (contentProps as any)['data-placeholder'] } : {})}
    />
  );
};

