import { useEffect, useRef, useState } from 'react';
import { EmojiPicker } from 'frimousse';
import { Smile, X } from 'lucide-react';

/**
 * Notion-style page emoji: a large clickable icon above the title. Clicking it
 * opens a searchable emoji picker (frimousse, the same engine the editor uses);
 * picking an emoji calls `onChange`. When no emoji is set, an "Add icon" hint
 * shows on hover.
 */
export function EmojiButton({
  emoji,
  onChange,
}: {
  emoji?: string;
  onChange: (emoji: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {emoji ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Change icon"
          className="flex size-16 items-center justify-center rounded-lg text-5xl leading-none transition-colors hover:bg-gray-100"
        >
          {emoji}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-400 opacity-0 transition-opacity group-hover/doc:opacity-100 hover:bg-gray-100 hover:text-gray-600"
        >
          <Smile className="size-4" />
          Add icon
        </button>
      )}

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {emoji && (
            <div className="flex justify-end border-b border-gray-100 px-2 py-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="size-3.5" />
                Remove
              </button>
            </div>
          )}
          <EmojiPicker.Root
            locale="en"
            onEmojiSelect={({ emoji: picked }) => {
              onChange(picked);
              setOpen(false);
            }}
            className="isolate flex h-[320px] w-full flex-col bg-white"
          >
            <EmojiPicker.Search
              autoFocus
              placeholder="Search emoji…"
              className="z-10 mx-2 mt-2 appearance-none rounded-md bg-gray-100 px-2.5 py-2 text-sm outline-none"
            />
            <EmojiPicker.Viewport className="relative flex-1 outline-none">
              <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                Loading…
              </EmojiPicker.Loading>
              <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
                No emoji found.
              </EmojiPicker.Empty>
              <EmojiPicker.List
                className="select-none pb-1.5"
                components={{
                  CategoryHeader: ({ category, ...props }) => (
                    <div
                      className="bg-white px-3 pt-3 pb-1.5 text-xs font-medium text-gray-400"
                      {...props}
                    >
                      {category.label}
                    </div>
                  ),
                  Row: ({ children, ...props }) => (
                    <div className="scroll-my-1.5 px-1.5" {...props}>
                      {children}
                    </div>
                  ),
                  Emoji: ({ emoji: e, ...props }) => (
                    <button
                      className="flex size-8 items-center justify-center rounded-md text-xl data-[active]:bg-gray-100"
                      {...props}
                    >
                      {e.emoji}
                    </button>
                  ),
                }}
              />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </div>
      )}
    </div>
  );
}
