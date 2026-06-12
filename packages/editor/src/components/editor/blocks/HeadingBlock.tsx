import React from 'react';
import { BlockRendererProps } from './types';
import { renderTextWithHtml, hasLatexExpressions } from '@/utils/latexRenderer.tsx';
import { useEditableBlock } from '@/hooks/editor/useEditableBlock.ts';
import { getTextColorClass } from '@/utils/editorUtils.ts';

interface HeadingBlockProps extends BlockRendererProps {
  level: 1 | 2 | 3 | 4 | 5;
}

const headingConfig = {
  1: { className: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight my-3', tag: 'h1' as const },
  2: { className: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-snug my-3', tag: 'h2' as const },
  3: { className: 'text-base sm:text-lg md:text-xl lg:text-2xl font-bold leading-snug my-2', tag: 'h3' as const },
  4: { className: 'text-base sm:text-base md:text-lg lg:text-xl font-semibold leading-normal mIy-2', tag: 'h4' as const },
  5: { className: 'text-sm sm:text-base md:text-base lg:text-lg font-semibold leading-normal my-2', tag: 'h5' as const },
};

export const HeadingBlock: React.FC<HeadingBlockProps> = ({
  level,
  block,
  baseClasses,
  contentProps,
}) => {
  const { editableRef, isEditing, setIsEditing } = useEditableBlock<HTMLHeadingElement>(block.text);
  const textColorClass = getTextColorClass(block.textColor);
  const hasLatex = hasLatexExpressions(block.text || '');
  
  const config = headingConfig[level];
  const HeadingTag = config.tag;

  if (hasLatex && !isEditing && block.text) {
    return (
      <HeadingTag
        key={`display-${block.id}`}
        data-block-id={block.id}
        className={`${baseClasses} ${config.className} ${textColorClass} cursor-text hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 -mx-1 transition-colors`}
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {renderTextWithHtml(block.text)}
      </HeadingTag>
    );
  }

  return (
    <HeadingTag
      key={`edit-${block.id}`}
      ref={editableRef as any}
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
      className={`${baseClasses} ${config.className} ${textColorClass}`}
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

