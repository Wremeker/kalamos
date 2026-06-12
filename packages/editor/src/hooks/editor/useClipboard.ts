import { useEffect, useState } from 'react';
import { Block, BlockType } from '../../types/editor';
import { useEditorContext } from '../../contexts/EditorContext';
import {
  createBlock,
  setCaretToEnd,
  parseMarkdownToBlocks,
  parseBlocksFromClipboard,
  isURL,
  findBlockLocation,
  copyBlocksToClipboard,
} from '../../utils/editorUtils';
import {
  BLOCK_TYPE_PARAGRAPH,
  BLOCK_TYPE_CODE,
  BLOCK_TYPE_IMAGE,
  BLOCK_TYPE_DIVIDER,
  BLOCK_TYPE_TOGGLE_H1,
  BLOCK_TYPE_TOGGLE_H2,
  BLOCK_TYPE_TOGGLE_H3,
  BLOCK_TYPE_TOGGLE_LIST,
  BLOCK_TYPE_H1,
  BLOCK_TYPE_H2,
  BLOCK_TYPE_H3,
  BLOCK_TYPE_H4,
  BLOCK_TYPE_H5,
  BLOCK_TYPE_BULLETED,
  BLOCK_TYPE_NUMBERED,
  BLOCK_TYPE_TODO,
  BLOCK_TYPE_EXERCISE,
} from '../../constants/blockTypes';
import { imagesApi } from '../../api/images';
import { toast } from 'sonner';
import { hasMarkdownSyntax } from '../../utils/markdownRenderer';
import i18n from '../../i18n';
import { getErrorMessage } from '../../utils/errorUtils';

interface UseClipboardProps {
  handleChange: (blocks: Block[]) => void;
  setLinkPasteMenu: React.Dispatch<React.SetStateAction<{
    visible: boolean;
    position: { x: number; y: number } | null;
    url: string;
    blockId: string | null;
    originalText: string;
  }>>;
  setShowSelectionMenu: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useClipboard = ({
  handleChange,
  setLinkPasteMenu,
  setShowSelectionMenu,
}: UseClipboardProps) => {
  const { blocks, editorRef } = useEditorContext();
  const [currentBlockType, setCurrentBlockType] = useState<BlockType | null>(null);
  const [isInsideToggle, setIsInsideToggle] = useState(false);
  const [isInsideTable, setIsInsideTable] = useState(false);

  useEffect(() => {
    const handleCompositionStart = () => {
      if (editorRef.current) {
        const composingRef = { current: true };
        (editorRef.current as any).composingRef = composingRef;
      }
    };

    const handleCompositionEnd = () => {
      if (editorRef.current) {
        const composingRef = { current: false };
        (editorRef.current as any).composingRef = composingRef;
      }
    };

    document.addEventListener('compositionstart', handleCompositionStart);
    document.addEventListener('compositionend', handleCompositionEnd);

    return () => {
      document.removeEventListener('compositionstart', handleCompositionStart);
      document.removeEventListener('compositionend', handleCompositionEnd);
    };
  }, [editorRef]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        const anchorNode = selection.anchorNode;
        const editorElement = editorRef.current;
        if (anchorNode && editorElement?.contains(anchorNode)) {
          let node = anchorNode as Node | null;
          let isInCodeBlock = false;
          let blockType: BlockType | null = null;
          let inToggle = false;
          let inTable = false;
          
          while (node && node !== editorElement) {
            if (node instanceof Element) {
              // Check whether the selection is inside a table cell
              if (node.hasAttribute('data-table-cell')) {
                inTable = true;
              }
              
              if (node.classList?.contains('group/code')) {
                isInCodeBlock = true;
                break;
              }
              
              
              if (node.classList?.contains('ml-9') && node.parentElement) {
                const parentBlock = node.parentElement.querySelector('[data-block-id]');
                if (parentBlock) {
                  const parentBlockId = parentBlock.getAttribute('data-block-id');
                  if (parentBlockId) {
                    const parentBlockData = blocks.find(b => b.id === parentBlockId);
                    if (parentBlockData && (
                      parentBlockData.type === BLOCK_TYPE_TOGGLE_H1 || 
                      parentBlockData.type === BLOCK_TYPE_TOGGLE_H2 || 
                      parentBlockData.type === BLOCK_TYPE_TOGGLE_H3 ||
                      parentBlockData.type === BLOCK_TYPE_TOGGLE_LIST
                    )) {
                      inToggle = true;
                    }
                  }
                }
              }
              
              const blockId = node.getAttribute('data-block-id');
              if (blockId) {
                const block = blocks.find(b => b.id === blockId);
                if (block) {
                  blockType = block.type;
                  if (block.type === BLOCK_TYPE_CODE) {
                    isInCodeBlock = true;
                    break;
                  }
                }
              }
            }
            node = node.parentNode;
          }
          
          const isInExerciseBlock = blockType === BLOCK_TYPE_EXERCISE;
          setShowSelectionMenu(!isInCodeBlock && !isInExerciseBlock);
          setCurrentBlockType(blockType);
          setIsInsideToggle(inToggle);
          setIsInsideTable(inTable);
        } else {
          setShowSelectionMenu(false);
          setCurrentBlockType(null);
          setIsInsideToggle(false);
          setIsInsideTable(false);
        }
      } else {
        setShowSelectionMenu(false);
        setCurrentBlockType(null);
        setIsInsideToggle(false);
        setIsInsideTable(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [blocks, editorRef, setShowSelectionMenu]);

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const target = e.target as HTMLElement;
      const isInEditor = editorRef.current?.contains(target);
      
      if (!isInEditor) return;

      const anchorNode = selection.anchorNode;
      if (!anchorNode) return;

      let node = anchorNode as Node | null;
      let blockId: string | null = null;

      while (node && node !== editorRef.current) {
        if (node instanceof Element) {
          const dataBlockId = node.getAttribute('data-block-id');
          if (dataBlockId) {
            blockId = dataBlockId;
            break;
          }
        }
        node = node.parentNode;
      }

      if (!blockId) return;

      let block: Block | undefined;
      
      // First check top-level blocks
      block = blocks.find(b => b.id === blockId);
      
      // If not found, check inside columns
      if (!block) {
        for (const topBlock of blocks) {
          if (topBlock.columns) {
            for (const column of topBlock.columns) {
              const found = column.find(b => b.id === blockId);
              if (found) {
                block = found;
                break;
              }
            }
            if (block) break;
          }
          // Also check toggle child blocks
          if (topBlock.children) {
            const found = topBlock.children.find(b => b.id === blockId);
            if (found) {
              block = found;
              break;
            }
          }
        }
      }

      if (!block) return;

      const selectedText = selection.toString();
      if (!selectedText) return;

      let markdownText = selectedText;
      
      switch (block.type) {
        case BLOCK_TYPE_H1:
        case BLOCK_TYPE_TOGGLE_H1:
          markdownText = `# ${selectedText}`;
          break;
        case BLOCK_TYPE_H2:
        case BLOCK_TYPE_TOGGLE_H2:
          markdownText = `## ${selectedText}`;
          break;
        case BLOCK_TYPE_H3:
        case BLOCK_TYPE_TOGGLE_H3:
          markdownText = `### ${selectedText}`;
          break;
        case BLOCK_TYPE_H4:
          markdownText = `#### ${selectedText}`;
          break;
        case BLOCK_TYPE_H5:
          markdownText = `##### ${selectedText}`;
          break;
        case BLOCK_TYPE_CODE:
          markdownText = `\`\`\`\n${selectedText}\n\`\`\``;
          break;
        case BLOCK_TYPE_BULLETED:
          markdownText = `- ${selectedText}`;
          break;
        case BLOCK_TYPE_NUMBERED:
          markdownText = `1. ${selectedText}`;
          break;
        case BLOCK_TYPE_TODO:
          markdownText = `- [ ] ${selectedText}`;
          break;
        default:
          break;
      }

     
      e.clipboardData?.setData('text/plain', markdownText);
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('copy', handleCopy);
    };
  }, [blocks, editorRef]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      
      // Ignore paste events in input and textarea elements
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      const isInEditor = target.hasAttribute('data-block-id') || 
                        target.closest('[data-block-id]');
      
      if (!isInEditor) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const clipboardText = e.clipboardData?.getData('text/plain');
      
      if (clipboardText) {
        const trimmedText = clipboardText.trim();
        
        if (isURL(trimmedText)) {
          e.preventDefault();
          e.stopPropagation();

          const selection = window.getSelection();
          if (!selection) return;

          let activeBlockId: string | null = null;
          let activeBlockElement: HTMLElement | null = null;
          const anchorNode = selection.anchorNode;
          if (anchorNode) {
            let element = anchorNode.nodeType === Node.TEXT_NODE 
              ? anchorNode.parentElement 
              : (anchorNode as HTMLElement);

            while (element && !element.hasAttribute('data-block-id')) {
              element = element.parentElement;
            }

            if (element) {
              activeBlockId = element.getAttribute('data-block-id');
              activeBlockElement = element;
            }
          }

          if (!activeBlockId || !activeBlockElement) return;

          const blockIndex = blocks.findIndex((b) => b.id === activeBlockId);
          if (blockIndex === -1) return;
          
          const currentBlockText = blocks[blockIndex].text;

          const rect = activeBlockElement.getBoundingClientRect();
          setLinkPasteMenu({
            visible: true,
            position: { x: rect.left, y: rect.bottom + 8 },
            url: trimmedText,
            blockId: activeBlockId,
            originalText: currentBlockText,
          });
          return;
        }
        
        const pastedBlocks = parseBlocksFromClipboard(clipboardText);
        if (pastedBlocks && pastedBlocks.length > 0) {
          const selection = window.getSelection();
          if (!selection) return;

          let activeBlockId: string | null = null;
          const anchorNode = selection.anchorNode;
          if (anchorNode) {
            let element = anchorNode.nodeType === Node.TEXT_NODE 
              ? anchorNode.parentElement 
              : (anchorNode as HTMLElement);

            while (element && !element.hasAttribute('data-block-id')) {
              element = element.parentElement;
            }

            if (element) {
              activeBlockId = element.getAttribute('data-block-id');
            }
          }

          if (!activeBlockId) return;

          const location = findBlockLocation(activeBlockId, blocks);
          if (!location.block) return;

          const currentBlock = location.block;
          
          const currentElement = document.querySelector(`[data-block-id="${activeBlockId}"]`) as HTMLElement;
          const isBlockEmpty = (!currentBlock.text || currentBlock.text.trim() === '') &&
                              (!currentElement?.textContent || currentElement.textContent.trim() === '');

          if (!isBlockEmpty && pastedBlocks.length === 1 && pastedBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          let newBlocks = [...blocks];
          
          if (location.isNested) {
            if (location.isToggleChild) {
              const parentBlock = newBlocks[location.parentBlockIndex];
              if (parentBlock.children) {
                let newChildren = [...parentBlock.children];
                
                if (isBlockEmpty) {
                  if (pastedBlocks.length === 1 && pastedBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
                    newChildren[location.blockIndex] = {
                      ...currentBlock,
                      text: pastedBlocks[0].text,
                    };
                  } else {
                    newChildren[location.blockIndex] = pastedBlocks[0];
                    if (pastedBlocks.length > 1) {
                      newChildren.splice(location.blockIndex + 1, 0, ...pastedBlocks.slice(1));
                    }
                  }
                } else {
                  newChildren.splice(location.blockIndex + 1, 0, ...pastedBlocks);
                }
                
                newBlocks[location.parentBlockIndex] = {
                  ...parentBlock,
                  children: newChildren,
                };
              }
            } else {
              const parentBlock = newBlocks[location.parentBlockIndex];
              if (parentBlock.columns) {
                const newColumns = [...parentBlock.columns];
                let columnBlocks = [...newColumns[location.columnIndex]];
                
                if (isBlockEmpty) {
                  if (pastedBlocks.length === 1 && pastedBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
                    columnBlocks[location.blockIndex] = {
                      ...currentBlock,
                      text: pastedBlocks[0].text,
                    };
                  } else {
                    columnBlocks[location.blockIndex] = pastedBlocks[0];
                    if (pastedBlocks.length > 1) {
                      columnBlocks.splice(location.blockIndex + 1, 0, ...pastedBlocks.slice(1));
                    }
                  }
                } else {
                  columnBlocks.splice(location.blockIndex + 1, 0, ...pastedBlocks);
                }
                
                newColumns[location.columnIndex] = columnBlocks;
                newBlocks[location.parentBlockIndex] = {
                  ...parentBlock,
                  columns: newColumns,
                };
              }
            }
          } else {  
            if (isBlockEmpty) {
              if (pastedBlocks.length === 1 && pastedBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
                newBlocks[location.blockIndex] = {
                  ...currentBlock,
                  text: pastedBlocks[0].text,
                };
              } else {
                newBlocks[location.blockIndex] = pastedBlocks[0];
                if (pastedBlocks.length > 1) {
                  newBlocks.splice(location.blockIndex + 1, 0, ...pastedBlocks.slice(1));
                }
              }
            } else {
              newBlocks.splice(location.blockIndex + 1, 0, ...pastedBlocks);
            }
          }

          handleChange(newBlocks);

          const focusBlockId =
            isBlockEmpty &&
            pastedBlocks.length === 1 &&
            pastedBlocks[0].type === BLOCK_TYPE_PARAGRAPH
              ? activeBlockId
              : pastedBlocks[pastedBlocks.length - 1].id;

          setTimeout(() => {
            const lastElement = editorRef.current?.querySelector(
              `[data-block-id="${focusBlockId}"]`,
            ) as HTMLElement;
            if (lastElement) {
              lastElement.focus();
              setCaretToEnd(lastElement);
            }
          }, 0);
          
          return;
        }
      }

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          const selection = window.getSelection();
          if (!selection) return;

          let activeBlockId: string | null = null;
          const anchorNode = selection.anchorNode;
          if (anchorNode) {
            let element = anchorNode.nodeType === Node.TEXT_NODE 
              ? anchorNode.parentElement 
              : (anchorNode as HTMLElement);

            while (element && !element.hasAttribute('data-block-id')) {
              element = element.parentElement;
            }

            if (element) {
              activeBlockId = element.getAttribute('data-block-id');
            }
          }

          if (activeBlockId) {
            const location = findBlockLocation(activeBlockId, blocks);
            if (location.block) {
              (async () => {
                try {
                  const uploadedImage = await imagesApi.uploadImage({
                    file
                  });
                  
                  const imageUrl = imagesApi.getImageUrl(uploadedImage.filename);
                  
                  const currentBlock = location.block!;
                  const newBlocks = [...blocks];
                  
                  const currentElement = document.querySelector(`[data-block-id="${activeBlockId}"]`) as HTMLElement;
                  const isBlockEmpty = (!currentBlock.text || currentBlock.text.trim() === '') &&
                                      (!currentElement?.textContent || currentElement.textContent.trim() === '');
                  
                  if (location.isNested) {
                    if (location.isToggleChild) {
                      const parentBlock = newBlocks[location.parentBlockIndex];
                      if (parentBlock.children) {
                        const newChildren = [...parentBlock.children];
                        
                        if (isBlockEmpty) {
                          newChildren[location.blockIndex] = {
                            ...currentBlock,
                            type: BLOCK_TYPE_IMAGE,
                            text: '',
                            imageFile: imageUrl,
                            imageUrl,
                          };
                        } else {
                          const imageBlock = createBlock(BLOCK_TYPE_IMAGE, '');
                          imageBlock.imageFile = imageUrl;
                          imageBlock.imageUrl = imageUrl;
                          newChildren.splice(location.blockIndex + 1, 0, imageBlock);
                        }
                        
                        newBlocks[location.parentBlockIndex] = {
                          ...parentBlock,
                          children: newChildren,
                        };
                      }
                    } else {
                      const parentBlock = newBlocks[location.parentBlockIndex];
                      if (parentBlock.columns) {
                        const newColumns = [...parentBlock.columns];
                        const columnBlocks = [...newColumns[location.columnIndex]];
                        
                        if (isBlockEmpty) {
                          columnBlocks[location.blockIndex] = {
                            ...currentBlock,
                            type: BLOCK_TYPE_IMAGE,
                            text: '',
                            imageFile: imageUrl,
                            imageUrl,
                          };
                        } else {
                          const imageBlock = createBlock(BLOCK_TYPE_IMAGE, '');
                          imageBlock.imageFile = imageUrl;
                          imageBlock.imageUrl = imageUrl;
                          columnBlocks.splice(location.blockIndex + 1, 0, imageBlock);
                        }
                        
                        newColumns[location.columnIndex] = columnBlocks;
                        newBlocks[location.parentBlockIndex] = {
                          ...parentBlock,
                          columns: newColumns,
                        };
                      }
                    }
                  } else {
                    if (isBlockEmpty) {
                      newBlocks[location.blockIndex] = {
                        ...currentBlock,
                        type: BLOCK_TYPE_IMAGE,
                        text: '',
                        imageFile: imageUrl,
                        imageUrl,
                      };
                    } else {
                      const imageBlock = createBlock(BLOCK_TYPE_IMAGE, '');
                      imageBlock.imageFile = imageUrl;
                      imageBlock.imageUrl = imageUrl;
                      newBlocks.splice(location.blockIndex + 1, 0, imageBlock);
                    }
                  }
                  
                  handleChange(newBlocks);
                } catch (error: unknown) {
                  toast.error(getErrorMessage(error, 'editor.failedToUploadImage'));
                }
              })();
            }
          }
          return;
        }
      }

      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      const hasMarkdown = hasMarkdownSyntax(text as string);

      if (!hasMarkdown) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const selection = window.getSelection();
      if (!selection) return;

      let activeBlockId: string | null = null;
      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        let element = anchorNode.nodeType === Node.TEXT_NODE 
          ? anchorNode.parentElement 
          : (anchorNode as HTMLElement);

        while (element && !element.hasAttribute('data-block-id')) {
          element = element.parentElement;
        }

        if (element) {
          activeBlockId = element.getAttribute('data-block-id');
        }
      }

      if (!activeBlockId) return;

      const location = findBlockLocation(activeBlockId, blocks);
      if (!location.block) return;

      const markdownBlocks = parseMarkdownToBlocks(text);
      if (markdownBlocks.length === 0) return;

      const currentBlock = location.block;
      let newBlocks = [...blocks];

      const insertedBlockIds = new Set(markdownBlocks.map(b => b.id));
      
      const currentElement = document.querySelector(`[data-block-id="${activeBlockId}"]`) as HTMLElement;
      const isBlockEmpty = (!currentBlock.text || currentBlock.text.trim() === '') &&
                          (!currentElement?.textContent || currentElement.textContent.trim() === '');
      
      if (location.isNested) {
        if (location.isToggleChild) {
          const parentBlock = newBlocks[location.parentBlockIndex];
          if (parentBlock.children) {
            let newChildren = [...parentBlock.children];
            
            if (isBlockEmpty) {
              if (markdownBlocks.length === 1 && markdownBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
                newChildren[location.blockIndex] = {
                  ...currentBlock,
                  text: markdownBlocks[0].text,
                };
              } else {
                newChildren[location.blockIndex] = markdownBlocks[0];
                if (markdownBlocks.length > 1) {
                  newChildren.splice(location.blockIndex + 1, 0, ...markdownBlocks.slice(1));
                }
              }
            } else {
              newChildren.splice(location.blockIndex + 1, 0, ...markdownBlocks);
            }
            
            newChildren = newChildren.filter((block) => {
              if (newChildren.length === 1) return true;
              if (insertedBlockIds.has(block.id)) return true;
              if (block.text && block.text.trim() !== '') return true;
              if (block.type === BLOCK_TYPE_IMAGE || block.type === BLOCK_TYPE_DIVIDER) return true;
              return false;
            });
            
            newBlocks[location.parentBlockIndex] = {
              ...parentBlock,
              children: newChildren,
            };
          }
        } else {
          const parentBlock = newBlocks[location.parentBlockIndex];
          if (parentBlock.columns) {
            const newColumns = [...parentBlock.columns];
            let columnBlocks = [...newColumns[location.columnIndex]];
            
            if (isBlockEmpty) {
              if (markdownBlocks.length === 1 && markdownBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
                columnBlocks[location.blockIndex] = {
                  ...currentBlock,
                  text: markdownBlocks[0].text,
                };
              } else {
                columnBlocks[location.blockIndex] = markdownBlocks[0];
                if (markdownBlocks.length > 1) {
                  columnBlocks.splice(location.blockIndex + 1, 0, ...markdownBlocks.slice(1));
                }
              }
            } else {
              columnBlocks.splice(location.blockIndex + 1, 0, ...markdownBlocks);
            }
            
            columnBlocks = columnBlocks.filter((block) => {
              if (columnBlocks.length === 1) return true;
              if (insertedBlockIds.has(block.id)) return true;
              if (block.text && block.text.trim() !== '') return true;
              if (block.type === BLOCK_TYPE_IMAGE || block.type === BLOCK_TYPE_DIVIDER) return true;
              return false;
            });
            
            newColumns[location.columnIndex] = columnBlocks;
            newBlocks[location.parentBlockIndex] = {
              ...parentBlock,
              columns: newColumns,
            };
          }
        }
      } else {
        if (isBlockEmpty) {
          if (markdownBlocks.length === 1 && markdownBlocks[0].type === BLOCK_TYPE_PARAGRAPH) {
            newBlocks[location.blockIndex] = {
              ...currentBlock,
              text: markdownBlocks[0].text,
            };
          } else {
            newBlocks[location.blockIndex] = markdownBlocks[0];
            if (markdownBlocks.length > 1) {
              newBlocks.splice(location.blockIndex + 1, 0, ...markdownBlocks.slice(1));
            }
          }
        } else {
          newBlocks.splice(location.blockIndex + 1, 0, ...markdownBlocks);
        }
        
        newBlocks = newBlocks.filter((block) => {
          if (newBlocks.length === 1) return true;
          if (insertedBlockIds.has(block.id)) return true;
          if (block.text && block.text.trim() !== '') return true;
          if (block.type === BLOCK_TYPE_IMAGE || block.type === BLOCK_TYPE_DIVIDER) return true;
          return false;
        });
      }

      handleChange(newBlocks);

      const focusBlockId =
        isBlockEmpty &&
        markdownBlocks.length === 1 &&
        markdownBlocks[0].type === BLOCK_TYPE_PARAGRAPH
          ? activeBlockId
          : markdownBlocks[markdownBlocks.length - 1].id;

      setTimeout(() => {
        const lastElement = editorRef.current?.querySelector(
          `[data-block-id="${focusBlockId}"]`,
        ) as HTMLElement;
        if (lastElement) {
          lastElement.focus();
          setCaretToEnd(lastElement);
        }
      }, 0);
    };

    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [blocks, handleChange, editorRef, setLinkPasteMenu]);


  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key === 'c') {
        const activeElement = document.activeElement as HTMLElement;
        
        if (!activeElement || !activeElement.hasAttribute('data-block-id')) {
          return;
        }

        const blockId = activeElement.getAttribute('data-block-id');
        if (!blockId) return;

        const location = findBlockLocation(blockId, blocks);
        
        if (location.block) {
          e.preventDefault();
          await copyBlocksToClipboard([location.block]);
          
          const blockTypeName = location.isNested ? 
            (location.columnIndex >= 0 ? i18n.t('editor.blockFromColumn') : i18n.t('editor.nestedBlock')) : 
            i18n.t('editor.block');
          toast.success(i18n.t('editor.copiedToClipboardWithName', { blockTypeName }));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [blocks]);

  return { currentBlockType, isInsideToggle, isInsideTable };
};

