import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCounterOptions {
  start?: number;
  end: number;
  duration?: number;
  delay?: number;
  easing?: (t: number) => number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useCounter({
  start = 0,
  end,
  duration = 2000,
  delay = 0,
  easing = easeOutCubic,
}: UseCounterOptions) {
  const [count, setCount] = useState(start);
  const [isRunning, setIsRunning] = useState(false);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  const startCounter = useCallback(() => {
    if (isRunning) return;
    
    const timeout = setTimeout(() => {
      setIsRunning(true);
      startTimeRef.current = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - (startTimeRef.current || 0);
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easing(progress);
        const currentValue = start + (end - start) * easedProgress;

        setCount(Math.round(currentValue));

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate);
        } else {
          setIsRunning(false);
        }
      };

      frameRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [start, end, duration, delay, easing, isRunning]);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return { count, startCounter, isRunning };
}

export function useSmoothScroll() {
  const scrollTo = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }, []);

  return { scrollTo };
}
