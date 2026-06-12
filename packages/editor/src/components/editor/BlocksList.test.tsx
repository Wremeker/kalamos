import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { BlocksList } from './BlocksList';
import { registerBlock, unregisterBlock } from '../../registry/blockRegistry';
import type { Block } from '../../types/editor';

afterEach(cleanup);

describe('BlocksList (read-only)', () => {
  it('renders headings and paragraphs', () => {
    const blocks: Block[] = [
      { id: '1', type: 'h1', text: 'Hello World' },
      { id: '2', type: 'paragraph', text: 'A paragraph' },
    ];
    render(<BlocksList blocks={blocks} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('A paragraph')).toBeInTheDocument();
  });

  it('renders a registered custom block', () => {
    registerBlock({
      type: 'my-custom',
      render: ({ block }) => <div data-testid="custom">CUSTOM:{block.text}</div>,
    });
    try {
      const blocks: Block[] = [
        { id: '1', type: 'my-custom' as Block['type'], text: 'payload' },
      ];
      render(<BlocksList blocks={blocks} />);
      expect(screen.getByTestId('custom')).toHaveTextContent('CUSTOM:payload');
    } finally {
      unregisterBlock('my-custom');
    }
  });
});
