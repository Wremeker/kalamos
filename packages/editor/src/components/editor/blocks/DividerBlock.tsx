import React from 'react';
import { BlockRendererProps } from './types';

export const DividerBlock: React.FC<BlockRendererProps> = ({
  block,
  index,
  onKeyDown,
  setIsFocused,
}) => {
  return (
    <div
      data-block-id={block.id}
      className="py-3 outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 rounded transition-colors"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => onKeyDown(e, block.id, index)}
      onFocus={() => setIsFocused?.(true)}
      onBlur={() => setIsFocused?.(false)}
    >
      <hr className="border-t border-gray-300 dark:border-gray-600" />
    </div>
  );
};

