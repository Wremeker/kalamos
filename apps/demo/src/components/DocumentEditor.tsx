import { useEffect, useRef, useState } from 'react';
import { BlockEditor, type Block } from '@kalamoss/editor';
import { documentsApi } from '../api';
import { EmojiButton } from './EmojiButton';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function DocumentEditor({ documentId }: { documentId: string }) {
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [icon, setIcon] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ title: string; blocks: Block[]; icon?: string }>({
    title: '',
    blocks: [],
    icon: undefined,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    documentsApi
      .get(documentId)
      .then((doc) => {
        if (cancelled) return;
        setTitle(doc.title);
        setBlocks(doc.content?.blocks ?? []);
        setIcon(doc.content?.icon);
        latest.current = {
          title: doc.title,
          blocks: doc.content?.blocks ?? [],
          icon: doc.content?.icon,
        };
        setLoadError(null);
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // Debounced autosave (1s) mirroring the app's autosave pattern.
  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        await documentsApi.save(documentId, {
          title: latest.current.title,
          content: { blocks: latest.current.blocks, icon: latest.current.icon },
        });
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 1000);
  };

  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    []
  );

  const handleBlocksChange = (next: Block[]) => {
    setBlocks(next);
    latest.current = { ...latest.current, blocks: next };
    scheduleSave();
  };

  const handleTitleChange = (next: string) => {
    setTitle(next);
    latest.current = { ...latest.current, title: next };
    scheduleSave();
  };

  const handleIconChange = (next: string | undefined) => {
    setIcon(next);
    latest.current = { ...latest.current, icon: next };
    scheduleSave();
  };

  if (loading) return <p className="text-gray-500">Loading document…</p>;
  if (loadError)
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-medium">Failed to load document.</p>
        <p className="text-sm">{loadError}</p>
      </div>
    );

  return (
    <div className="group/doc flex h-full flex-col">
      {/* Notion-style page emoji above the title. Aligned with the title/blocks. */}
      <div className="mb-1 px-0 sm:px-8 md:px-16">
        <EmojiButton emoji={icon} onChange={handleIconChange} />
      </div>

      {/* Mirror BlockEditor's internal horizontal padding (px-0 sm:px-8 md:px-16)
          so the title's left edge lines up with the block content. */}
      <div className="mb-3 flex items-center justify-between px-0 sm:px-8 md:px-16">
        <input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-[2.25rem] leading-tight font-bold outline-none placeholder:text-gray-300"
          data-testid="doc-title"
        />
        <span className="ml-4 shrink-0 text-xs text-gray-400" data-testid="save-state">
          {saveState === 'saving'
            ? 'Saving…'
            : saveState === 'saved'
              ? 'Saved'
              : saveState === 'error'
                ? 'Save failed'
                : ''}
        </span>
      </div>

      <div className="kalamos-editor min-h-0 w-full flex-1 bg-white">
        <BlockEditor blocks={blocks} onChange={handleBlocksChange} />
      </div>
    </div>
  );
}
