import React from 'react';
import { BlockRendererProps } from './types';
import { renderTextWithHtml, hasLatexExpressions } from '../../../utils/latexRenderer';
import { useEditableBlock } from '../../../hooks/editor/useEditableBlock';
import { getTextColorClass } from '../../../utils/editorUtils';

export const ParagraphBlock: React.FC<BlockRendererProps> = ({
  block,
  baseClasses,
  contentProps,
  isFirst,
}) => {
  const { editableRef, isEditing, setIsEditing } = useEditableBlock(block.text);
  const textColorClass = getTextColorClass(block.textColor);
  const hasLatex = hasLatexExpressions(block.text || '');

  if (hasLatex && !isEditing && block.text) {
    return (
      <div
        key={`display-${block.id}`}
        data-block-id={block.id}
        className={`${baseClasses} ${textColorClass} cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1 transition-colors`}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {renderTextWithHtml(block.text)}
      </div>
    );
  }

  return (
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
      onPaste={(e: any) => {
        if (contentProps?.onPaste) {
          contentProps.onPaste(e);
        }
      }}
      onClick={(e: any) => {
        if ((contentProps as any)?.onClick) {
          (contentProps as any).onClick(e);
        }
      }}
      onKeyDown={(e) => {
        if (contentProps?.onKeyDown) {
          contentProps.onKeyDown(e);
        }
      }}
      className={`${baseClasses} ${textColorClass} ${
        isFirst && !block.text ? 'empty-block' : ''
      }`}
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

