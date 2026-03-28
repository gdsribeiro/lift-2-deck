import { useCallback, useEffect, useRef, useState } from "react";

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number) => {
      clear();
      setSecondsLeft(seconds);
      setIsRunning(true);
    },
    [clear]
  );

  const skip = useCallback(() => {
    clear();
    setSecondsLeft(0);
    setIsRunning(false);
  }, [clear]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      if (isRunning && secondsLeft <= 0) {
        setIsRunning(false);
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return clear;
  }, [isRunning, secondsLeft, clear]);

  return { secondsLeft, isRunning, start, skip };
}
