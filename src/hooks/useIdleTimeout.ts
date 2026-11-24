import { useCallback, useEffect, useRef, useState } from 'react';

interface UseIdleTimeoutOptions {
  enabled: boolean;
  idleMs?: number;
  warningMs?: number;
  onTimeout: () => void | Promise<void>;
}

const DEFAULT_IDLE_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_WARNING_MS = 60 * 1000;   // 60 seconds

export function useIdleTimeout({
  enabled,
  idleMs = DEFAULT_IDLE_MS,
  warningMs = DEFAULT_WARNING_MS,
  onTimeout
}: UseIdleTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(warningMs / 1000));

  const warningTimerRef = useRef<number | null>(null);
  const expireTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const expireAtRef = useRef<number>(0);
  const showWarningRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);

  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current !== null) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (expireTimerRef.current !== null) {
      window.clearTimeout(expireTimerRef.current);
      expireTimerRef.current = null;
    }
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    showWarningRef.current = false;
    setShowWarning(false);
    setSecondsLeft(Math.ceil(warningMs / 1000));

    if (!enabled) return;

    const warningDelay = Math.max(1000, idleMs - warningMs);

    warningTimerRef.current = window.setTimeout(() => {
      showWarningRef.current = true;
      setShowWarning(true);
      expireAtRef.current = Date.now() + warningMs;
      setSecondsLeft(Math.ceil(warningMs / 1000));

      countdownIntervalRef.current = window.setInterval(() => {
        const remaining = Math.max(0, Math.ceil((expireAtRef.current - Date.now()) / 1000));
        setSecondsLeft(remaining);
      }, 1000);

      expireTimerRef.current = window.setTimeout(() => {
        clearTimers();
        showWarningRef.current = false;
        setShowWarning(false);
        void onTimeoutRef.current();
      }, warningMs);
    }, warningDelay);
  }, [clearTimers, enabled, idleMs, warningMs]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      showWarningRef.current = false;
      setShowWarning(false);
      return;
    }

    scheduleTimers();

    const handleActivity = () => {
      if (!showWarningRef.current) {
        scheduleTimers();
      }
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll'
    ];

    events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

    return () => {
      clearTimers();
      events.forEach(evt => window.removeEventListener(evt, handleActivity));
    };
  }, [clearTimers, enabled, scheduleTimers]);

  return {
    showWarning,
    secondsLeft,
    staySignedIn: scheduleTimers
  };
}
