import { Block, DrawingStroke, DrawingPoint } from '@/types/editor';

/**
 * Collaboration is not part of the open-source v1. This module retains the
 * public type surface that the editor components reference, plus an inert hook,
 * so a realtime transport can be reintroduced later without touching the UI.
 * No socket connection is established.
 */

export interface LessonCollabUser {
  socketId: string;
  id: number;
  email: string;
  name: string;
  userType: string;
  color: string;
  avatarPath?: string;
}

export interface RemoteCursorData {
  socketId: string;
  user: { id: string; name: string; color: string };
  position?: { blockId: string; offset: number };
  blockId?: string;
}

export interface RemoteDrawingBlockState {
  currentStroke?: { points: DrawingPoint[]; color: string; thickness: number };
  strokes?: DrawingStroke[];
}

export type RemoteDrawingState = Record<string, RemoteDrawingBlockState>;

export interface LessonTimerState {
  endTime: number | null;
  remainingMs: number;
  totalDurationMs: number;
  isRunning: boolean;
  isPaused: boolean;
}

export interface RemoteBlockUpdate {
  blocks: Block[];
  changedBlockIds: string[];
  isStructuralChange: boolean;
}

export interface ExerciseActiveUser {
  socketId: string;
  id: number;
  name: string;
  color: string;
  avatarPath?: string;
}

export interface RemoteExerciseInteraction {
  socketId: string;
  user: ExerciseActiveUser;
  state: any;
}

/** No-op collaboration hook. Returns inert defaults; establishes no socket. */
export function useLessonCollaboration(_props?: unknown) {
  const noop = () => {};
  return {
    connectedUsers: [] as LessonCollabUser[],
    remoteCursors: [] as RemoteCursorData[],
    remoteBlocks: null as Block[] | null,
    remoteBlockUpdate: null as RemoteBlockUpdate | null,
    isRemoteUpdate: false,
    scrollToBlockId: null as string | null,
    remoteDrawingState: {} as RemoteDrawingState,
    timerState: null as LessonTimerState | null,
    timerEnded: false,
    exerciseActiveUsers: {} as Record<string, ExerciseActiveUser[]>,
    remoteExerciseInteractions: {} as Record<string, RemoteExerciseInteraction[]>,
    emitCursorPosition: noop,
    emitBringToMe: noop,
    clearScrollToBlock: noop,
    emitDrawingStrokeProgress: noop,
    emitDrawingStrokeComplete: noop,
    emitDrawingAction: noop,
    emitOpenForStudents: noop,
    emitExerciseFocus: noop,
    emitExerciseBlur: noop,
    emitExerciseInteraction: noop,
  };
}
