import { useState, useCallback, useRef } from 'react';
import { Block } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';

interface HistoryState {
  past: Block[][];
  future: Block[][];
}

interface UseEditorHistoryOptions {
  onUndo?: () => void;
  onRedo?: () => void;
}

export const useEditorHistory = (options?: UseEditorHistoryOptions) => {
  const { blocks, onChange } = useEditorContext();
  const hasExternal = !!(options?.onUndo && options?.onRedo);
  
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    future: [],
  });
  
  const isUndoRedoRef = useRef(false);

  const handleChange = useCallback(
    (newBlocks: Block[]) => {
      if (!hasExternal && !isUndoRedoRef.current) {
        setHistory((prev) => ({
          past: [...prev.past, blocks],
          future: [],
        }));
      }
      onChange(newBlocks);
    },
    [blocks, onChange, hasExternal]
  );

  const handleUndo = useCallback(() => {
    if (hasExternal) {
      options!.onUndo!();
      return;
    }

    if (history.past.length === 0) return;

    isUndoRedoRef.current = true;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);

    setHistory({
      past: newPast,
      future: [blocks, ...history.future],
    });

    onChange(previous);
    
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [history, blocks, onChange, hasExternal, options]);

  const handleRedo = useCallback(() => {
    if (hasExternal) {
      options!.onRedo!();
      return;
    }

    if (history.future.length === 0) return;

    isUndoRedoRef.current = true;
    const next = history.future[0];
    const newFuture = history.future.slice(1);

    setHistory({
      past: [...history.past, blocks],
      future: newFuture,
    });

    onChange(next);
    
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [history, blocks, onChange, hasExternal, options]);

  return {
    handleChange,
    handleUndo,
    handleRedo,
    canUndo: hasExternal ? true : history.past.length > 0,
    canRedo: hasExternal ? true : history.future.length > 0,
  };
};
