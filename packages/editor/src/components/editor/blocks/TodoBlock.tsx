import React from 'react';
import { BlockRendererProps } from './types';
import { renderTextWithHtml, hasLatexExpressions } from '../../../utils/latexRenderer';
import { useEditableBlock } from '../../../hooks/editor/useEditableBlock';

export const TodoBlock: React.FC<BlockRendererProps> = ({
  block,
  baseClasses,
  contentProps,
  checkboxRef,
  onCheckToggle,
}) => {
  const { editableRef, isEditing, setIsEditing } = useEditableBlock(block.text);
  const hasLatex = hasLatexExpressions(block.text || '');

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onCheckToggle) {
      onCheckToggle(block.id, e.target.checked);
    }
  };

  const handleCheckboxMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="flex items-center gap-2 group w-full max-w-full">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={block.checked || false}
        onChange={handleCheckboxChange}
        onMouseDown={handleCheckboxMouseDown}
        className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
      />
      {hasLatex && !isEditing && block.text ? (
        <div
          key={`display-${block.id}`}
          className={`${baseClasses} flex-1 min-w-0 text-black dark:text-gray-100 cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1 transition-colors ${
            block.checked ? 'line-through opacity-60' : ''
          }`}
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
          {...(contentProps as any)}
          className={`${baseClasses} flex-1 min-w-0 text-black dark:text-gray-100 cursor-text ${
            block.checked ? 'line-through opacity-60' : ''
          }`}
          onFocus={() => {
            setIsEditing(true);
          }}
          onBlur={() => {
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
};

