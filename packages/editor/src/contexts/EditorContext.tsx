import React, { createContext, useContext, useRef } from 'react';
import { Block } from '../types/editor';

interface EditorContextValue {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  editorRef: React.RefObject<HTMLDivElement | null>;
  blocksContainerRef: React.RefObject<HTMLDivElement | null>;
  composingRef: React.MutableRefObject<boolean>;
  newlyAddedBlockIds?: Set<string>;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditorContext must be used within an EditorProvider');
  }
  return context;
};

export const useEditorContextOptional = () => {
  return useContext(EditorContext);
};

interface EditorProviderProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  children: React.ReactNode;
  newlyAddedBlockIds?: Set<string>;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ blocks, onChange, children, newlyAddedBlockIds }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  const composingRef = useRef(false);

  const value: EditorContextValue = {
    blocks,
    onChange,
    editorRef,
    blocksContainerRef,
    composingRef,
    newlyAddedBlockIds,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

