import { describe, it, expect, afterEach } from 'vitest';
import { translate, setEditorStrings } from './runtime';

afterEach(() => setEditorStrings());

describe('translate', () => {
  it('resolves a bundled default string', () => {
    // `editor.bold` exists in the default English table.
    expect(typeof translate('editor.bold')).toBe('string');
    expect(translate('editor.bold').length).toBeGreaterThan(0);
  });

  it('applies overrides supplied via setEditorStrings', () => {
    setEditorStrings({ editor: { bold: 'CUSTOM_BOLD' } });
    expect(translate('editor.bold')).toBe('CUSTOM_BOLD');
  });

  it('interpolates variables', () => {
    setEditorStrings({ editor: { greeting: 'Hi {{name}}' } });
    expect(translate('editor.greeting', { name: 'Sam' })).toBe('Hi Sam');
  });

  it('humanizes unknown keys instead of echoing the dotted path', () => {
    expect(translate('editor.someUnknownKey')).toBe('Some Unknown Key');
  });
});
