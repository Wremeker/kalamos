import { useState, useEffect, useRef, useCallback } from 'react';
import { updateElementContentPreservingCursor } from '@/utils/editorUtils';

export const useEditableBlock = <T extends HTMLElement = HTMLDivElement>(blockText: string | undefined) => {
  const editableRef = useRef<T>(null);
  const [isEditing, setIsEditing] = useState(false);
  const blockTextRef = useRef<string | undefined>(blockText);

  useEffect(() => {
    blockTextRef.current = blockText;
  }, [blockText]);

  const handleRefCallback = useCallback((node: T | null) => {
    (editableRef as any).current = node;
    
    if (node && blockTextRef.current) {
      node.innerHTML = blockTextRef.current || '';
    }
  }, []);

  useEffect(() => {
    if (editableRef.current && blockText !== undefined) {
      const currentContent = editableRef.current.innerHTML;
      if (currentContent !== blockText) {
        updateElementContentPreservingCursor(editableRef.current, blockText || '', false);
      }
    }
  }, [blockText]);

  useEffect(() => {
    if (!isEditing) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (editableRef.current && !editableRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isEditing]);

  return {
    editableRef: handleRefCallback as any,
    isEditing,
    setIsEditing,
  };
};

