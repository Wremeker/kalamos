import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Undo2, Redo2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImageDrawingToolbarProps {
  color: string;
  thickness: number;
  onColorChange: (color: string) => void;
  onThicknessChange: (thickness: number) => void;
  onClear: () => void;
  onDone: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Toolbar for drawing on an image
 */
export const ImageDrawingToolbar: React.FC<ImageDrawingToolbarProps> = ({
  color,
  thickness,
  onColorChange,
  onThicknessChange,
  onClear,
  onDone,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) => {
  const { t } = useTranslation();
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600 flex-shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 space-y-4 min-w-[200px]">
        {/* Undo / Redo */}
        <div className="flex gap-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onUndo();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!canUndo}
            title={`${t('editor.undo')} (Ctrl+Z)`}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            {t('editor.undo')}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onRedo();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            variant="outline"
            size="sm"
            className="flex-1"
            disabled={!canRedo}
            title={`${t('editor.redo')} (Ctrl+Shift+Z)`}
          >
            <Redo2 className="h-4 w-4 mr-1" />
            {t('editor.redo')}
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('editor.drawingColor')}
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
            />
            <Input
              type="text"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="flex-1 h-10 text-sm"
              placeholder="#FF0000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('editor.lineThickness', { thickness })}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={thickness}
            onChange={(e) => onThicknessChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {t('editor.clearDrawing')}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            size="sm"
            className="flex-1"
          >
            {t('editor.doneDrawing')}
          </Button>
        </div>
      </div>
    </div>
  );
};

