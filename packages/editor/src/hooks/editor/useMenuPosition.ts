import { useState, useEffect } from 'react';

interface UseMenuPositionOptions {
  position: { x: number; y: number } | null;
  menuHeight: number;
  menuWidth?: number;
  offset?: number;
}

/**
 * Calculates viewport-aware menu positioning.
 * When there isn't enough space below the trigger, the menu flips above it.
 * Horizontal position is clamped so the menu stays within the viewport.
 */
export function useMenuPosition({
  position,
  menuHeight,
  menuWidth,
  offset = 0,
}: UseMenuPositionOptions) {
  const [showAbove, setShowAbove] = useState(false);

  useEffect(() => {
    if (!position) {
      setShowAbove(false);
      return;
    }
    const spaceBelow = window.innerHeight - position.y - offset;
    setShowAbove(spaceBelow < menuHeight);
  }, [position, menuHeight, offset]);

  if (!position) {
    return { showAbove: false, menuTop: 0, menuLeft: 0 };
  }

  const menuTop = showAbove
    ? position.y - menuHeight - offset
    : position.y + offset;

  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
  const menuLeft = menuWidth != null
    ? Math.min(position.x, viewportWidth - menuWidth - 16)
    : position.x;

  return { showAbove, menuTop, menuLeft };
}
