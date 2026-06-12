import { useState, useRef, useCallback, useEffect } from 'react';
import { DrawingStroke, DrawingPoint } from '@/types/editor';

interface UseImageDrawingProps {
  imageWidth: number;
  imageHeight: number;
  initialStrokes?: DrawingStroke[];
  onSaveDrawing: (strokes: DrawingStroke[]) => void;
  onStrokeProgress?: (points: DrawingPoint[], color: string, thickness: number) => void;
  onStrokeComplete?: (stroke: DrawingStroke) => void;
  onDrawingAction?: (strokes: DrawingStroke[]) => void;
  remoteCurrentStroke?: { points: DrawingPoint[]; color: string; thickness: number };
  remoteStrokes?: DrawingStroke[];
}

interface UseImageDrawingReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  displayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDrawingMode: boolean;
  setIsDrawingMode: (mode: boolean) => void;
  color: string;
  setColor: (color: string) => void;
  thickness: number;
  setThickness: (thickness: number) => void;
  strokes: DrawingStroke[];
  clearCanvas: () => void;
  saveDrawing: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasRemoteDrawing: boolean;
}

export const useImageDrawing = ({
  imageWidth,
  imageHeight,
  initialStrokes = [],
  onSaveDrawing,
  onStrokeProgress,
  onStrokeComplete,
  onDrawingAction,
  remoteCurrentStroke,
  remoteStrokes,
}: UseImageDrawingProps): UseImageDrawingReturn => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#FF0000');
  const [thickness, setThickness] = useState(3);
  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialStrokes);
  const [currentStroke, setCurrentStroke] = useState<DrawingPoint[]>([]);
  const initialStrokesLoadedRef = useRef(false);
  const throttleRef = useRef<number | null>(null);

  // History for undo/redo - each entry is a snapshot of strokes after a drawing action
  const historyRef = useRef<DrawingStroke[][]>([initialStrokes]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const hasRemoteDrawing = !!(
    (remoteCurrentStroke && remoteCurrentStroke.points.length > 0) ||
    (remoteStrokes && remoteStrokes.length > 0)
  );

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Push a new strokes snapshot to history (called after each stroke or clear)
  const pushHistory = useCallback((newStrokes: DrawingStroke[]) => {
    // Truncate any future history if we've undone steps
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newStrokes);
    historyIndexRef.current = historyRef.current.length - 1;
    updateUndoRedoState();
  }, [updateUndoRedoState]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const newStrokes = historyRef.current[historyIndexRef.current];
    setStrokes(newStrokes);
    updateUndoRedoState();
    onDrawingAction?.(newStrokes);
  }, [updateUndoRedoState, onDrawingAction]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const newStrokes = historyRef.current[historyIndexRef.current];
    setStrokes(newStrokes);
    updateUndoRedoState();
    onDrawingAction?.(newStrokes);
  }, [updateUndoRedoState, onDrawingAction]);

  // Convert screen coordinates to relative (0-1)
  const getRelativeCoordinates = useCallback(
    (e: MouseEvent): DrawingPoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      return { x, y };
    },
    []
  );


  // Drawing start handler
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!isDrawingMode) return;

      e.stopPropagation();
      if (e.cancelable) {
        e.preventDefault();
      }

      const point = getRelativeCoordinates(e);
      setIsDrawing(true);
      setCurrentStroke([point]);
    },
    [isDrawingMode, getRelativeCoordinates]
  );

  // Mouse move handler
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing || !isDrawingMode) return;

      const point = getRelativeCoordinates(e);
      setCurrentStroke((prev) => {
        const updated = [...prev, point];

        if (onStrokeProgress && !throttleRef.current) {
          throttleRef.current = window.setTimeout(() => {
            throttleRef.current = null;
            onStrokeProgress(updated, color, thickness);
          }, 30);
        }

        return updated;
      });
    },
    [isDrawing, isDrawingMode, getRelativeCoordinates, onStrokeProgress, color, thickness]
  );

  // Drawing end handler
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !isDrawingMode) return;

    if (currentStroke.length > 1) {
      const newStroke: DrawingStroke = {
        points: currentStroke,
        color,
        thickness,
      };
      const newStrokes = [...strokes, newStroke];
      pushHistory(newStrokes);
      setStrokes(newStrokes);
      onStrokeComplete?.(newStroke);
    }

    setIsDrawing(false);
    setCurrentStroke([]);

    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
  }, [isDrawing, isDrawingMode, currentStroke, color, thickness, strokes, pushHistory, onStrokeComplete]);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
    pushHistory([]);
    onDrawingAction?.([]);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transformation and clear the entire canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, [pushHistory, onDrawingAction]);

  const saveDrawing = useCallback(() => {
    const merged = remoteStrokes && remoteStrokes.length > 0
      ? [...strokes, ...remoteStrokes]
      : strokes;
    onSaveDrawing(merged);
    setIsDrawingMode(false);
    setCurrentStroke([]);
  }, [strokes, remoteStrokes, onSaveDrawing]);

  const renderStrokes = useCallback((ctx: CanvasRenderingContext2D, strokeList: DrawingStroke[], w: number, h: number) => {
    strokeList.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * w, stroke.points[i].y * h);
      }

      ctx.stroke();
    });
  }, []);

  // Combined canvas setup and rendering
  useEffect(() => {
    if (imageWidth === 0 || imageHeight === 0) return;

    const dpr = window.devicePixelRatio || 1;
    
    // Determine which canvas to use
    const canvas = isDrawingMode ? canvasRef.current : displayCanvasRef.current;
    if (!canvas) return;

    // Set up canvas dimensions
    canvas.width = imageWidth * dpr;
    canvas.height = imageHeight * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and configure context
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Render saved local strokes
    renderStrokes(ctx, strokes, imageWidth, imageHeight);

    // Render remote completed strokes (both in drawing mode and display mode)
    if (remoteStrokes && remoteStrokes.length > 0) {
      renderStrokes(ctx, remoteStrokes, imageWidth, imageHeight);
    }

    // Render remote in-progress stroke
    if (remoteCurrentStroke && remoteCurrentStroke.points.length > 1) {
      ctx.strokeStyle = remoteCurrentStroke.color;
      ctx.lineWidth = remoteCurrentStroke.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(
        remoteCurrentStroke.points[0].x * imageWidth,
        remoteCurrentStroke.points[0].y * imageHeight,
      );

      for (let i = 1; i < remoteCurrentStroke.points.length; i++) {
        ctx.lineTo(
          remoteCurrentStroke.points[i].x * imageWidth,
          remoteCurrentStroke.points[i].y * imageHeight,
        );
      }

      ctx.stroke();
    }

    // Render current stroke (drawing mode only)
    if (isDrawingMode && currentStroke.length > 0) {
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const firstPoint = {
        x: currentStroke[0].x * imageWidth,
        y: currentStroke[0].y * imageHeight,
      };
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < currentStroke.length; i++) {
        const point = {
          x: currentStroke[i].x * imageWidth,
          y: currentStroke[i].y * imageHeight,
        };
        ctx.lineTo(point.x, point.y);
      }

      ctx.stroke();
    }

    ctx.restore();
  }, [isDrawingMode, strokes, currentStroke, color, thickness, imageWidth, imageHeight, remoteCurrentStroke, remoteStrokes, renderStrokes]);

  // Add mouse event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawingMode) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDrawingMode, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts for undo/redo while in drawing mode
  useEffect(() => {
    if (!isDrawingMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        undo();
      } else if (
        (isMod && e.key === 'z' && e.shiftKey) ||
        (isMod && e.key === 'y')
      ) {
        e.preventDefault();
        e.stopPropagation();
        redo();
      }
    };

    // Use capture phase so we intercept before the editor's own undo/redo
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isDrawingMode, undo, redo]);

  // Initialize history when entering drawing mode
  useEffect(() => {
    if (isDrawingMode) {
      historyRef.current = [strokes];
      historyIndexRef.current = 0;
      updateUndoRedoState();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawingMode]);

  // Load initial strokes only once on mount
  useEffect(() => {
    if (!initialStrokesLoadedRef.current) {
      setStrokes(initialStrokes);
      historyRef.current = [initialStrokes];
      historyIndexRef.current = 0;
      updateUndoRedoState();
      initialStrokesLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  return {
    canvasRef,
    displayCanvasRef,
    isDrawingMode,
    setIsDrawingMode,
    color,
    setColor,
    thickness,
    setThickness,
    strokes,
    clearCanvas,
    saveDrawing,
    undo,
    redo,
    canUndo,
    canRedo,
    hasRemoteDrawing,
  };
};
