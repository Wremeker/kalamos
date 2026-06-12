import { defaultStrings } from './strings';

export type StringsTree = { [key: string]: string | StringsTree };

let currentStrings: StringsTree = defaultStrings as unknown as StringsTree;

/**
 * Replace the active string table. Called by EditorProvider when a `strings`
 * prop is supplied. Overrides are deep-merged over the bundled defaults so a
 * consumer can localize a single key without re-supplying everything.
 */
export function setEditorStrings(overrides?: DeepPartial<StringsTree>): void {
  currentStrings = overrides ? deepMerge(defaultStrings as unknown as StringsTree, overrides) : (defaultStrings as unknown as StringsTree);
}

export function getEditorStrings(): StringsTree {
  return currentStrings;
}

function resolve(tree: StringsTree, dotKey: string): string | undefined {
  const parts = dotKey.split('.');
  let node: string | StringsTree | undefined = tree;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as StringsTree)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
}

function humanizeFallback(dotKey: string): string {
  const last = dotKey.split('.').pop() ?? dotKey;
  const spaced = last.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function interpolate(template: string, opts?: Record<string, unknown>): string {
  if (!opts) return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, name: string) => {
    const value = opts[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

/**
 * i18next-compatible `t`. Supports `t('editor.bold')` and
 * `t('editor.commentsCount', { count: 3 })` style interpolation.
 * Falls back to a humanized last path segment for unknown keys so the UI
 * never renders a raw dotted key.
 */
export function translate(key: string, opts?: Record<string, unknown>): string {
  const found = resolve(currentStrings, key);
  if (found !== undefined) return interpolate(found, opts);
  return humanizeFallback(key);
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge(base: StringsTree, override: DeepPartial<StringsTree>): StringsTree {
  const out: StringsTree = Array.isArray(base) ? ([...(base as unknown as unknown[])] as unknown as StringsTree) : { ...base };
  for (const key of Object.keys(override)) {
    const o = (override as StringsTree)[key];
    const b = out[key];
    if (o && typeof o === 'object' && b && typeof b === 'object') {
      out[key] = deepMerge(b as StringsTree, o as DeepPartial<StringsTree>);
    } else if (o !== undefined) {
      out[key] = o as string | StringsTree;
    }
  }
  return out;
}
