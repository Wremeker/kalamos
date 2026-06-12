import React from 'react';
import { BlockRendererProps } from './types';
import { renderTextWithHtml, hasLatexExpressions } from '../../../utils/latexRenderer';
import { useEditableBlock } from '../../../hooks/editor/useEditableBlock';
import { getTextColorClass } from '../../../utils/editorUtils';

export const NumberedBlock: React.FC<BlockRendererProps> = ({
  block,
  baseClasses,
  contentProps,
  getDisplayNumber,
}) => {
  const { editableRef, isEditing, setIsEditing } = useEditableBlock(block.text);
  const textColorClass = getTextColorClass(block.textColor);
  const hasLatex = hasLatexExpressions(block.text || '');

  return (
    <div role="listitem" className="flex items-start w-full max-w-full">
      <span className="text-gray-600 dark:text-gray-400 select-none mt-0 min-w-[15px] font-bold pr-2 flex-shrink-0">
        {getDisplayNumber?.() || 1}.
      </span>
      {hasLatex && !isEditing && block.text ? (
        <div
          key={`display-${block.id}`}
          data-block-id={block.id}
          className={`${baseClasses} flex-1 min-w-0 ${textColorClass} cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1 transition-colors`}
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          {renderTextWithHtml(block.text)}
        </div>
      ) : (
        <div
          key={`edit-${block.id}`}
          ref={editableRef}
          data-block-id={block.id}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            if (contentProps?.onInput) {
              contentProps.onInput(e);
            }
          }}
          onKeyDown={(e) => {
            if (contentProps?.onKeyDown) {
              contentProps.onKeyDown(e);
            }
          }}
          className={`${baseClasses} flex-1 min-w-0 ${textColorClass}`}
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
      )}
    </div>
  );
};
