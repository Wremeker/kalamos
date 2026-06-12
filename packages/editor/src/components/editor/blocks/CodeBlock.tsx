import React from 'react';
import { BlockRendererProps } from './types';

export const CodeBlock: React.FC<BlockRendererProps> = ({
  baseClasses,
  contentProps,
}) => {
  return (
    <div className="my-2">
      <pre
        {...(contentProps as any)}
        className={`${baseClasses} text-base min-h-[80px] m-0 rounded-lg border p-4 bg-gray-50 border-gray-300 text-gray-900`}
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: '1rem',
          tabSize: 2,
          lineHeight: '1.5rem',
          whiteSpace: 'pre-wrap',
          overflowX: 'auto',
        }}
      />
    </div>
  );
};

