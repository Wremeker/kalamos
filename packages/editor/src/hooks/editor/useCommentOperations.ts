import { useState, useCallback } from 'react';
import { Block, BlockComment, InlineComment } from '../../types/editor';
import { useAuth } from '../useAuth';
import { getCollaborationColor } from '../../constants/colors';

interface UseCommentOperationsProps {
  blocks: Block[];
  handleChange: (blocks: Block[]) => void;
  actionMenuBlockId: string | null;
}

export const useCommentOperations = ({
  blocks,
  handleChange,
  actionMenuBlockId,
}: UseCommentOperationsProps) => {
  const [activeCommentBlockId, setActiveCommentBlockId] = useState<string | null>(null);
  const [activeInlineCommentId, setActiveInlineCommentId] = useState<string | null>(null);
  const [activeInlineCommentBlockId, setActiveInlineCommentBlockId] = useState<string | null>(null);
  const { user } = useAuth();

  const handleOpenComments = useCallback((blockId: string) => {
    setActiveInlineCommentId(null);
    setActiveInlineCommentBlockId(null);
    setActiveCommentBlockId(activeCommentBlockId === blockId ? null : blockId);
  }, [activeCommentBlockId]);

  const handleOpenInlineComment = useCallback((blockId: string, inlineCommentId: string) => {
    setActiveCommentBlockId(null);
    if (activeInlineCommentId === inlineCommentId && activeInlineCommentBlockId === blockId) {
      setActiveInlineCommentId(null);
      setActiveInlineCommentBlockId(null);
    } else {
      setActiveInlineCommentId(inlineCommentId);
      setActiveInlineCommentBlockId(blockId);
    }
  }, [activeInlineCommentId, activeInlineCommentBlockId]);

  const handleAddComment = useCallback(
    (blockId: string, content: string) => {
      const blockIndex = blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const block = blocks[blockIndex];
      const newComment: BlockComment = {
        id: `comment-${Date.now()}-${Math.random()}`,
        content,
        author: user?.email || 'Anonymous',
        authorName: user?.name || undefined,
        authorColor: user ? getCollaborationColor(user.id) : undefined,
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      const newBlocks = [...blocks];
      newBlocks[blockIndex] = {
        ...block,
        comments: [...(block.comments || []), newComment],
      };

      handleChange(newBlocks);
    },
    [blocks, handleChange, user]
  );

  const handleDeleteComment = useCallback(
    (blockId: string, commentId: string) => {
      const blockIndex = blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const block = blocks[blockIndex];
      const newComments = (block.comments || []).filter((c) => c.id !== commentId);

      const newBlocks = [...blocks];
      newBlocks[blockIndex] = {
        ...block,
        comments: newComments,
      };

      handleChange(newBlocks);
    },
    [blocks, handleChange]
  );

  const handleResolveComment = useCallback(
    (blockId: string, commentId: string) => {
      const blockIndex = blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;

      const block = blocks[blockIndex];
      const newComments = (block.comments || []).map((c) =>
        c.id === commentId ? { ...c, resolved: true } : c
      );

      const newBlocks = [...blocks];
      newBlocks[blockIndex] = {
        ...block,
        comments: newComments,
      };

      handleChange(newBlocks);
    },
    [blocks, handleChange]
  );

  const handleCloseComments = useCallback(() => {
    setActiveCommentBlockId(null);
  }, []);

  const handleBlockComment = useCallback(() => {
    if (!actionMenuBlockId) return;
    handleOpenComments(actionMenuBlockId);
  }, [actionMenuBlockId, handleOpenComments]);


  const updateBlockWithInlineComments = useCallback(
    (blockId: string, updater: (block: Block) => Block) => {
      const blockIndex = blocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return;
      const newBlocks = [...blocks];
      newBlocks[blockIndex] = updater(blocks[blockIndex]);
      handleChange(newBlocks);
    },
    [blocks, handleChange]
  );

  const handleCreateInlineComment = useCallback(
    (blockId: string, inlineCommentId: string, highlightedText: string) => {
      updateBlockWithInlineComments(blockId, (block) => {
        const newInlineComment: InlineComment = {
          id: inlineCommentId,
          highlightedText,
          comments: [],
        };
        return {
          ...block,
          inlineComments: [...(block.inlineComments || []), newInlineComment],
        };
      });
      setActiveCommentBlockId(null);
      setActiveInlineCommentId(inlineCommentId);
      setActiveInlineCommentBlockId(blockId);
    },
    [updateBlockWithInlineComments]
  );

  const handleAddInlineComment = useCallback(
    (blockId: string, inlineCommentId: string, content: string) => {
      const newComment: BlockComment = {
        id: `comment-${Date.now()}-${Math.random()}`,
        content,
        author: user?.email || 'Anonymous',
        authorName: user?.name || undefined,
        authorColor: user ? getCollaborationColor(user.id) : undefined,
        createdAt: new Date().toISOString(),
        resolved: false,
      };

      updateBlockWithInlineComments(blockId, (block) => {
        const inlineComments = (block.inlineComments || []).map((ic) =>
          ic.id === inlineCommentId
            ? { ...ic, comments: [...ic.comments, newComment] }
            : ic
        );
        return { ...block, inlineComments };
      });
    },
    [updateBlockWithInlineComments, user]
  );

  const handleDeleteInlineComment = useCallback(
    (blockId: string, inlineCommentId: string, commentId: string) => {
      updateBlockWithInlineComments(blockId, (block) => {
        const inlineComments = (block.inlineComments || []).map((ic) =>
          ic.id === inlineCommentId
            ? { ...ic, comments: ic.comments.filter((c) => c.id !== commentId) }
            : ic
        );
        return { ...block, inlineComments };
      });
    },
    [updateBlockWithInlineComments]
  );

  const handleResolveInlineComment = useCallback(
    (blockId: string, inlineCommentId: string, commentId: string) => {
      updateBlockWithInlineComments(blockId, (block) => {
        const inlineComments = (block.inlineComments || []).map((ic) =>
          ic.id === inlineCommentId
            ? {
                ...ic,
                comments: ic.comments.map((c) =>
                  c.id === commentId ? { ...c, resolved: true } : c
                ),
              }
            : ic
        );
        return { ...block, inlineComments };
      });
    },
    [updateBlockWithInlineComments]
  );

  const handleRemoveInlineCommentThread = useCallback(
    (blockId: string, inlineCommentId: string) => {
      updateBlockWithInlineComments(blockId, (block) => {
        const inlineComments = (block.inlineComments || []).filter(
          (ic) => ic.id !== inlineCommentId
        );
        const markRegex = new RegExp(
          `<mark[^>]*data-inline-comment-id="${inlineCommentId}"[^>]*>(.*?)</mark>`,
          'gs'
        );
        const newText = block.text.replace(markRegex, '$1');
        return { ...block, text: newText, inlineComments };
      });
      if (activeInlineCommentId === inlineCommentId) {
        setActiveInlineCommentId(null);
        setActiveInlineCommentBlockId(null);
      }
    },
    [updateBlockWithInlineComments, activeInlineCommentId]
  );

  const handleCloseInlineComment = useCallback(() => {
    setActiveInlineCommentId(null);
    setActiveInlineCommentBlockId(null);
  }, []);

  return {
    activeCommentBlockId,
    activeInlineCommentId,
    activeInlineCommentBlockId,
    handleOpenComments,
    handleOpenInlineComment,
    handleAddComment,
    handleDeleteComment,
    handleResolveComment,
    handleCloseComments,
    handleBlockComment,
    handleCreateInlineComment,
    handleAddInlineComment,
    handleDeleteInlineComment,
    handleResolveInlineComment,
    handleRemoveInlineCommentThread,
    handleCloseInlineComment,
  };
};

