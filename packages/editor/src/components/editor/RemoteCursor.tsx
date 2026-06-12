import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ConnectedUser } from '@/types/collaboration';

interface RemoteCursorProps {
  user: ConnectedUser;
  blockId: string;
  position?: { blockId: string; offset: number };
  blocksVersion?: number;
}

const RemoteCursorComponent: React.FC<RemoteCursorProps> = ({ user, blockId, position, blocksVersion }) => {
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number; height: number } | null>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const retryAttemptsRef = useRef(0);
  const maxRetries = 10;

  const calculatePosition = useCallback(() => {
    if (!position || !blockId) {
      setCursorPosition(null);
      retryAttemptsRef.current = 0;
      return;
    }

    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    if (!blockElement) {
      if (retryAttemptsRef.current < maxRetries) {
        retryAttemptsRef.current++;
        const delay = retryAttemptsRef.current <= 3 ? 100 : 200;
        retryTimeoutRef.current = setTimeout(() => calculatePosition(), delay);
      }
      return;
    }

    retryAttemptsRef.current = 0;

    const blockRect = blockElement.getBoundingClientRect();
    if (blockRect.width === 0 || blockRect.height === 0) {
      return;
    }

    try {
      const walker = document.createTreeWalker(
        blockElement,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let currentOffset = 0;
      let textNode = walker.nextNode();
      let targetNode: Node | null = null;
      let targetOffset = 0;
      
      while (textNode) {
        const textLength = textNode.textContent?.length || 0;
        
        if (currentOffset + textLength >= position.offset) {
          targetNode = textNode;
          targetOffset = position.offset - currentOffset;
          break;
        }
        
        currentOffset += textLength;
        textNode = walker.nextNode();
      }

      if (targetNode && targetNode.nodeType === Node.TEXT_NODE) {
        const range = document.createRange();
        const maxOffset = targetNode.textContent?.length || 0;
        const safeOffset = Math.min(Math.max(0, targetOffset), maxOffset);
        
        range.setStart(targetNode, safeOffset);
        range.setEnd(targetNode, safeOffset);
        
        const rect = range.getBoundingClientRect();
        
        if (rect.top !== 0 || rect.left !== 0) {
          setCursorPosition({
            top: rect.top,
            left: rect.left,
            height: rect.height || 20,
          });
        }
      } else if (position.offset === 0) {
        const rect = blockElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(blockElement);
        const lineHeight = parseFloat(computedStyle.lineHeight) || parseFloat(computedStyle.fontSize) || 20;
        setCursorPosition({
          top: rect.top,
          left: rect.left,
          height: lineHeight,
        });
      }
    } catch {
      // Error calculating cursor position
    }
  }, [blockId, position]);

  useEffect(() => {
    if (!position || !blockId) {
      setCursorPosition(null);
      return;
    }

    let initialTimeout: ReturnType<typeof setTimeout>;
    let fontsTimeout: ReturnType<typeof setTimeout>;
    
    const initialCalculation = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        calculatePosition();
        initialTimeout = setTimeout(() => {
          calculatePosition();
        }, 150);
      });
    });

    if (document.fonts) {
      document.fonts.ready.then(() => {
        fontsTimeout = setTimeout(() => {
          calculatePosition();
        }, 50);
      });
    }

    const handleUpdate = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(calculatePosition);
    };
    
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('load', handleUpdate);

    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
    let observer: MutationObserver | null = null;
    
    if (blockElement) {
      observer = new MutationObserver(handleUpdate);
      
      observer.observe(blockElement, {
        characterData: true,
        childList: true,
        subtree: true,
      });
    }
    
    return () => {
      cancelAnimationFrame(initialCalculation);
      clearTimeout(initialTimeout);
      clearTimeout(fontsTimeout);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('load', handleUpdate);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [blockId, position, calculatePosition, blocksVersion]);

  if (!cursorPosition) return null;

  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div
      className="fixed pointer-events-none z-10"
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${cursorPosition.left}px, ${cursorPosition.top}px, 0)`,
        transition: 'transform 200ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
        willChange: 'transform',
      }}
    >
      <div
        className="w-0.5"
        style={{ 
          backgroundColor: user.color,
          height: `${cursorPosition.height}px`,
          transition: 'height 200ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
        }}
      />
      
      <div
        className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-xs font-medium whitespace-nowrap shadow-sm"
        style={{ backgroundColor: user.color }}
      >
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
        >
          {initial}
        </div>
        <span>{user.name}</span>
      </div>
    </div>
  );
};

export const RemoteCursor = React.memo(RemoteCursorComponent, (prevProps, nextProps) => {
  return (
    prevProps.user.id === nextProps.user.id &&
    prevProps.blockId === nextProps.blockId &&
    prevProps.position?.blockId === nextProps.position?.blockId &&
    prevProps.position?.offset === nextProps.position?.offset &&
    prevProps.blocksVersion === nextProps.blocksVersion
  );
});

