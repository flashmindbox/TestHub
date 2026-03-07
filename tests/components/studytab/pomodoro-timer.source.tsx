/**
 * Mock PomodoroTimer component for Playwright CT testing.
 *
 * Mirrors the behavior of the real PomodoroTimer from
 * StudyTab/apps/web-vite/src/components/pomodoro/pomodoro-timer.tsx
 * and the pomodoro-store without external dependencies.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type SessionType = 'work' | 'short_break' | 'long_break';
type TimerStatus = 'idle' | 'running' | 'paused';

export interface PomodoroSettings {
  workDuration: number;       // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number;  // minutes
  pomodorosUntilLongBreak: number;
}

interface PomodoroTimerProps {
  settings?: Partial<PomodoroSettings>;
  onComplete?: (sessionType: SessionType) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosUntilLongBreak: 4,
};

const SESSION_LABELS: Record<SessionType, string> = {
  work: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
};

// =============================================================================
// HELPERS
// =============================================================================

function getDurationSeconds(sessionType: SessionType, settings: PomodoroSettings): number {
  switch (sessionType) {
    case 'work':
      return settings.workDuration * 60;
    case 'short_break':
      return settings.shortBreakDuration * 60;
    case 'long_break':
      return settings.longBreakDuration * 60;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PomodoroTimer({ settings: settingsOverride, onComplete }: PomodoroTimerProps) {
  const settings: PomodoroSettings = { ...DEFAULT_SETTINGS, ...settingsOverride };

  const [status, setStatus] = useState<TimerStatus>('idle');
  const [sessionType, setSessionType] = useState<SessionType>('work');
  const [timeRemaining, setTimeRemaining] = useState(() => getDurationSeconds('work', settings));
  const [completedPomodoros, setCompletedPomodoros] = useState(0);

  // Use ref to track latest onComplete to avoid stale closures in interval
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Refs for interval-based tick
  const statusRef = useRef(status);
  const timeRef = useRef(timeRemaining);
  const sessionTypeRef = useRef(sessionType);
  statusRef.current = status;
  timeRef.current = timeRemaining;
  sessionTypeRef.current = sessionType;

  // Tick logic via interval
  useEffect(() => {
    if (status !== 'running') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Schedule completion for next tick to avoid state conflicts
          setTimeout(() => {
            onCompleteRef.current?.(sessionTypeRef.current);
            handleSessionComplete();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleSessionComplete = useCallback(() => {
    setStatus('idle');

    setSessionType((prevType) => {
      setCompletedPomodoros((prevCompleted) => {
        if (prevType === 'work') {
          const newCompleted = prevCompleted + 1;
          const nextType = newCompleted >= settings.pomodorosUntilLongBreak
            ? 'long_break'
            : 'short_break';
          setSessionType(nextType);
          setTimeRemaining(getDurationSeconds(nextType, settings));
          return newCompleted;
        }
        // After a break, go back to work
        const resetCount = prevType === 'long_break' ? 0 : prevCompleted;
        setSessionType('work');
        setTimeRemaining(getDurationSeconds('work', settings));
        return resetCount;
      });
      return prevType; // will be overridden by inner setSessionType
    });
  }, [settings]);

  const start = useCallback(() => {
    setStatus('running');
  }, []);

  const pause = useCallback(() => {
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    setStatus('running');
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setTimeRemaining(getDurationSeconds(sessionType, settings));
  }, [sessionType, settings]);

  const skip = useCallback(() => {
    // Skip current session, move to next
    setStatus('idle');
    if (sessionType === 'work') {
      const nextType = (completedPomodoros + 1) >= settings.pomodorosUntilLongBreak
        ? 'long_break'
        : 'short_break';
      setSessionType(nextType);
      setTimeRemaining(getDurationSeconds(nextType, settings));
    } else {
      // skip break -> go to work
      if (sessionType === 'long_break') {
        setCompletedPomodoros(0);
      }
      setSessionType('work');
      setTimeRemaining(getDurationSeconds('work', settings));
    }
  }, [sessionType, completedPomodoros, settings]);

  const isBreak = sessionType === 'short_break' || sessionType === 'long_break';
  const label = SESSION_LABELS[sessionType];

  return (
    <div data-testid="pomodoro-timer">
      {/* Session label */}
      <div
        className="text-center text-sm text-muted-foreground mb-2"
        data-testid="session-label"
      >
        {isBreak ? 'Break' : label}
      </div>

      {/* Time display */}
      <div
        className="text-center font-mono text-4xl font-bold tabular-nums mb-4"
        data-testid="time-display"
      >
        {formatTime(timeRemaining)}
      </div>

      {/* Session counter */}
      <div
        className="text-center text-sm text-muted-foreground mb-4"
        data-testid="session-counter"
      >
        {completedPomodoros}/{settings.pomodorosUntilLongBreak}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3" data-testid="controls">
        <button
          onClick={reset}
          data-testid="reset-button"
          className="rounded-full p-2 text-muted-foreground hover:text-foreground"
          title="Reset"
        >
          Reset
        </button>

        {status === 'idle' && (
          <button
            onClick={start}
            data-testid="start-button"
            className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            Start
          </button>
        )}

        {status === 'running' && (
          <button
            onClick={pause}
            data-testid="pause-button"
            className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            Pause
          </button>
        )}

        {status === 'paused' && (
          <button
            onClick={resume}
            data-testid="resume-button"
            className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            Resume
          </button>
        )}

        {isBreak && status === 'idle' && (
          <button
            onClick={skip}
            data-testid="skip-break-button"
            className="rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip Break
          </button>
        )}

        {!isBreak && status === 'idle' && (
          <button
            onClick={skip}
            data-testid="skip-button"
            className="rounded-full p-2 text-muted-foreground hover:text-foreground"
            title="Skip"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
