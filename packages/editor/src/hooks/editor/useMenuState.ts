import { useState, useCallback } from 'react';
import { findBlockLocation } from '../../utils/editorUtils';
import { useEditorContext } from '../../contexts/EditorContext';

export interface MenuState {
  visible: boolean;
  position: { x: number; y: number } | null;
  blockId: string | null;
  filter: string;
  triggerType: 'slash' | null;
  isInsideToggle?: boolean;
  isNested?: boolean;
}

export interface ActionMenuState {
  visible: boolean;
  position: { x: number; y: number } | null;
  blockId: string | null;
  isInsideToggle?: boolean;
  isNested?: boolean;
  // Selected blocks for multi-block operations (including nested)
  selectedBlockIds?: Set<string>;
}

interface LinkModalState {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  initialUrl: string;
  onConfirm: ((url: string) => void) | null;
}

interface LinkPasteMenuState {
  visible: boolean;
  position: { x: number; y: number } | null;
  url: string;
  blockId: string | null;
  originalText: string;
}

export const useMenuState = () => {
  const { blocks } = useEditorContext();
  
  const [menuState, setMenuState] = useState<MenuState>({
    visible: false,
    position: null,
    blockId: null,
    filter: '',
    triggerType: null,
    isInsideToggle: false,
  });

  // Selection menu state
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);

  // Link paste menu state
  const [linkPasteMenu, setLinkPasteMenu] = useState<LinkPasteMenuState>({
    visible: false,
    position: null,
    url: '',
    blockId: null,
    originalText: '',
  });

  const [actionMenu, setActionMenu] = useState<ActionMenuState>({
    visible: false,
    position: null,
    blockId: null,
    isInsideToggle: false,
  });

  const [linkModal, setLinkModal] = useState<LinkModalState>({
    isOpen: false,
    position: null,
    initialUrl: '',
    onConfirm: null,
  });

  const handleActionMenuClose = useCallback(() => {
    setActionMenu({ visible: false, position: null, blockId: null, isNested: false });
  }, []);

  const handleDotsClick = useCallback((
    blockId: string, 
    element: HTMLElement, 
    isInsideToggle?: boolean,
    selectedBlockIds?: Set<string>
  ) => {
    const location = findBlockLocation(blockId, blocks);
    const rect = element.getBoundingClientRect();
    setActionMenu({
      visible: true,
      position: { x: rect.left - 8, y: rect.bottom + 4 },
      blockId: blockId,
      isInsideToggle: isInsideToggle || false,
      isNested: location.isNested,
      selectedBlockIds,
    });
  }, [blocks]);

  const openLinkModal = useCallback((initialUrl: string, position: { x: number; y: number }, onConfirm: (url: string) => void) => {
    setLinkModal({
      isOpen: true,
      position,
      initialUrl,
      onConfirm,
    });
  }, []);

  const closeLinkModal = useCallback(() => {
    setLinkModal({
      isOpen: false,
      position: null,
      initialUrl: '',
      onConfirm: null,
    });
  }, []);

  return {
    menuState,
    setMenuState,
    showSelectionMenu,
    setShowSelectionMenu,
    linkPasteMenu,
    setLinkPasteMenu,
    actionMenu,
    setActionMenu,
    linkModal,
    setLinkModal,
    
    handleActionMenuClose,
    handleDotsClick,
    openLinkModal,
    closeLinkModal,
  };
};

