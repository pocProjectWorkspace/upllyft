'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
}

interface UseIntersectionObserverReturn {
  ref: RefObject<Element | null>;
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {},
): UseIntersectionObserverReturn {
  const { threshold = 0, root = null, rootMargin = '0px', enabled = true } = options;
  const ref = useRef<Element | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    const observer = new IntersectionObserver(
      ([observerEntry]) => {
        setIsIntersecting(observerEntry.isIntersecting);
        setEntry(observerEntry);
      },
      { threshold, root, rootMargin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, root, rootMargin, enabled]);

  return { ref, isIntersecting, entry };
}
