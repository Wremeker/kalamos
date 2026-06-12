import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { BlockRendererProps } from './types';
import { KEY_TAB, KEY_ARROW_UP, KEY_ARROW_DOWN, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_Z } from '../../../constants/keyboard';
import { TEXT_COLORS, BACKGROUND_COLORS } from '../../../constants/colors';

interface TableBlockProps extends BlockRendererProps {
  onTableDataUpdate?: (
    blockId: string, 
    cells: string[][], 
    columnWidths?: number[], 
    rowBackgroundColors?: string[], 
    columnBackgroundColors?: string[],
    rowTextColors?: string[], 
    columnTextColors?: string[]
  ) => void;
}

interface ActionMenuState {
  type: 'row' | 'column';
  index: number;
  position: { x: number; y: number };
}

export const TableBlock: React.FC<TableBlockProps> = ({
  block,
  index,
  onKeyDown,
  onTableDataUpdate,
}) => {
  const { t } = useTranslation();
  // Initialize 3x3 table if no data exists
  const defaultCells = Array(3).fill(null).map(() => Array(3).fill(''));
  const cells = block.tableData?.cells || defaultCells;
  const rowCount = cells.length;
  const columnCount = cells[0]?.length || 3;
  
  const defaultWidths = Array(columnCount).fill(100 / columnCount);
  
  // Validate and normalize column widths
  let columnWidths = block.tableData?.columnWidths || defaultWidths;
  
  // If the length doesn't match, reset to default
  if (columnWidths.length !== columnCount) {
    columnWidths = defaultWidths;
  } else {
    // Normalize widths to ensure they sum to 100%
    const sum = columnWidths.reduce((acc, width) => acc + width, 0);
    if (Math.abs(sum - 100) > 0.01) {
      // Sum is not 100%, normalize all widths proportionally
      columnWidths = columnWidths.map(width => (width / sum) * 100);
    }
  }
  
  const defaultRowBackgroundColors = Array(rowCount).fill('default');
  const rowBackgroundColors = block.tableData?.rowBackgroundColors || defaultRowBackgroundColors;
  
  const defaultColumnBackgroundColors = Array(columnCount).fill('default');
  const columnBackgroundColors = block.tableData?.columnBackgroundColors || defaultColumnBackgroundColors;
  
  const defaultRowTextColors = Array(rowCount).fill('default');
  const rowTextColors = block.tableData?.rowTextColors || defaultRowTextColors;
  
  const defaultColumnTextColors = Array(columnCount).fill('default');
  const columnTextColors = block.tableData?.columnTextColors || defaultColumnTextColors;

  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [colorSubmenu, setColorSubmenu] = useState(false);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [showBottomPlus, setShowBottomPlus] = useState(false);
  const [showRightPlus, setShowRightPlus] = useState(false);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    return () => {
      if (resizeCleanupRef.current) {
        resizeCleanupRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const originalWidths = block.tableData?.columnWidths;
    if (!originalWidths) return;
    
    const needsCorrection = 
      originalWidths.length !== columnCount ||
      Math.abs(originalWidths.reduce((acc, w) => acc + w, 0) - 100) > 0.01;
    
    if (needsCorrection && onTableDataUpdate) {
      onTableDataUpdate(
        block.id, 
        cells, 
        columnWidths, 
        rowBackgroundColors, 
        columnBackgroundColors, 
        rowTextColors, 
        columnTextColors
      );
    }
  }, [block.id]);

  // Save cursor position
  const saveCursorPosition = useCallback((element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const caretOffset = preCaretRange.toString().length;
    
    return caretOffset;
  }, []);

  // Restore cursor position
  const restoreCursorPosition = useCallback((element: HTMLElement, offset: number) => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = document.createRange();
    let currentOffset = 0;
    let found = false;
    
    const traverseNodes = (node: Node): boolean => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (currentOffset + textLength >= offset) {
          range.setStart(node, offset - currentOffset);
          range.collapse(true);
          found = true;
          return true;
        }
        currentOffset += textLength;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          if (traverseNodes(node.childNodes[i])) return true;
        }
      }
      return false;
    };
    
    traverseNodes(element);
    
    if (found) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, []);

  // Focus on cell
  const focusCell = useCallback((rowIndex: number, colIndex: number, atEnd: boolean = false) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const cell = cellRefs.current.get(cellKey);
    if (cell) {
      cell.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(cell);
      range.collapse(!atEnd); // true for start, false for end
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, []);

  // Update cell
  const handleCellUpdate = useCallback((rowIndex: number, colIndex: number, content: string) => {
    const newCells = cells.map((row, rIdx) => 
      row.map((cell, cIdx) => (rIdx === rowIndex && cIdx === colIndex) ? content : cell)
    );
    onTableDataUpdate?.(block.id, newCells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Insert row
  const insertRow = useCallback((index: number, position: 'above' | 'below') => {
    const newRow = Array(columnCount).fill('');
    const insertIndex = position === 'above' ? index : index + 1;
    const newCells = [
      ...cells.slice(0, insertIndex),
      newRow,
      ...cells.slice(insertIndex)
    ];
    const newRowBackgroundColors = [
      ...rowBackgroundColors.slice(0, insertIndex),
      'default',
      ...rowBackgroundColors.slice(insertIndex)
    ];
    const newRowTextColors = [
      ...rowTextColors.slice(0, insertIndex),
      'default',
      ...rowTextColors.slice(insertIndex)
    ];
    onTableDataUpdate?.(block.id, newCells, columnWidths, newRowBackgroundColors, columnBackgroundColors, newRowTextColors, columnTextColors);
    setActionMenu(null);
  }, [block.id, cells, columnCount, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Delete row
  const deleteRow = useCallback((index: number) => {
    if (cells.length <= 2) return; // Minimum 2 rows
    const newCells = cells.filter((_, idx) => idx !== index);
    const newRowBackgroundColors = rowBackgroundColors.filter((_, idx) => idx !== index);
    const newRowTextColors = rowTextColors.filter((_, idx) => idx !== index);
    onTableDataUpdate?.(block.id, newCells, columnWidths, newRowBackgroundColors, columnBackgroundColors, newRowTextColors, columnTextColors);
    setActionMenu(null);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Duplicate row
  const duplicateRow = useCallback((index: number) => {
    const duplicatedRow = [...cells[index]];
    const newCells = [
      ...cells.slice(0, index + 1),
      duplicatedRow,
      ...cells.slice(index + 1)
    ];
    const newRowBackgroundColors = [
      ...rowBackgroundColors.slice(0, index + 1),
      rowBackgroundColors[index],
      ...rowBackgroundColors.slice(index + 1)
    ];
    const newRowTextColors = [
      ...rowTextColors.slice(0, index + 1),
      rowTextColors[index],
      ...rowTextColors.slice(index + 1)
    ];
    onTableDataUpdate?.(block.id, newCells, columnWidths, newRowBackgroundColors, columnBackgroundColors, newRowTextColors, columnTextColors);
    setActionMenu(null);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Change row background color
  const changeRowBackgroundColor = useCallback((index: number, color: string) => {
    const newRowBackgroundColors = [...rowBackgroundColors];
    newRowBackgroundColors[index] = color;
    onTableDataUpdate?.(block.id, cells, columnWidths, newRowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Change row text color
  const changeRowTextColor = useCallback((index: number, color: string) => {
    const newRowTextColors = [...rowTextColors];
    newRowTextColors[index] = color;
    onTableDataUpdate?.(block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, newRowTextColors, columnTextColors);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Insert column
  const insertColumn = useCallback((index: number, position: 'left' | 'right') => {
    const insertIndex = position === 'left' ? index : index + 1;
    const newCells = cells.map(row => [
      ...row.slice(0, insertIndex),
      '',
      ...row.slice(insertIndex)
    ]);
    
    // Recalculate column widths
    const newColumnCount = columnCount + 1;
    const newWidth = 100 / newColumnCount;
    const newWidths = Array(newColumnCount).fill(newWidth);
    
    const newColumnBackgroundColors = [
      ...columnBackgroundColors.slice(0, insertIndex),
      'default',
      ...columnBackgroundColors.slice(insertIndex)
    ];
    
    const newColumnTextColors = [
      ...columnTextColors.slice(0, insertIndex),
      'default',
      ...columnTextColors.slice(insertIndex)
    ];
    
    onTableDataUpdate?.(block.id, newCells, newWidths, rowBackgroundColors, newColumnBackgroundColors, rowTextColors, newColumnTextColors);
    setActionMenu(null);
  }, [block.id, cells, columnCount, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Delete column
  const deleteColumn = useCallback((index: number) => {
    if (columnCount <= 2) return; // Minimum 2 columns
    const newCells = cells.map(row => row.filter((_, idx) => idx !== index));
    
    // Recalculate column widths
    const newColumnCount = columnCount - 1;
    const newWidths = Array(newColumnCount).fill(100 / newColumnCount);
    
    const newColumnBackgroundColors = columnBackgroundColors.filter((_, idx) => idx !== index);
    const newColumnTextColors = columnTextColors.filter((_, idx) => idx !== index);
    
    onTableDataUpdate?.(block.id, newCells, newWidths, rowBackgroundColors, newColumnBackgroundColors, rowTextColors, newColumnTextColors);
    setActionMenu(null);
  }, [block.id, cells, columnCount, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Duplicate column
  const duplicateColumn = useCallback((index: number) => {
    const newCells = cells.map(row => [
      ...row.slice(0, index + 1),
      row[index],
      ...row.slice(index + 1)
    ]);
    
    const newColumnCount = columnCount + 1;
    const newWidth = 100 / newColumnCount;
    const newWidths = Array(newColumnCount).fill(newWidth);
    
    const newColumnBackgroundColors = [
      ...columnBackgroundColors.slice(0, index + 1),
      columnBackgroundColors[index],
      ...columnBackgroundColors.slice(index + 1)
    ];
    
    const newColumnTextColors = [
      ...columnTextColors.slice(0, index + 1),
      columnTextColors[index],
      ...columnTextColors.slice(index + 1)
    ];
    
    onTableDataUpdate?.(block.id, newCells, newWidths, rowBackgroundColors, newColumnBackgroundColors, rowTextColors, newColumnTextColors);
    setActionMenu(null);
  }, [block.id, cells, columnCount, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Change column background color
  const changeColumnBackgroundColor = useCallback((index: number, color: string) => {
    const newColumnBackgroundColors = [...columnBackgroundColors];
    newColumnBackgroundColors[index] = color;
    onTableDataUpdate?.(block.id, cells, columnWidths, rowBackgroundColors, newColumnBackgroundColors, rowTextColors, columnTextColors);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Change column text color
  const changeColumnTextColor = useCallback((index: number, color: string) => {
    const newColumnTextColors = [...columnTextColors];
    newColumnTextColors[index] = color;
    onTableDataUpdate?.(block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, newColumnTextColors);
  }, [block.id, cells, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Add row at the end
  const addRowAtEnd = useCallback(() => {
    const newRow = Array(columnCount).fill('');
    const newCells = [...cells, newRow];
    const newRowBackgroundColors = [...rowBackgroundColors, 'default'];
    const newRowTextColors = [...rowTextColors, 'default'];
    onTableDataUpdate?.(block.id, newCells, columnWidths, newRowBackgroundColors, columnBackgroundColors, newRowTextColors, columnTextColors);
  }, [block.id, cells, columnCount, columnWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Add column at the end
  const addColumnAtEnd = useCallback(() => {
    const newCells = cells.map(row => [...row, '']);
    const newColumnCount = columnCount + 1;
    const newWidths = Array(newColumnCount).fill(100 / newColumnCount);
    const newColumnBackgroundColors = [...columnBackgroundColors, 'default'];
    const newColumnTextColors = [...columnTextColors, 'default'];
    onTableDataUpdate?.(block.id, newCells, newWidths, rowBackgroundColors, newColumnBackgroundColors, rowTextColors, newColumnTextColors);
  }, [block.id, cells, columnCount, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Resize column
  const handleResizeStart = useCallback((columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isResizingRef.current || columnIndex >= columnCount - 1) {
      return;
    }
    
    if (resizeCleanupRef.current) {
      resizeCleanupRef.current();
    }
    
    isResizingRef.current = true;
    setIsResizing(true);
    setResizingIndex(columnIndex);
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    
    const startX = e.clientX;
    const containerWidth = tableRef.current?.offsetWidth || 0;
    const startWidths = [...columnWidths];
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      const newWidths = [...startWidths];
      const currentWidth = startWidths[columnIndex];
      const nextWidth = startWidths[columnIndex + 1];
      
      const minWidth = 10;
      const maxCurrentWidth = currentWidth + nextWidth - minWidth;
      
      let newCurrentWidth = currentWidth + deltaPercent;
      let newNextWidth = nextWidth - deltaPercent;
      
      if (newCurrentWidth < minWidth) {
        newCurrentWidth = minWidth;
        newNextWidth = currentWidth + nextWidth - minWidth;
      } else if (newCurrentWidth > maxCurrentWidth) {
        newCurrentWidth = maxCurrentWidth;
        newNextWidth = minWidth;
      }
      
      newWidths[columnIndex] = newCurrentWidth;
      newWidths[columnIndex + 1] = newNextWidth;
      
      onTableDataUpdate?.(block.id, cells, newWidths, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors);
    };
    
    const cleanup = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      setResizingIndex(null);
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      document.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mouseup', handleMouseUp, true);
      
      resizeCleanupRef.current = null;
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      upEvent.stopPropagation();
      cleanup();
    };
    
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);
    
    resizeCleanupRef.current = cleanup;
  }, [columnWidths, columnCount, block.id, cells, rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors, onTableDataUpdate]);

  // Open row actions menu
  const handleRowDotsClick = useCallback((rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenu({
      type: 'row',
      index: rowIndex,
      position: { x: rect.right, y: rect.top }
    });
  }, []);

  // Open column actions menu
  const handleColumnDotsClick = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenu({
      type: 'column',
      index: colIndex,
      position: { x: rect.left, y: rect.bottom }
    });
  }, []);

  // Handle Tab and arrow keys for navigation
  const handleCellKeyDown = useCallback((rowIndex: number, colIndex: number, e: React.KeyboardEvent) => {
    // Use app undo/redo (same as other blocks). Native undo in table cells fights React
    // controlled HTML and duplicates text after formatting + Ctrl+Z.
    if ((e.ctrlKey || e.metaKey) && e.key === KEY_Z) {
      e.preventDefault();
      e.stopPropagation();
      onKeyDown(e, block.id, index);
      return;
    }

    // Handle Tab
    if (e.key === KEY_TAB) {
      e.preventDefault();
      e.stopPropagation();
      
      let nextRow = rowIndex;
      let nextCol = colIndex;
      
      if (e.shiftKey) {
        // Shift+Tab - previous cell
        nextCol--;
        if (nextCol < 0) {
          nextRow--;
          nextCol = columnCount - 1;
        }
        if (nextRow < 0) {
          // Exit table
          return;
        }
      } else {
        // Tab - next cell
        nextCol++;
        if (nextCol >= columnCount) {
          nextRow++;
          nextCol = 0;
        }
        
        // If we reached the end of the table, add a new row
        if (nextRow >= rowCount) {
          addRowAtEnd();
          nextRow = rowCount;
          nextCol = 0;
        }
      }
      
      // Focus the next cell
      setTimeout(() => {
        focusCell(nextRow, nextCol, false);
      }, 10);
      return;
    }
    
    // Handle arrows - move between cells
    if (e.key === KEY_ARROW_LEFT && colIndex > 0) {
      e.preventDefault();
      e.stopPropagation();
      focusCell(rowIndex, colIndex - 1, true);
      return;
    }
    
    if (e.key === KEY_ARROW_RIGHT && colIndex < columnCount - 1) {
      e.preventDefault();
      e.stopPropagation();
      focusCell(rowIndex, colIndex + 1, false);
      return;
    }
    
    if (e.key === KEY_ARROW_UP && rowIndex > 0) {
      e.preventDefault();
      e.stopPropagation();
      focusCell(rowIndex - 1, colIndex, false);
      return;
    }
    
    if (e.key === KEY_ARROW_DOWN && rowIndex < rowCount - 1) {
      e.preventDefault();
      e.stopPropagation();
      focusCell(rowIndex + 1, colIndex, false);
      return;
    }
  }, [columnCount, rowCount, addRowAtEnd, focusCell, onKeyDown, block.id, index]);

  // Register ref for cell
  const setCellRef = useCallback((rowIndex: number, colIndex: number, el: HTMLDivElement | null) => {
    const key = `${rowIndex}-${colIndex}`;
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  // Get color classes for cell (combination of row and column colors)
  const getCellColorClasses = useCallback((rowIndex: number, colIndex: number) => {
    const rowBgColor = rowBackgroundColors[rowIndex] || 'default';
    const colBgColor = columnBackgroundColors[colIndex] || 'default';
    const rowTxtColor = rowTextColors[rowIndex] || 'default';
    const colTxtColor = columnTextColors[colIndex] || 'default';
    
    // Determine background color (row takes priority)
    let backgroundClass = 'bg-transparent';
    if (rowBgColor !== 'default') {
      const colorConfig = BACKGROUND_COLORS.find(c => c.value === rowBgColor);
      backgroundClass = colorConfig?.colorClass || 'bg-transparent';
    } else if (colBgColor !== 'default') {
      const colorConfig = BACKGROUND_COLORS.find(c => c.value === colBgColor);
      backgroundClass = colorConfig?.colorClass || 'bg-transparent';
    }
    
    // Determine text color (row takes priority)
    let textClass = 'text-black dark:text-gray-100';
    if (rowTxtColor !== 'default') {
      const colorConfig = TEXT_COLORS.find(c => c.value === rowTxtColor);
      textClass = colorConfig?.colorClass || 'text-black dark:text-gray-100';
    } else if (colTxtColor !== 'default') {
      const colorConfig = TEXT_COLORS.find(c => c.value === colTxtColor);
      textClass = colorConfig?.colorClass || 'text-black dark:text-gray-100';
    }
    
    return `${backgroundClass} ${textClass}`;
  }, [rowBackgroundColors, columnBackgroundColors, rowTextColors, columnTextColors]);
 
  const renderCellContent = useCallback((cellContent: string, rowIndex: number, colIndex: number) => {
    return (
      <div
        ref={(el) => setCellRef(rowIndex, colIndex, el)}
        contentEditable
        suppressContentEditableWarning
        data-table-cell="true"
        className="outline-none min-h-[1.5em] break-words before:content-none"
        dangerouslySetInnerHTML={{ __html: cellContent }}
        onBlur={(e) => {
          const element = e.currentTarget as HTMLElement;
          const content = element.innerHTML;
          if (content !== cellContent) {
            handleCellUpdate(rowIndex, colIndex, content);
          }
        }}
        onBeforeInput={(e) => {
          const element = e.currentTarget as HTMLElement;
          const offset = saveCursorPosition(element);
          if (offset !== null) {
            element.dataset.cursorOffset = String(offset);
          }
        }}
        onInput={(e) => {
          const element = e.currentTarget as HTMLElement;
          const content = element.innerHTML;
          const offset = saveCursorPosition(element);
          handleCellUpdate(rowIndex, colIndex, content);
          if (offset !== null) {
            setTimeout(() => {
              restoreCursorPosition(element, offset);
            }, 0);
          }
        }}
        onKeyDown={(e) => handleCellKeyDown(rowIndex, colIndex, e)}
      />
    );
  }, [setCellRef, saveCursorPosition, handleCellUpdate, restoreCursorPosition, handleCellKeyDown]);

  return (
    <div 
      className="w-full my-2 relative"
      data-block-id={block.id}
      onMouseDown={(e) => {
        // Stop propagation for all clicks in the table area
        e.stopPropagation();
      }}
    >
      {/* Container with horizontal scroll */}
      <div 
        ref={containerRef}
        onMouseLeave={() => {
          setHoveredColumn(null);
          setShowBottomPlus(false);
          setShowRightPlus(false);
        }}
      >
        <div className="inline-block min-w-full relative group/table pr-8">
          {/* Column control buttons */}
          <div className="h-8 flex z-20">
            {cells[0]?.map((_, colIndex) => {
              const columnWidth = columnWidths[colIndex];
              
              return (
                <div
                  key={colIndex}
                  className="relative opacity-0 group-hover/table:opacity-100 transition-opacity"
                  style={{ 
                    width: `${columnWidth}%`,
                  }}
                  onMouseEnter={() => setHoveredColumn(colIndex)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {hoveredColumn === colIndex && (
                    <button
                      type="button"
                      className="absolute p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer z-10"
                      style={{ top: '35px', left: '50%', transform: 'translate(-50%, -50%)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColumnDotsClick(colIndex, e);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      aria-label={t('editor.columnMenu')}
                    >
                      <svg width="20" height="12" viewBox="0 0 20 12" fill="currentColor" className="text-gray-600 dark:text-gray-400">
                        {/* First row of dots */}
                        <circle cx="4" cy="3" r="1.5" />
                        <circle cx="10" cy="3" r="1.5" />
                        <circle cx="16" cy="3" r="1.5" />
                        {/* Second row of dots */}
                        <circle cx="4" cy="9" r="1.5" />
                        <circle cx="10" cy="9" r="1.5" />
                        <circle cx="16" cy="9" r="1.5" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Tooltip with percentages during resize */}
                  {isResizing && resizingIndex === colIndex && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-[100] bg-black/75 text-white text-xs px-2 py-1 rounded pointer-events-none whitespace-nowrap">
                      {Math.round(columnWidths[colIndex])}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Table built from div elements */}
          <div ref={tableRef} className="w-full">
            {cells.map((row, rowIndex) => (
              <div 
                key={rowIndex}
                className="relative group/row flex"
              >
                {/* Row header with 6 dots */}
                <button
                  type="button"
                  style={{ left: '-10px', zIndex: 1000 }}
                  className="absolute top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded cursor-pointer z-10 opacity-0 group-hover/row:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowDotsClick(rowIndex, e);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label={t('editor.rowMenu')}
                >
                  <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor" className="text-gray-600 dark:text-gray-400">
                    {/* First column of dots */}
                    <circle cx="3" cy="4" r="1.5" />
                    <circle cx="3" cy="10" r="1.5" />
                    <circle cx="3" cy="16" r="1.5" />
                    {/* Second column of dots */}
                    <circle cx="9" cy="4" r="1.5" />
                    <circle cx="9" cy="10" r="1.5" />
                    <circle cx="9" cy="16" r="1.5" />
                  </svg>
                </button>
                
                {/* Table cells */}
                {row.map((cell, colIndex) => {
                  const cellColorClasses = getCellColorClasses(rowIndex, colIndex);
                  return (
                    <div 
                      key={colIndex}
                      className={`p-2 relative ${cellColorClasses} border-2 border-gray-300 dark:border-gray-600 ${
                        colIndex > 0 ? '-ml-[2px]' : ''
                      } ${rowIndex > 0 ? '-mt-[2px]' : ''}`}
                      style={{ width: `${columnWidths[colIndex]}%` }}
                      onMouseDown={(e) => {
                        // If click is on cell padding (not contentEditable), focus contentEditable
                        const target = e.target as HTMLElement;
                        if (!target.isContentEditable && target.hasAttribute('class') && target.className.includes('p-2')) {
                          e.preventDefault();
                          e.stopPropagation();
                          requestAnimationFrame(() => {
                            const cellKey = `${rowIndex}-${colIndex}`;
                            const cell = cellRefs.current.get(cellKey);
                            if (cell) {
                              cell.focus();
                              const range = document.createRange();
                              const sel = window.getSelection();
                              range.selectNodeContents(cell);
                              range.collapse(true);
                              sel?.removeAllRanges();
                              sel?.addRange(range);
                            }
                          });
                        }
                      }}
                    >
                      {renderCellContent(cell, rowIndex, colIndex)}
                    
                      {/* Handle for column resize */}
                      {colIndex < columnCount - 1 && (
                        <div
                          className={`absolute top-0 bottom-0 right-0 w-3 cursor-col-resize z-30 transition-colors pointer-events-auto ${
                            isResizing && resizingIndex === colIndex
                              ? 'bg-blue-400 dark:bg-blue-500'
                              : 'hover:bg-blue-400 dark:hover:bg-blue-500'
                          }`}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleResizeStart(colIndex, e);
                          }}
                          onMouseEnter={(e) => e.stopPropagation()}
                          style={{ transform: 'translateX(50%)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Row with + button to add row below */}
            <div 
              className="relative h-8"
              onMouseEnter={() => setShowBottomPlus(true)}
              onMouseLeave={() => setShowBottomPlus(false)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {showBottomPlus && (
                <button
                  type="button"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-[#0086F4] hover:bg-[#ff4520] text-white rounded-full cursor-pointer z-10"
                  onClick={addRowAtEnd}
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label={t('editor.addRow')}
                >
                  +
                </button>
              )}
            </div>
          </div>
          
          {/* Hover area and + button to add column on the right */}
          <div 
            className="absolute top-0 bottom-0 -right-4 w-8 z-10"
            onMouseEnter={() => setShowRightPlus(true)}
            onMouseLeave={() => setShowRightPlus(false)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {showRightPlus && (
              <button
                type="button"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-[#0086F4] hover:bg-[#ff4520] text-white rounded-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  addColumnAtEnd();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                aria-label={t('editor.addColumn')}
              >
                +
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Row/column actions menu */}
      {actionMenu && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setActionMenu(null)}
          />
          <div
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{
              left: actionMenu.position.x,
              top: actionMenu.position.y,
            }}
          >
            {actionMenu.type === 'row' ? (
              <>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => insertRow(actionMenu.index, 'above')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 dark:text-gray-400">
                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.insertAbove')}</span>
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => insertRow(actionMenu.index, 'below')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 dark:text-gray-400">
                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.insertBelow')}</span>
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => duplicateRow(actionMenu.index)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 dark:text-gray-400">
                    <path d="M5 5V3C5 2.44772 5.44772 2 6 2H13C13.5523 2 14 2.44772 14 3V10C14 10.5523 13.5523 11 13 11H11M3 5H10C10.5523 5 11 5.44772 11 6V13C11 13.5523 10.5523 14 10 14H3C2.44772 14 2 13.5523 2 13V6C2 5.44772 2.44772 5 3 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.duplicate')}</span>
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => setColorSubmenu(true)}
                  onMouseLeave={() => setColorSubmenu(false)}
                >
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
                      </div>
                      <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.color')}</span>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-gray-400">
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {/* Row color picker submenu */}
                  {colorSubmenu && (
                    <div
                      className="absolute left-full top-0 ml-1 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] max-h-[350px] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Text color section */}
                      <div className="px-2.5 py-0.5">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('editor.textColor')}
                        </span>
                      </div>
                      {TEXT_COLORS.map((color) => {
                        const currentColor = rowTextColors[actionMenu.index];
                        const isCurrent = color.value === currentColor;
                        
                        return (
                          <button
                            key={color.value}
                            type="button"
                            className="w-full text-left px-2.5 py-1 flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => changeRowTextColor(actionMenu.index, color.value)}
                          >
                            <div className="flex items-center justify-center w-3 h-3">
                              {isCurrent && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              )}
                            </div>
                            <span className={`text-xs ${color.colorClass}`}>A</span>
                            <span className="text-xs text-gray-900 dark:text-gray-100">{t(color.labelKey)}</span>
                          </button>
                        );
                      })}
                      
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5" />
                      
                      {/* Background color section */}
                      <div className="px-2.5 py-0.5">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('editor.backgroundColor')}
                        </span>
                      </div>
                      {BACKGROUND_COLORS.map((color) => {
                        const currentColor = rowBackgroundColors[actionMenu.index];
                        const isCurrent = color.value === currentColor;
                        
                        return (
                          <button
                            key={color.value}
                            type="button"
                            className="w-full text-left px-2.5 py-1 flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => changeRowBackgroundColor(actionMenu.index, color.value)}
                          >
                            <div className="flex items-center justify-center w-3 h-3">
                              {isCurrent && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              )}
                            </div>
                            <div className={`w-3 h-3 rounded ${color.colorClass} border border-gray-300 dark:border-gray-600`} />
                            <span className="text-xs text-gray-900 dark:text-gray-100">{t(color.labelKey)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-0.5"></div>
                <button
                  type="button"
                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 ${
                    cells.length <= 2
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}
                  onClick={() => deleteRow(actionMenu.index)}
                  disabled={cells.length <= 2}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-current">
                    <path d="M4 6V14H12V6M2 4H14M6 4V2H10V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-current">{t('editor.deleteRow')}</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => insertColumn(actionMenu.index, 'left')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 dark:text-gray-400">
                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.insertLeft')}</span>
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => insertColumn(actionMenu.index, 'right')}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 dark:text-gray-400">
                    <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.insertRight')}</span>
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => duplicateColumn(actionMenu.index)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-gray-600 dark:text-gray-400">
                    <path d="M5 5V3C5 2.44772 5.44772 2 6 2H13C13.5523 2 14 2.44772 14 3V10C14 10.5523 13.5523 11 13 11H11M3 5H10C10.5523 5 11 5.44772 11 6V13C11 13.5523 10.5523 14 10 14H3C2.44772 14 2 13.5523 2 13V6C2 5.44772 2.44772 5 3 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.duplicate')}</span>
                </button>
                <div
                  className="relative"
                  onMouseEnter={() => setColorSubmenu(true)}
                  onMouseLeave={() => setColorSubmenu(false)}
                >
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" />
                      </div>
                      <span className="text-xs text-gray-900 dark:text-gray-100">{t('editor.color')}</span>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-gray-400">
                      <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {/* Column color picker submenu */}
                  {colorSubmenu && (
                    <div
                      className="absolute left-full top-0 ml-1 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] max-h-[350px] overflow-y-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Text color section */}
                      <div className="px-2.5 py-0.5">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('editor.textColor')}
                        </span>
                      </div>
                      {TEXT_COLORS.map((color) => {
                        const currentColor = columnTextColors[actionMenu.index];
                        const isCurrent = color.value === currentColor;
                        
                        return (
                          <button
                            key={color.value}
                            type="button"
                            className="w-full text-left px-2.5 py-1 flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => changeColumnTextColor(actionMenu.index, color.value)}
                          >
                            <div className="flex items-center justify-center w-3 h-3">
                              {isCurrent && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              )}
                            </div>
                            <span className={`text-xs ${color.colorClass}`}>A</span>
                            <span className="text-xs text-gray-900 dark:text-gray-100">{t(color.labelKey)}</span>
                          </button>
                        );
                      })}
                      
                      <div className="h-px bg-gray-200 dark:bg-gray-700 my-1.5" />
                      
                      {/* Background color section */}
                      <div className="px-2.5 py-0.5">
                        <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('editor.backgroundColor')}
                        </span>
                      </div>
                      {BACKGROUND_COLORS.map((color) => {
                        const currentColor = columnBackgroundColors[actionMenu.index];
                        const isCurrent = color.value === currentColor;
                        
                        return (
                          <button
                            key={color.value}
                            type="button"
                            className="w-full text-left px-2.5 py-1 flex items-center gap-2 transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                            onClick={() => changeColumnBackgroundColor(actionMenu.index, color.value)}
                          >
                            <div className="flex items-center justify-center w-3 h-3">
                              {isCurrent && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                              )}
                            </div>
                            <div className={`w-3 h-3 rounded ${color.colorClass} border border-gray-300 dark:border-gray-600`} />
                            <span className="text-xs text-gray-900 dark:text-gray-100">{t(color.labelKey)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 my-0.5"></div>
                <button
                  type="button"
                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 ${
                    columnCount <= 2
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                  }`}
                  onClick={() => deleteColumn(actionMenu.index)}
                  disabled={columnCount <= 2}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-current">
                    <path d="M4 6V14H12V6M2 4H14M6 4V2H10V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="text-xs text-current">{t('editor.deleteColumn')}</span>
                </button>
              </>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

