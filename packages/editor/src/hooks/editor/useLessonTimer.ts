import { useState, useEffect, useCallback, useRef } from 'react';
import { LessonTimerState } from './useLessonCollaboration';

interface UseLessonTimerProps {
  timerState: LessonTimerState | null;
  timerEnded: boolean;
  emitTimerStart: (durationMs: number) => void;
  emitTimerPause: () => void;
  emitTimerResume: () => void;
  emitTimerReset: () => void;
  clearTimerEnded: () => void;
  isTeacher: boolean;
}

export interface LessonTimerControls {
  remainingMs: number;
  totalDurationMs: number;
  isRunning: boolean;
  isPaused: boolean;
  hasEnded: boolean;
  isActive: boolean;
  startTimer: (durationMs: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  dismissEnd: () => void;
  isTeacher: boolean;
}

export function useLessonTimer({
  timerState,
  timerEnded,
  emitTimerStart,
  emitTimerPause,
  emitTimerResume,
  emitTimerReset,
  clearTimerEnded,
  isTeacher,
}: UseLessonTimerProps): LessonTimerControls {
  const [remainingMs, setRemainingMs] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (!timerState) {
      setRemainingMs(0);
      return;
    }

    if (timerState.isRunning && timerState.endTime) {
      const tick = () => {
        const now = Date.now();
        const remaining = Math.max(0, timerState.endTime! - now);
        setRemainingMs(remaining);
        if (remaining > 0) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      tick();

      return () => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      };
    }

    if (timerState.isPaused) {
      setRemainingMs(timerState.remainingMs);
      return;
    }

    setRemainingMs(timerState.remainingMs);
  }, [timerState]);

  const startTimer = useCallback((durationMs: number) => {
    if (!isTeacher) return;
    emitTimerStart(durationMs);
  }, [isTeacher, emitTimerStart]);

  const pauseTimer = useCallback(() => {
    if (!isTeacher) return;
    emitTimerPause();
  }, [isTeacher, emitTimerPause]);

  const resumeTimer = useCallback(() => {
    if (!isTeacher) return;
    emitTimerResume();
  }, [isTeacher, emitTimerResume]);

  const resetTimer = useCallback(() => {
    if (!isTeacher) return;
    emitTimerReset();
  }, [isTeacher, emitTimerReset]);

  const dismissEnd = useCallback(() => {
    clearTimerEnded();
  }, [clearTimerEnded]);

  const isActive = !!(timerState && (timerState.isRunning || timerState.isPaused));

  return {
    remainingMs,
    totalDurationMs: timerState?.totalDurationMs || 0,
    isRunning: timerState?.isRunning || false,
    isPaused: timerState?.isPaused || false,
    hasEnded: timerEnded,
    isActive,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    dismissEnd,
    isTeacher,
  };
}
