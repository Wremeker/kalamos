import { useCallback, useState } from 'react';
import { Block, BlockType } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';
import {
  createBlock, 
  getCaretCoordinates, 
  setCaretToEnd, 
  setCaretToStart,
  getCaretOffset,
  setCaretToCharacterOffset,
  isBulletListTrigger,
  getNumberedListTrigger,
  findBlockLocation,
  stripInlineTextColorsFromHtml,
} from '../../utils/editorUtils';
import { TextColor, BackgroundColor } from '../../constants/colors';
import type { MenuState, ActionMenuState } from './useMenuState';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_VIDEO,
  BLOCK_TYPE_AUDIO,
  BLOCK_TYPE_PDF,
  BLOCK_TYPE_BOOKMARK,
  BLOCK_TYPE_EMBED,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
  BLOCK_TYPE_CALLOUT,
  BLOCK_TYPE_COLUMNS2,
  BLOCK_TYPE_COLUMNS3,
  BLOCK_TYPE_COLUMNS4,
  BLOCK_TYPE_COLUMNS5,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  BLOCK_TYPE_EXERCISE,
} from '../../constants/blockTypes';
import { getInitialExerciseData } from '../../utils/exerciseUtils';
import { imagesApi } from '../../api/images';
import { mediaApi } from '../../api/media';
import { toast } from 'sonner';
import { getErrorMessage } from '../../utils/errorUtils';

interface UseBlockOperationsProps {
  handleChange: (blocks: Block[]) => void;
  setMenuState: React.Dispatch<React.SetStateAction<MenuState>>;
  menuState: MenuState;
  actionMenu: ActionMenuState;
  selectedBlockIds: Set<string>;
  setSelectedBlockIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  publicHash?: string;
}

export const useBlockOperations = ({
  handleChange,
  setMenuState,
  menuState,
  actionMenu,
  selectedBlockIds,
  setSelectedBlockIds,
  publicHash,
}: UseBlockOperationsProps) => {
  const { blocks, editorRef, composingRef } = useEditorContext();
  const [uploadingBlockIds, setUploadingBlockIds] = useState<Set<string>>(new Set());
  const [videoUploadProgress, setVideoUploadProgress] = useState<Record<string, number>>({});

  const updateBlockAtLocation = useCallback((
    blocks: Block[],
    location: ReturnType<typeof findBlockLocation>,
    updatedBlock: Block
  ): Block[] => {
    const newBlocks = [...blocks];
    
      if (location.isNested) {
        const parentBlock = newBlocks[location.parentBlockIndex];
        
        if (location.isToggleChild) {
          // Update child block in toggle heading
          const children = [...(parentBlock.children || [])];
          children[location.blockIndex] = updatedBlock;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
        } else if (parentBlock.columns) {
          // Update block in column
          const columnBlocks = [...parentBlock.columns[location.columnIndex]];
          columnBlocks[location.blockIndex] = updatedBlock;
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = updatedBlock;
    }
    
    return newBlocks;
  }, []);

  const updateBlock = useCallback(
    (id: string, text: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block || composingRef.current) return;
      
      const block = location.block;

      // Check markdown style for bulleted lists: "- " at line start
      if (isBulletListTrigger(text)) {
        // Immediately clear the DOM element
        const element = editorRef.current?.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
        if (element) {
          element.innerHTML = '';
          element.textContent = '';
        }
        
        // Convert block to bulleted list
        const updatedBlock: Block = {
          ...block,
          type: BLOCK_TYPE_BULLETED as BlockType,
          text: '', // Clear text of "- "
        };
        
        const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
        handleChange(newBlocks);

        // Restore focus
        setTimeout(() => {
          const element = editorRef.current?.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
          if (element) {
            element.focus();
            setCaretToStart(element);
          }
        }, 0);
        return; // Do not call onChange below
      }

      // Check markdown style for numbered lists: "1. ", "2. ", etc.
      const startNumber = getNumberedListTrigger(text);
      
      if (startNumber !== null) {
        // Immediately clear the DOM element
        const element = editorRef.current?.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
        if (element) {
          element.innerHTML = '';
          element.textContent = '';
        }
        
        // Convert block to numbered list
        // Only set startNumber if it's non-sequential (> 1)
        const updatedBlock: Block = {
          ...block,
          type: BLOCK_TYPE_NUMBERED as BlockType,
          text: '', // Clear text of "1. "
          ...(startNumber > 1 ? { startNumber } : {}), // Only add startNumber if > 1
        };
        
        const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
        handleChange(newBlocks);

        // Restore focus
        setTimeout(() => {
          const element = editorRef.current?.querySelector(`[data-block-id="${id}"]`) as HTMLElement;
          if (element) {
            element.focus();
            setCaretToStart(element);
          }
        }, 0);
        return; // Do not call onChange below
      }

      if (text.length === 0 && block.text.length > 0) {
        const updatedBlock = { ...block, text: '' };
        const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
        handleChange(newBlocks);
        return;
      }

      // Check slash command
      if (text.includes('/')) {
        const slashIndex = text.lastIndexOf('/');
        const textBeforeSlash = text.slice(0, slashIndex).trim();
        
        // Show menu only if block was empty before the slash
        if (textBeforeSlash.length === 0) {
          const filter = text.slice(slashIndex + 1);
          const coords = getCaretCoordinates();

          if (coords) {
            setMenuState({
              visible: true,
              position: { x: coords.left, y: coords.bottom },
              blockId: id,
              filter,
              triggerType: 'slash',
              isInsideToggle: location.isToggleChild || false,
              isNested: location.isNested,
            });
          }
        } else {
          // If block already has text, do not show menu
          setMenuState((prev) => ({ ...prev, visible: false }));
        }
      } else {
        setMenuState((prev) => ({ ...prev, visible: false }));
      }

      // Update block text
      const updatedBlock = { ...block, text };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, editorRef, composingRef, setMenuState, updateBlockAtLocation]
  );

  const handleMenuSelect = useCallback(
    (type: BlockType) => {
      if (!menuState.blockId) return;

      const location = findBlockLocation(menuState.blockId, blocks);
      if (!location.block) return;

      const block = location.block;
      let newText = block.text;

      // Remove trigger characters
      if (menuState.triggerType === 'slash') {
        const slashIndex = newText.lastIndexOf('/');
        newText = newText.slice(0, slashIndex) + newText.slice(slashIndex + 1 + menuState.filter.length);
        
        // Immediately clear the slash from the DOM element
        const element = editorRef.current?.querySelector(`[data-block-id="${menuState.blockId}"]`) as HTMLElement;
        if (element) {
          element.innerHTML = '';
          element.textContent = '';
        }
      }

      const isColumnType = type === BLOCK_TYPE_COLUMNS2 || type === BLOCK_TYPE_COLUMNS3 || type === BLOCK_TYPE_COLUMNS4 || type === BLOCK_TYPE_COLUMNS5;
      const columnCount = type === BLOCK_TYPE_COLUMNS2 ? 2 : 
                         type === BLOCK_TYPE_COLUMNS3 ? 3 : 
                         type === BLOCK_TYPE_COLUMNS4 ? 4 : 
                         type === BLOCK_TYPE_COLUMNS5 ? 5 : 0;
      
      const isToggleHeading = type === BLOCK_TYPE_TOGGLE_H1 || type === BLOCK_TYPE_TOGGLE_H2 || type === BLOCK_TYPE_TOGGLE_H3 || type === BLOCK_TYPE_TOGGLE_LIST;
      
      const newBlocks = [...blocks];

      // Preserve child blocks from callout/toggle block if present
      const childrenToPreserve = block.children && block.children.length > 0 ? [...block.children] : null;

      // Create updated block
      const updatedBlock = {
        ...block,
        type,
        text: type === BLOCK_TYPE_IMAGE || type === BLOCK_TYPE_VIDEO || type === BLOCK_TYPE_AUDIO || type === BLOCK_TYPE_DIVIDER || type === BLOCK_TYPE_BOOKMARK || type === BLOCK_TYPE_EMBED || isColumnType || type === BLOCK_TYPE_CALLOUT ? '' : newText,
        ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
        ...(type === BLOCK_TYPE_IMAGE ? { imageUrl: '', imageFile: '' } : {}),
        ...(type === BLOCK_TYPE_VIDEO ? { videoUrl: '' } : {}),
        ...(type === BLOCK_TYPE_AUDIO ? { audioUrl: '' } : {}),
        ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
        ...(type === BLOCK_TYPE_BOOKMARK ? { url: '' } : {}),
        ...(type === BLOCK_TYPE_EMBED ? { url: '' } : {}),
        ...(type === BLOCK_TYPE_CALLOUT ? { 
          emoji: '💡', 
          children: [createBlock(BLOCK_TYPE_PARAGRAPH, newText)]
        } : {}),
        ...(isColumnType ? { 
          columns: Array.from({ length: columnCount }, () => [
            createBlock(BLOCK_TYPE_PARAGRAPH, '')
          ])
        } : {}),
        ...(isToggleHeading ? {
          isOpen: true,
          children: []
        } : {}),
        // Clear old properties for blocks that do not support them
        ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
      };

      if (location.isNested) {
        const parentBlock = newBlocks[location.parentBlockIndex];
        
        if (location.isToggleChild) {
          // Update child block in toggle heading
          const children = [...(parentBlock.children || [])];
          children[location.blockIndex] = updatedBlock;
          
          // For divider, create a new paragraph after it
          if (type === BLOCK_TYPE_DIVIDER) {
            children.splice(location.blockIndex + 1, 0, createBlock(BLOCK_TYPE_PARAGRAPH, ''));
          }
          
          // If converting callout/toggle with children to another type, append children as following blocks
          if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
            children.splice(location.blockIndex + 1, 0, ...childrenToPreserve);
          }
          
          newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
        } else if (parentBlock.columns) {
          // Update nested block in column
          const columnBlocks = [...parentBlock.columns[location.columnIndex]];
          columnBlocks[location.blockIndex] = updatedBlock;
          
          // For divider, create a new paragraph after it
          if (type === BLOCK_TYPE_DIVIDER) {
            columnBlocks.splice(location.blockIndex + 1, 0, createBlock(BLOCK_TYPE_PARAGRAPH, ''));
          }
          
          // If converting callout/toggle with children to another type, append children as following blocks
          if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
            columnBlocks.splice(location.blockIndex + 1, 0, ...childrenToPreserve);
          }
          
          const newColumns = [...parentBlock.columns];
          newColumns[location.columnIndex] = columnBlocks;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
        }
      } else {
        // Update main block
        newBlocks[location.blockIndex] = updatedBlock;
        
        // For divider, create a new paragraph after it
        if (type === BLOCK_TYPE_DIVIDER) {
          newBlocks.splice(location.blockIndex + 1, 0, createBlock(BLOCK_TYPE_PARAGRAPH, ''));
        }
        
        // If converting callout/toggle with children to another type, append children as following blocks
        if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
          newBlocks.splice(location.blockIndex + 1, 0, ...childrenToPreserve);
        }
      }

      handleChange(newBlocks);
      setMenuState({ visible: false, position: null, blockId: null, filter: '', triggerType: null, isInsideToggle: false, isNested: false });

      // Restore focus
      setTimeout(() => {
        // For divider, focus on the next block
        if (type === BLOCK_TYPE_DIVIDER) {
          const allBlockElements = editorRef.current?.querySelectorAll('[data-block-id]') ?? [];
          const currentElements = Array.from(allBlockElements);
          const currentIndex = currentElements.findIndex(el => el.getAttribute('data-block-id') === menuState.blockId);
          const nextElement = currentElements[currentIndex + 1] as HTMLElement;
          if (nextElement) {
            nextElement.focus();
            setCaretToStart(nextElement);
          }
        } else if (isColumnType) {
          // For columns, focus on the first block of the first column
          const firstColumnFirstBlockId = updatedBlock.columns?.[0]?.[0]?.id;
          if (firstColumnFirstBlockId) {
            const element = editorRef.current?.querySelector(`[data-block-id="${firstColumnFirstBlockId}"]`) as HTMLElement;
            if (element) {
              element.focus();
              setCaretToStart(element);
            }
          }
        } else if (type === BLOCK_TYPE_CALLOUT) {
          // For callout, focus on the first child block
          const firstChildBlockId = updatedBlock.children?.[0]?.id;
          if (firstChildBlockId) {
            const element = editorRef.current?.querySelector(`[data-block-id="${firstChildBlockId}"]`) as HTMLElement;
            if (element) {
              element.focus();
              setCaretToEnd(element);
            }
          }
        } else {
          const element = editorRef.current?.querySelector(`[data-block-id="${menuState.blockId}"]`) as HTMLElement;
          if (element) {
            element.focus();
            if (type === BLOCK_TYPE_CODE || type === BLOCK_TYPE_IMAGE) {
              setCaretToStart(element);
            } else {
              setCaretToEnd(element);
            }
          }
        }
      }, 0);
    },
    [blocks, menuState, handleChange, editorRef, setMenuState]
  );

  const handleExerciseMenuSelect = useCallback(
    (exerciseTypeId: number, exerciseTypeName: string) => {
      if (!menuState.blockId) return;

      const location = findBlockLocation(menuState.blockId, blocks);
      if (!location.block) return;

      const block = location.block;

      // Remove slash trigger characters
      if (menuState.triggerType === 'slash') {
        const element = editorRef.current?.querySelector(`[data-block-id="${menuState.blockId}"]`) as HTMLElement;
        if (element) {
          element.innerHTML = '';
          element.textContent = '';
        }
      }

      const initialData = getInitialExerciseData(exerciseTypeId);
      const newBlocks = [...blocks];

      const updatedBlock: Block = {
        ...block,
        type: BLOCK_TYPE_EXERCISE as BlockType,
        text: '',
        exerciseTypeId,
        exerciseTypeName,
        exerciseData: initialData,
        exerciseName: exerciseTypeName,
        children: undefined,
      };

      if (location.isNested) {
        const parentBlock = newBlocks[location.parentBlockIndex];

        if (location.isToggleChild) {
          const children = [...(parentBlock.children || [])];
          children[location.blockIndex] = updatedBlock;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
        } else if (parentBlock.columns) {
          const columnBlocks = [...parentBlock.columns[location.columnIndex]];
          columnBlocks[location.blockIndex] = updatedBlock;
          const newColumns = [...parentBlock.columns];
          newColumns[location.columnIndex] = columnBlocks;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
        }
      } else {
        newBlocks[location.blockIndex] = updatedBlock;
      }

      handleChange(newBlocks);
      setMenuState({ visible: false, position: null, blockId: null, filter: '', triggerType: null, isInsideToggle: false, isNested: false });
    },
    [blocks, menuState, handleChange, editorRef, setMenuState]
  );

  const handleCheckToggle = useCallback(
    (id: string, checked: boolean) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const updatedBlock = { ...location.block, checked };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleImageUpload = useCallback(
    async (id: string, fileOrUrl: File | string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const block = location.block;

      if (typeof fileOrUrl === 'string') {
        // Handle URL - check block type
        let updatedBlock: Block;
        if (block.type === BLOCK_TYPE_BOOKMARK) {
          updatedBlock = { ...block, url: fileOrUrl };
        } else if (block.type === BLOCK_TYPE_EMBED) {
          updatedBlock = { ...block, url: fileOrUrl };
        } else {
          // For image blocks - clear drawing data when replacing image
          updatedBlock = { ...block, imageFile: fileOrUrl, imageUrl: fileOrUrl, drawingData: undefined };
        }
        
        const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
        handleChange(newBlocks);
      } else {
        // Handle file upload (for images) - upload to server
        setUploadingBlockIds(prev => new Set(prev).add(id));
        try {
          const uploadResult = publicHash
            ? await imagesApi.uploadImagePublic({ file: fileOrUrl, publicHash })
            : await imagesApi.uploadImage({ file: fileOrUrl });
          
          // Get current location again after async operation
          const currentLocation = findBlockLocation(id, blocks);
          if (!currentLocation.block) return;
          
          const imageUrl = imagesApi.getImageUrl(uploadResult.filename);
          // Clear drawing data when replacing image
          const updatedBlock = { ...currentLocation.block, imageFile: imageUrl, imageUrl, drawingData: undefined };
          const newBlocks = updateBlockAtLocation(blocks, currentLocation, updatedBlock);
          handleChange(newBlocks);
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, 'editor.failedToUploadImage'));
        } finally {
          setUploadingBlockIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
    },
    [blocks, handleChange, updateBlockAtLocation, publicHash]
  );

  const handleImageDelete = useCallback(
    (id: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const updatedBlock = { 
        ...location.block, 
        type: BLOCK_TYPE_PARAGRAPH as BlockType, 
        text: '', 
        imageFile: undefined, 
        imageUrl: undefined, 
        imageWidth: undefined, 
        imageHeight: undefined,
        drawingData: undefined // Clear drawing data
      };
      
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleImageResize = useCallback(
    (id: string, width: number, height: number) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      let updatedBlock: Block;
      
      if (location.block.type === BLOCK_TYPE_IMAGE) {
        updatedBlock = { ...location.block, imageWidth: width, imageHeight: height };
      } else if (location.block.type === BLOCK_TYPE_VIDEO) {
        updatedBlock = { ...location.block, videoWidth: width, videoHeight: height };
      } else if (location.block.type === BLOCK_TYPE_EMBED) {
        updatedBlock = { ...location.block, embedWidth: width, embedHeight: height };
      } else {
        return;
      }
      
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  // Image alignment change handler
  const handleImageAlignmentChange = useCallback(
    (id: string, alignment: 'left' | 'center' | 'right') => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      if (location.block.type !== BLOCK_TYPE_IMAGE) return;
      
      const updatedBlock = { ...location.block, imageAlignment: alignment };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  // Block update handler (for updating arbitrary block properties)
  const handleBlockUpdate = useCallback(
    (id: string, updatedBlock: Block) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleDrawingUpdate = useCallback(
    (id: string, drawingData: any) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      if (location.block.type !== BLOCK_TYPE_IMAGE) return;
      
      const updatedBlock = { ...location.block, drawingData };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleVideoUpload = useCallback(
    async (id: string, file: File) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      try {
        setVideoUploadProgress((prev) => ({ ...prev, [id]: 0 }));
        const uploadedMedia = await mediaApi.uploadVideo(
          file,
          'editor',
          undefined,
          (percent) => setVideoUploadProgress((prev) => ({ ...prev, [id]: percent })),
        );
        
        const currentLocation = findBlockLocation(id, blocks);
        if (!currentLocation.block) return;
        
        const videoUrl = mediaApi.getMediaUrl(uploadedMedia.filename);
        const updatedBlock = { ...currentLocation.block, videoUrl };
        const newBlocks = updateBlockAtLocation(blocks, currentLocation, updatedBlock);
        handleChange(newBlocks);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'editor.failedToUploadVideo'));
      } finally {
        setVideoUploadProgress((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleVideoDelete = useCallback(
    (id: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;

      const videoUrl = location.block.videoUrl;
      if (videoUrl) {
        const parts = videoUrl.split('/');
        const filename = parts[parts.length - 1];
        if (filename) {
          mediaApi.deleteMediaByFilename(filename).catch(() => {});
        }
      }
      
      const updatedBlock = { 
        ...location.block, 
        type: BLOCK_TYPE_PARAGRAPH as BlockType, 
        text: '', 
        videoUrl: undefined,
        videoWidth: undefined,
        videoHeight: undefined,
        videoAlignment: undefined,
        caption: undefined,
      };
      
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleVideoAlignmentChange = useCallback(
    (id: string, alignment: 'left' | 'center' | 'right') => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      if (location.block.type !== BLOCK_TYPE_VIDEO) return;
      
      const updatedBlock = { ...location.block, videoAlignment: alignment };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleAudioUpload = useCallback(
    async (id: string, file: File) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      try {
        const uploadedMedia = await mediaApi.uploadAudio(file, 'editor');
        
        const currentLocation = findBlockLocation(id, blocks);
        if (!currentLocation.block) return;
        
        const audioUrl = mediaApi.getMediaUrl(uploadedMedia.filename);
        const updatedBlock = { ...currentLocation.block, audioUrl };
        const newBlocks = updateBlockAtLocation(blocks, currentLocation, updatedBlock);
        handleChange(newBlocks);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'editor.failedToUploadAudio'));
      }
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handleAudioDelete = useCallback(
    (id: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;

      const audioUrl = location.block.audioUrl;
      if (audioUrl) {
        const parts = audioUrl.split('/');
        const filename = parts[parts.length - 1];
        if (filename) {
          mediaApi.deleteMediaByFilename(filename).catch(() => {});
        }
      }
      
      const updatedBlock = { 
        ...location.block, 
        type: BLOCK_TYPE_PARAGRAPH as BlockType, 
        text: '',
        audioUrl: undefined,
        caption: undefined,
      };
      
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handlePdfUpload = useCallback(
    async (id: string, file: File) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      try {
        const uploadedMedia = await mediaApi.uploadPdf(file, 'editor');
        
        const currentLocation = findBlockLocation(id, blocks);
        if (!currentLocation.block) return;
        
        const pdfUrl = mediaApi.getMediaUrl(uploadedMedia.filename);
        const updatedBlock = { ...currentLocation.block, pdfUrl };
        const newBlocks = updateBlockAtLocation(blocks, currentLocation, updatedBlock);
        handleChange(newBlocks);
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, 'editor.failedToUploadPdf'));
      }
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handlePdfDelete = useCallback(
    (id: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;

      const pdfUrl = location.block.pdfUrl;
      if (pdfUrl) {
        const parts = pdfUrl.split('/');
        const filename = parts[parts.length - 1];
        if (filename) {
          mediaApi.deleteMediaByFilename(filename).catch(() => {});
        }
      }
      
      const updatedBlock = { 
        ...location.block, 
        type: BLOCK_TYPE_PARAGRAPH as BlockType, 
        text: '', 
        pdfUrl: undefined,
        pdfWidth: undefined,
        pdfHeight: undefined,
        pdfAlignment: undefined,
      };
      
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handlePdfResize = useCallback(
    (id: string, width: number, height: number) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const updatedBlock = { ...location.block, pdfWidth: width, pdfHeight: height };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handlePdfAlignmentChange = useCallback(
    (id: string, alignment: 'left' | 'center' | 'right') => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      if (location.block.type !== BLOCK_TYPE_PDF) return;
      
      const updatedBlock = { ...location.block, pdfAlignment: alignment };
      const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
      handleChange(newBlocks);
    },
    [blocks, handleChange, updateBlockAtLocation]
  );

  const handlePdfDuplicate = useCallback(
    (id: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const newBlock = createBlock(BLOCK_TYPE_PDF, '');
      newBlock.pdfUrl = location.block.pdfUrl;
      newBlock.pdfWidth = location.block.pdfWidth;
      newBlock.pdfHeight = location.block.pdfHeight;
      newBlock.pdfAlignment = location.block.pdfAlignment || 'left';
      
      const newBlocks = [...blocks];
      
      if (location.isNested) {
        if (location.isToggleChild) {
          const parentBlock = newBlocks[location.parentBlockIndex];
          const children = [...(parentBlock.children || [])];
          children.splice(location.blockIndex + 1, 0, newBlock);
          newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
        } else {
          const parentBlock = newBlocks[location.parentBlockIndex];
          const columnBlocks = [...(parentBlock.columns?.[location.columnIndex] || [])];
          columnBlocks.splice(location.blockIndex + 1, 0, newBlock);
          
          const newColumns = [...(parentBlock.columns || [])];
          newColumns[location.columnIndex] = columnBlocks;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
        }
      } else {
        newBlocks.splice(location.blockIndex + 1, 0, newBlock);
      }
      
      handleChange(newBlocks);
    },
    [blocks, handleChange]
  );

  const handleVideoDuplicate = useCallback(
    (id: string) => {
      const location = findBlockLocation(id, blocks);
      if (!location.block) return;
      
      const newBlock = {
        ...location.block,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      if (location.isNested) {
        const newBlocks = [...blocks];
        const parentBlock = newBlocks[location.parentBlockIndex];
        
        if (location.isToggleChild && parentBlock.children) {
          const children = [...parentBlock.children];
          children.splice(location.blockIndex + 1, 0, newBlock);
          newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
        } else if (parentBlock.columns) {
          const columnBlocks = [...parentBlock.columns[location.columnIndex]];
          columnBlocks.splice(location.blockIndex + 1, 0, newBlock);
          
          const newColumns = [...parentBlock.columns];
          newColumns[location.columnIndex] = columnBlocks;
          newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
        }
        
        handleChange(newBlocks);
      } else {
        const newBlocks = [...blocks];
        newBlocks.splice(location.blockIndex + 1, 0, newBlock);
        handleChange(newBlocks);
      }
    },
    [blocks, handleChange]
  );

  const handlePlusClick = useCallback((blockId: string, _element: HTMLElement) => {
    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    
    // Check whether the current block is empty
    const isBlockEmpty = !block.text || block.text.trim() === '';

    // If block is empty, just open menu for current block
    if (isBlockEmpty) {
      setTimeout(() => {
        const currentBlockElement = editorRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
        if (currentBlockElement) {
          currentBlockElement.focus();
          setCaretToStart(currentBlockElement);

        const rect = currentBlockElement.getBoundingClientRect();
        setMenuState({
          visible: true,
          position: { x: rect.left, y: rect.top },
          blockId: blockId,
          filter: '',
          triggerType: 'slash',
          isInsideToggle: location.isToggleChild || false,
          isNested: location.isNested,
        });
        }
      }, 0);
      return;
    }

    // If block is not empty, create a new block below
    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [...blocks];

    if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      if (location.isToggleChild) {
        // Add new block after current block in toggle heading children
        const children = [...(parentBlock.children || [])];
        children.splice(location.blockIndex + 1, 0, newBlock);
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        // Add new block after current block in column
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks.splice(location.blockIndex + 1, 0, newBlock);
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      // Add new block after current block in main blocks
      newBlocks.splice(location.blockIndex + 1, 0, newBlock);
    }

    handleChange(newBlocks);

    setTimeout(() => {
      const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);

        const rect = newBlockElement.getBoundingClientRect();
        setMenuState({
          visible: true,
          position: { x: rect.left, y: rect.top },
          blockId: newBlock.id,
          filter: '',
          triggerType: 'slash',
          isInsideToggle: location.isToggleChild || false,
          isNested: location.isNested,
        });
      }
    }, 0);
  }, [blocks, handleChange, editorRef, setMenuState]);

  const cleanupBlockMedia = useCallback((block: Block) => {
    const url = block.videoUrl || block.audioUrl || block.pdfUrl;
    if (url) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      if (filename) {
        mediaApi.deleteMediaByFilename(filename).catch(() => {});
      }
    }
  }, []);

  const handleBlockDelete = useCallback(() => {
    if (!actionMenu.blockId) return;

    const location = findBlockLocation(actionMenu.blockId, blocks);
    if (!location.block) return;

    // Check whether clicked block is part of selection
    const isBlockSelected = selectedBlockIds.has(actionMenu.blockId);
    const shouldDeleteMultiple = isBlockSelected && selectedBlockIds.size > 1;

    let newBlocks: Block[];
    
    if (shouldDeleteMultiple) {
      blocks.filter((b) => selectedBlockIds.has(b.id)).forEach(cleanupBlockMedia);
      newBlocks = blocks.filter((b) => !selectedBlockIds.has(b.id));
      
      // Clear selection after deletion
      setSelectedBlockIds(new Set());
    } else if (location.isNested) {
      cleanupBlockMedia(location.block);
      newBlocks = [...blocks];
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children.splice(location.blockIndex, 1);
        
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks.splice(location.blockIndex, 1);
        
        if (columnBlocks.length === 0) {
          columnBlocks.push(createBlock(BLOCK_TYPE_PARAGRAPH, ''));
        }
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      cleanupBlockMedia(location.block);
      newBlocks = [...blocks];
      newBlocks.splice(location.blockIndex, 1);
      
      // Keep at least one empty block
      if (newBlocks.length === 0) {
        newBlocks = [createBlock(BLOCK_TYPE_PARAGRAPH, '')];
      }
    }

    const scrollY = window.scrollY;
    const focusTargetId = newBlocks[Math.min(location.blockIndex, newBlocks.length - 1)]?.id;

    handleChange(newBlocks);

    setTimeout(() => {
      if (focusTargetId) {
        const targetEl = editorRef.current?.querySelector(`[data-block-id="${focusTargetId}"]`) as HTMLElement;
        if (targetEl) {
          targetEl.focus({ preventScroll: true });
          setCaretToEnd(targetEl);
        }
      }
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }, 0);
  }, [actionMenu.blockId, blocks, handleChange, editorRef, selectedBlockIds, setSelectedBlockIds]);

  const handleBlockDuplicate = useCallback(() => {
    if (!actionMenu.blockId) return;

    const location = findBlockLocation(actionMenu.blockId, blocks);
    if (!location.block) return;

    const isBlockSelected = selectedBlockIds.has(actionMenu.blockId);
    const shouldDuplicateMultiple = isBlockSelected && selectedBlockIds.size > 1;

    const editorRoot = editorRef.current;
    const scrollY = window.scrollY;
    let preserveCaret: { blockId: string; offset: number } | null = null;
    if (editorRoot) {
      const active = document.activeElement;
      if (active && editorRoot.contains(active)) {
        const host = active.closest('[data-block-id]');
        if (host instanceof HTMLElement) {
          const bid = host.getAttribute('data-block-id');
          if (bid) {
            preserveCaret = { blockId: bid, offset: getCaretOffset(host) };
          }
        }
      }
    }

    const newBlocks = [...blocks];
    
    if (shouldDuplicateMultiple) {
      const selectedIndices = blocks
        .map((b, i) => selectedBlockIds.has(b.id) ? i : -1)
        .filter(i => i !== -1);
      
      const lastSelectedIndex = Math.max(...selectedIndices);
      
      const duplicatedBlocks = selectedIndices.map(idx => ({
        ...blocks[idx],
        id: `block-${Date.now()}-${Math.random()}-${idx}`
      }));

      newBlocks.splice(lastSelectedIndex + 1, 0, ...duplicatedBlocks);
      
      setSelectedBlockIds(new Set());
    } else if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      const duplicatedBlock = { ...location.block, id: `block-${Date.now()}-${Math.random()}` };
      
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children.splice(location.blockIndex + 1, 0, duplicatedBlock);
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks.splice(location.blockIndex + 1, 0, duplicatedBlock);
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      const duplicatedBlock = { ...location.block, id: `block-${Date.now()}-${Math.random()}` };
      newBlocks.splice(location.blockIndex + 1, 0, duplicatedBlock);
    }
    
    handleChange(newBlocks);

    const topLevelDuplicateId =
      !shouldDuplicateMultiple && !location.isNested ? newBlocks[location.blockIndex + 1]?.id : null;
    const focusDuplicate =
      Boolean(topLevelDuplicateId && preserveCaret?.blockId === actionMenu.blockId);

    setTimeout(() => {
      const root = editorRef.current;
      if (topLevelDuplicateId && (focusDuplicate || !preserveCaret)) {
        const duplicatedElement = root?.querySelector(
          `[data-block-id="${topLevelDuplicateId}"]`
        ) as HTMLElement | null;
        if (duplicatedElement) {
          duplicatedElement.focus({ preventScroll: true });
          setCaretToEnd(duplicatedElement);
        }
      } else if (preserveCaret && root) {
        const el = root.querySelector(`[data-block-id="${preserveCaret.blockId}"]`) as HTMLElement | null;
        if (el) {
          el.focus({ preventScroll: true });
          setCaretToCharacterOffset(el, preserveCaret.offset);
        }
      }
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    }, 0);
  }, [actionMenu.blockId, blocks, handleChange, editorRef, selectedBlockIds, setSelectedBlockIds]);

  const handleBlockComment = useCallback(() => {
    if (!actionMenu.blockId) return;
    
  }, [actionMenu.blockId]);

  const handleBlockTurnInto = useCallback((type: BlockType) => {
    if (!actionMenu.blockId) return;

    const location = findBlockLocation(actionMenu.blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    const newBlocks = [...blocks];
    
    // Use selectedBlockIds from actionMenu if present (for nested blocks),
    // otherwise use selectedBlockIds from parent editor
    const effectiveSelectedIds = actionMenu.selectedBlockIds || selectedBlockIds;
    const isBlockSelected = effectiveSelectedIds.has(actionMenu.blockId);
    const shouldTransformMultiple = isBlockSelected && effectiveSelectedIds.size > 1;
    
    const isColumnType = type === BLOCK_TYPE_COLUMNS2 || type === BLOCK_TYPE_COLUMNS3 || type === BLOCK_TYPE_COLUMNS4 || type === BLOCK_TYPE_COLUMNS5;
    const columnCount = type === BLOCK_TYPE_COLUMNS2 ? 2 : 
                       type === BLOCK_TYPE_COLUMNS3 ? 3 : 
                       type === BLOCK_TYPE_COLUMNS4 ? 4 : 
                       type === BLOCK_TYPE_COLUMNS5 ? 5 : 0;
    
    if (shouldTransformMultiple) {
      effectiveSelectedIds.forEach((selectedId) => {
        const selectedLocation = findBlockLocation(selectedId, newBlocks);
        if (!selectedLocation.block) return;
        
        const selectedBlock = selectedLocation.block;
        const isToggleHeading = type === BLOCK_TYPE_TOGGLE_H1 || type === BLOCK_TYPE_TOGGLE_H2 || type === BLOCK_TYPE_TOGGLE_H3 || type === BLOCK_TYPE_TOGGLE_LIST;
        
        // Preserve child blocks from callout/toggle block if present
        const childrenToPreserve = selectedBlock.children && selectedBlock.children.length > 0 ? [...selectedBlock.children] : null;
        
        const updatedBlock = {
          ...selectedBlock,
          type,
          text: type === BLOCK_TYPE_IMAGE || type === BLOCK_TYPE_DIVIDER || type === BLOCK_TYPE_BOOKMARK || type === BLOCK_TYPE_EMBED || isColumnType || type === BLOCK_TYPE_CALLOUT ? '' : selectedBlock.text,
          ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
          ...(type === BLOCK_TYPE_IMAGE ? { imageUrl: '', imageFile: '' } : {}),
          ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
          ...(type === BLOCK_TYPE_BOOKMARK ? { url: '' } : {}),
          ...(type === BLOCK_TYPE_EMBED ? { url: '' } : {}),
          ...(type === BLOCK_TYPE_CALLOUT ? { 
            emoji: '💡', 
            children: [createBlock(BLOCK_TYPE_PARAGRAPH, selectedBlock.text)]
          } : {}),
          ...(isColumnType ? { 
            columns: Array.from({ length: columnCount }, () => [
              createBlock(BLOCK_TYPE_PARAGRAPH, '')
            ])
          } : {}),
          ...(isToggleHeading ? {
            isOpen: true,
            children: []
          } : {}),
          // Clear old properties for blocks that do not support them
          ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
        };
        
        if (selectedLocation.isNested) {
          const parentBlock = newBlocks[selectedLocation.parentBlockIndex];
          
          if (selectedLocation.isToggleChild) {
            // Update child block in toggle heading/list
            const children = [...(parentBlock.children || [])];
            children[selectedLocation.blockIndex] = updatedBlock;
            
            // If converting callout/toggle with children to another type, append children as following blocks
            if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
              children.splice(selectedLocation.blockIndex + 1, 0, ...childrenToPreserve);
            }
            
            newBlocks[selectedLocation.parentBlockIndex] = { ...parentBlock, children };
          } else if (parentBlock.columns) {
            // Update nested block in column
            const columnBlocks = [...parentBlock.columns[selectedLocation.columnIndex]];
            columnBlocks[selectedLocation.blockIndex] = updatedBlock;
            
            // If converting callout/toggle with children to another type, append children as following blocks
            if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
              columnBlocks.splice(selectedLocation.blockIndex + 1, 0, ...childrenToPreserve);
            }
            
            const newColumns = [...parentBlock.columns];
            newColumns[selectedLocation.columnIndex] = columnBlocks;
            newBlocks[selectedLocation.parentBlockIndex] = { ...parentBlock, columns: newColumns };
          }
        } else {
          // Top-level block
          newBlocks[selectedLocation.blockIndex] = updatedBlock;
          
          // If converting callout/toggle with children to another type, append children as following blocks
          if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
            newBlocks.splice(selectedLocation.blockIndex + 1, 0, ...childrenToPreserve);
          }
        }
      });
      
      setSelectedBlockIds(new Set());
    } else if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      const isToggleHeading = type === BLOCK_TYPE_TOGGLE_H1 || type === BLOCK_TYPE_TOGGLE_H2 || type === BLOCK_TYPE_TOGGLE_H3 || type === BLOCK_TYPE_TOGGLE_LIST;
      
      // Preserve child blocks from callout/toggle block if present
      const childrenToPreserve = block.children && block.children.length > 0 ? [...block.children] : null;
      
      if (location.isToggleChild) {
        // Update child block in toggle heading
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = {
          ...block,
          type,
          text: type === BLOCK_TYPE_IMAGE || type === BLOCK_TYPE_DIVIDER || type === BLOCK_TYPE_BOOKMARK || type === BLOCK_TYPE_EMBED || isColumnType || type === BLOCK_TYPE_CALLOUT ? '' : block.text,
          ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
          ...(type === BLOCK_TYPE_IMAGE ? { imageUrl: '', imageFile: '' } : {}),
          ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
          ...(type === BLOCK_TYPE_BOOKMARK ? { url: '' } : {}),
          ...(type === BLOCK_TYPE_EMBED ? { url: '' } : {}),
          ...(type === BLOCK_TYPE_CALLOUT ? { 
            emoji: '💡', 
            children: [createBlock(BLOCK_TYPE_PARAGRAPH, block.text)]
          } : {}),
          ...(isColumnType ? { 
            columns: Array.from({ length: columnCount }, () => [
              createBlock(BLOCK_TYPE_PARAGRAPH, '')
            ])
          } : {}),
          ...(isToggleHeading ? {
            isOpen: true,
            children: []
          } : {}),
          // Clear old properties for blocks that do not support them
          ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
        };
        
        // If converting callout/toggle with children to another type, append children as following blocks
        if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
          children.splice(location.blockIndex + 1, 0, ...childrenToPreserve);
        }
        
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        // Update nested block in column
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = {
          ...block,
          type,
          text: type === BLOCK_TYPE_IMAGE || type === BLOCK_TYPE_DIVIDER || type === BLOCK_TYPE_BOOKMARK || type === BLOCK_TYPE_EMBED || isColumnType || type === BLOCK_TYPE_CALLOUT ? '' : block.text,
          ...(type === BLOCK_TYPE_TODO ? { checked: false } : {}),
          ...(type === BLOCK_TYPE_IMAGE ? { imageUrl: '', imageFile: '' } : {}),
          ...(type === BLOCK_TYPE_CODE ? { language: 'javascript' } : {}),
          ...(type === BLOCK_TYPE_BOOKMARK ? { url: '' } : {}),
          ...(type === BLOCK_TYPE_EMBED ? { url: '' } : {}),
          ...(type === BLOCK_TYPE_CALLOUT ? { 
            emoji: '💡', 
            children: [createBlock(BLOCK_TYPE_PARAGRAPH, block.text)]
          } : {}),
          ...(isColumnType ? { 
            columns: Array.from({ length: columnCount }, () => [
              createBlock(BLOCK_TYPE_PARAGRAPH, '')
            ])
          } : {}),
          ...(isToggleHeading ? {
            isOpen: true,
            children: []
          } : {}),
          // Clear old properties for blocks that do not support them
          ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
        };
        
        // If converting callout/toggle with children to another type, append children as following blocks
        if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
          columnBlocks.splice(location.blockIndex + 1, 0, ...childrenToPreserve);
        }
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      const isToggleHeading = type === BLOCK_TYPE_TOGGLE_H1 || type === BLOCK_TYPE_TOGGLE_H2 || type === BLOCK_TYPE_TOGGLE_H3 || type === BLOCK_TYPE_TOGGLE_LIST;
      
      // Preserve child blocks from callout/toggle block if present
      const childrenToPreserve = block.children && block.children.length > 0 ? [...block.children] : null;
      
      newBlocks[location.blockIndex] = {
        ...block,
        type,
        text: type === 'image' || type === 'divider' || type === 'bookmark' || type === 'embed' || isColumnType || type === BLOCK_TYPE_CALLOUT ? '' : block.text,
        ...(type === 'todo' ? { checked: false } : {}),
        ...(type === 'image' ? { imageUrl: '', imageFile: '' } : {}),
        ...(type === 'code' ? { language: 'javascript' } : {}),
        ...(type === 'bookmark' ? { url: '' } : {}),
        ...(type === 'embed' ? { url: '' } : {}),
        ...(type === BLOCK_TYPE_CALLOUT ? { 
          emoji: '💡', 
          children: [createBlock(BLOCK_TYPE_PARAGRAPH, block.text)]
        } : {}),
        ...(isColumnType ? { 
          columns: Array.from({ length: columnCount }, () => [
            createBlock(BLOCK_TYPE_PARAGRAPH, '')
          ])
        } : {}),
        ...(isToggleHeading ? {
          isOpen: true,
          children: []
        } : {}),
        // Clear old properties for blocks that do not support them
        ...(!isToggleHeading && type !== BLOCK_TYPE_CALLOUT ? { children: undefined } : {}),
      };
      
      // For divider, create a new paragraph after it (single transformation only)
      if (type === BLOCK_TYPE_DIVIDER && !shouldTransformMultiple) {
        newBlocks.splice(location.blockIndex + 1, 0, createBlock(BLOCK_TYPE_PARAGRAPH, ''));
      }
      
      // If converting callout/toggle with children to another type, append children as following blocks
      if (childrenToPreserve && !isToggleHeading && type !== BLOCK_TYPE_CALLOUT) {
        newBlocks.splice(location.blockIndex + 1, 0, ...childrenToPreserve);
      }
    }

    handleChange(newBlocks);

    // Focus on block
    setTimeout(() => {
      if (type === BLOCK_TYPE_DIVIDER && !shouldTransformMultiple && !location.isNested) {
        const allBlockElements = editorRef.current?.querySelectorAll('[data-block-id]') ?? [];
        const nextElement = allBlockElements[location.blockIndex + 1] as HTMLElement;
        if (nextElement) {
          nextElement.focus();
          setCaretToStart(nextElement);
        }
      } else if (!shouldTransformMultiple) {
        const element = editorRef.current?.querySelector(`[data-block-id="${actionMenu.blockId}"]`) as HTMLElement;
        if (element) {
          element.focus();
          if (type === BLOCK_TYPE_CODE || type === BLOCK_TYPE_IMAGE) {
            setCaretToStart(element);
          } else {
            setCaretToEnd(element);
          }
        }
      }
    }, 0);
  }, [actionMenu.blockId, blocks, handleChange, editorRef, selectedBlockIds, setSelectedBlockIds]);

  const handleBlockColorChange = useCallback((textColor?: TextColor, backgroundColor?: BackgroundColor) => {
    if (!actionMenu.blockId) return;

    const location = findBlockLocation(actionMenu.blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    const newBlocks = [...blocks];

    const nextTextForBlock = (b: Block): string | undefined => {
      if (!textColor || b.type === BLOCK_TYPE_CODE) return undefined;
      return stripInlineTextColorsFromHtml(b.text || '');
    };
    
    const isBlockSelected = selectedBlockIds.has(actionMenu.blockId);
    const shouldColorMultiple = isBlockSelected && selectedBlockIds.size > 1;
    
    if (shouldColorMultiple) {
      selectedBlockIds.forEach((selectedId) => {
        const idx = newBlocks.findIndex(b => b.id === selectedId);
        if (idx !== -1) {
          const b = newBlocks[idx];
          const stripped = nextTextForBlock(b);
          newBlocks[idx] = {
            ...b,
            ...(stripped !== undefined ? { text: stripped } : {}),
            ...(textColor ? { textColor: textColor } : {}),
            ...(backgroundColor ? { backgroundColor: backgroundColor } : {}),
          };
        }
      });
      
      setSelectedBlockIds(new Set());
    } else if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      const stripped = nextTextForBlock(block);
      
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = {
          ...block,
          ...(stripped !== undefined ? { text: stripped } : {}),
          ...(textColor ? { textColor: textColor } : {}),
          ...(backgroundColor ? { backgroundColor: backgroundColor } : {}),
        };
        
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = {
          ...block,
          ...(stripped !== undefined ? { text: stripped } : {}),
          ...(textColor ? { textColor: textColor } : {}),
          ...(backgroundColor ? { backgroundColor: backgroundColor } : {}),
        };
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      const stripped = nextTextForBlock(block);
      newBlocks[location.blockIndex] = {
        ...block,
        ...(stripped !== undefined ? { text: stripped } : {}),
        ...(textColor ? { textColor: textColor } : {}),
        ...(backgroundColor ? { backgroundColor: backgroundColor } : {}),
      };
    }

    handleChange(newBlocks);
  }, [actionMenu.blockId, blocks, handleChange, selectedBlockIds, setSelectedBlockIds]);

  const handleBlockAlignmentChange = useCallback((alignment: 'left' | 'center' | 'right') => {
    if (!actionMenu.blockId) return;
    
    const location = findBlockLocation(actionMenu.blockId, blocks);
    if (!location.block) return;
    
    const block = location.block;
    const newBlocks = [...blocks];
    
    if (selectedBlockIds.size > 0) {
      selectedBlockIds.forEach((selectedId) => {
        const selectedLocation = findBlockLocation(selectedId, blocks);
        if (!selectedLocation.block) return;
        
        const selectedBlock = selectedLocation.block;
        
        if (selectedLocation.isNested) {
          const parentBlock = newBlocks[selectedLocation.parentBlockIndex];
          
          if (selectedLocation.isToggleChild) {
            const children = [...(parentBlock.children || [])];
            children[selectedLocation.blockIndex] = {
              ...selectedBlock,
              alignment,
            };
            
            newBlocks[selectedLocation.parentBlockIndex] = { ...parentBlock, children };
          } else if (parentBlock.columns) {
            const columnBlocks = [...parentBlock.columns[selectedLocation.columnIndex]];
            columnBlocks[selectedLocation.blockIndex] = {
              ...selectedBlock,
              alignment,
            };
            
            const newColumns = [...parentBlock.columns];
            newColumns[selectedLocation.columnIndex] = columnBlocks;
            newBlocks[selectedLocation.parentBlockIndex] = { ...parentBlock, columns: newColumns };
          }
        } else {
          newBlocks[selectedLocation.blockIndex] = {
            ...selectedBlock,
            alignment,
          };
        }
      });
      
      setSelectedBlockIds(new Set());
    } else if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = {
          ...block,
          alignment,
        };
        
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = {
          ...block,
          alignment,
        };
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = {
        ...block,
        alignment,
      };
    }

    handleChange(newBlocks);
  }, [actionMenu.blockId, blocks, handleChange, selectedBlockIds, setSelectedBlockIds]);

  const handleSelectionMenuBlockTypeChange = useCallback((type: BlockType) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    let element = anchorNode.nodeType === Node.TEXT_NODE 
      ? anchorNode.parentElement 
      : (anchorNode as HTMLElement);

    while (element && !element.hasAttribute('data-block-id')) {
      element = element.parentElement;
    }

    if (!element) return;

    const blockId = element.getAttribute('data-block-id');
    if (!blockId) return;

    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    const newBlocks = [...blocks];
    
    if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      if (location.isToggleChild) {
        // Update child block in toggle heading/list
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = { ...block, type };
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        // Update nested block in column
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = { ...block, type };
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = { ...block, type };
    }
    
    handleChange(newBlocks);
  }, [blocks, handleChange]);

  const handleSelectionMenuAlignmentChange = useCallback((alignment: 'left' | 'center' | 'right') => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const anchorNode = selection.anchorNode;
    if (!anchorNode) return;

    let element = anchorNode.nodeType === Node.TEXT_NODE 
      ? anchorNode.parentElement 
      : (anchorNode as HTMLElement);

    while (element && !element.hasAttribute('data-block-id')) {
      element = element.parentElement;
    }

    if (!element) return;

    const blockId = element.getAttribute('data-block-id');
    if (!blockId) return;

    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const block = location.block;
    const newBlocks = [...blocks];
    
    if (location.isNested) {
      const parentBlock = newBlocks[location.parentBlockIndex];
      
      if (location.isToggleChild) {
        const children = [...(parentBlock.children || [])];
        children[location.blockIndex] = { ...block, alignment };
        newBlocks[location.parentBlockIndex] = { ...parentBlock, children };
      } else if (parentBlock.columns) {
        const columnBlocks = [...parentBlock.columns[location.columnIndex]];
        columnBlocks[location.blockIndex] = { ...block, alignment };
        
        const newColumns = [...parentBlock.columns];
        newColumns[location.columnIndex] = columnBlocks;
        newBlocks[location.parentBlockIndex] = { ...parentBlock, columns: newColumns };
      }
    } else {
      newBlocks[location.blockIndex] = { ...block, alignment };
    }
    
    handleChange(newBlocks);
  }, [blocks, handleChange]);

  const handleColumnUpdate = useCallback((blockId: string, columnIndex: number, columnBlocks: Block[]) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const newColumns = [...(block.columns || [])];
    newColumns[columnIndex] = columnBlocks;

    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...block, columns: newColumns };
    handleChange(newBlocks);
  }, [blocks, handleChange]);

  const handleColumnWidthsUpdate = useCallback((blockId: string, widths: number[]) => {
    const blockIndex = blocks.findIndex((b) => b.id === blockId);
    if (blockIndex === -1) return;

    const block = blocks[blockIndex];
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = { ...block, columnWidths: widths };
    handleChange(newBlocks);
  }, [blocks, handleChange]);

  const handleCreateBlockAfterColumn = useCallback((columnBlockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === columnBlockId);
    if (blockIndex === -1) return;

    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    handleChange(newBlocks);

    setTimeout(() => {
      const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);
      }
    }, 0);
  }, [blocks, handleChange, editorRef]);

  const handleCreateBlockAfterToggle = useCallback((toggleBlockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === toggleBlockId);
    if (blockIndex === -1) return;

    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    handleChange(newBlocks);

    setTimeout(() => {
      const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);
      }
    }, 0);
  }, [blocks, handleChange, editorRef]);

  const handleToggleHeading = useCallback((blockId: string, isOpen: boolean) => {
    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const updatedBlock = { ...location.block, isOpen };
    const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
    handleChange(newBlocks);
  }, [blocks, handleChange, updateBlockAtLocation]);

  const handleToggleChildUpdate = useCallback((blockId: string, children: Block[]) => {
    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const updatedBlock = { ...location.block, children };
    const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
    handleChange(newBlocks);
  }, [blocks, handleChange, updateBlockAtLocation]);

  const handleCalloutChildUpdate = useCallback((blockId: string, children: Block[]) => {
    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const updatedBlock = { ...location.block, children };
    const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
    handleChange(newBlocks);
  }, [blocks, handleChange, updateBlockAtLocation]);

  const handleCreateBlockAfterCallout = useCallback((calloutBlockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === calloutBlockId);
    if (blockIndex === -1) return;

    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    handleChange(newBlocks);

    setTimeout(() => {
      const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);
      }
    }, 0);
  }, [blocks, handleChange, editorRef]);

  const handleDissolveCallout = useCallback((calloutBlockId: string) => {
    const blockIndex = blocks.findIndex((b) => b.id === calloutBlockId);
    if (blockIndex === -1) return;

    const newBlock = createBlock(BLOCK_TYPE_PARAGRAPH, '');
    const newBlocks = [...blocks];
    newBlocks[blockIndex] = newBlock;
    handleChange(newBlocks);

    setTimeout(() => {
      const newBlockElement = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"]`) as HTMLElement;
      if (newBlockElement) {
        newBlockElement.focus();
        setCaretToStart(newBlockElement);
      }
    }, 0);
  }, [blocks, handleChange, editorRef]);

  // Update table data
  const handleTableDataUpdate = useCallback((
    blockId: string, 
    cells: string[][], 
    columnWidths?: number[], 
    rowBackgroundColors?: string[], 
    columnBackgroundColors?: string[],
    rowTextColors?: string[], 
    columnTextColors?: string[]
  ) => {
    const location = findBlockLocation(blockId, blocks);
    if (!location.block) return;

    const updatedBlock = { 
      ...location.block, 
      tableData: { 
        cells, 
        columnWidths,
        rowBackgroundColors,
        columnBackgroundColors,
        rowTextColors,
        columnTextColors
      } 
    };
    const newBlocks = updateBlockAtLocation(blocks, location, updatedBlock);
    handleChange(newBlocks);
  }, [blocks, handleChange, updateBlockAtLocation]);

  return {
    uploadingBlockIds,
    videoUploadProgress,
    updateBlock,
    handleMenuSelect,
    handleExerciseMenuSelect,
    handleCheckToggle,
    handleImageUpload,
    handleImageDelete,
    handleImageResize,
    handleImageAlignmentChange,
    handleBlockUpdate,
    handleDrawingUpdate,
    handleVideoUpload,
    handleVideoDelete,
    handleVideoAlignmentChange,
    handleVideoDuplicate,
    handleAudioUpload,
    handleAudioDelete,
    handlePdfUpload,
    handlePdfDelete,
    handlePdfResize,
    handlePdfAlignmentChange,
    handlePdfDuplicate,
    handlePlusClick,
    handleBlockDelete,
    handleBlockDuplicate,
    handleBlockComment,
    handleBlockTurnInto,
    handleBlockColorChange,
    handleBlockAlignmentChange,
    handleSelectionMenuBlockTypeChange,
    handleSelectionMenuAlignmentChange,
    handleColumnUpdate,
    handleColumnWidthsUpdate,
    handleToggleHeading,
    handleToggleChildUpdate,
    handleCalloutChildUpdate,
    handleCreateBlockAfterColumn,
    handleCreateBlockAfterToggle,
    handleCreateBlockAfterCallout,
    handleDissolveCallout,
    handleTableDataUpdate,
  };
};

