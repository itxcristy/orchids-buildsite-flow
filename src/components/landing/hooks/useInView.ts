import { useEffect, useRef, useState, useCallback } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  initialValue?: boolean;
}

export function useInView<T extends HTMLElement = HTMLElement>({
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  initialValue = false,
}: UseInViewOptions = {}) {
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(initialValue);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isInView };
}

export function useStaggeredInView<T extends HTMLElement = HTMLElement>(
  itemCount: number,
  options: UseInViewOptions & { staggerDelay?: number } = {}
) {
  const { staggerDelay = 80, ...inViewOptions } = options;
  const { ref, isInView } = useInView<T>({ ...inViewOptions, rootMargin: '100px' });
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    if (isInView && visibleItems.length === 0) {
      const timeouts: NodeJS.Timeout[] = [];
      for (let i = 0; i < itemCount; i++) {
        timeouts.push(
          setTimeout(() => {
            setVisibleItems(prev => [...prev, i]);
          }, i * staggerDelay)
        );
      }
      return () => timeouts.forEach(clearTimeout);
    }
  }, [isInView, itemCount, staggerDelay, visibleItems.length]);

  const isItemVisible = useCallback((index: number) => visibleItems.includes(index), [visibleItems]);

  return { ref, isInView, isItemVisible, visibleItems };
}

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementHeight = rect.height;
      
      const start = windowHeight;
      const end = -elementHeight;
      const current = rect.top;
      
      const scrollProgress = Math.max(0, Math.min(1, (start - current) / (start - end)));
      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { ref, progress };
}
