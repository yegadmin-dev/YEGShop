import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Updates passive CSS scroll variables (--yeg-scroll-progress, --yeg-scroll-y)
 * without causing React re-renders so headers, progress bars, and hero layers
 * respond smoothly at 60/120fps during scrolling.
 */
export function ScrollMotionTracker() {
  useEffect(() => {
    let rafPending = false;

    const updateScrollVars = () => {
      rafPending = false;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = docHeight > 0 ? Math.min(1, Math.max(0, scrollY / docHeight)) : 0;

      const root = document.documentElement.style;
      root.setProperty('--yeg-scroll-progress', progress.toFixed(4));
      root.setProperty('--yeg-scroll-y', `${Math.min(scrollY, 800)}px`);
    };

    const onScroll = () => {
      if (!rafPending) {
        rafPending = true;
        window.requestAnimationFrame(updateScrollVars);
      }
    };

    updateScrollVars();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return null;
}

export function ScrollProgressBar() {
  return (
    <div
      aria-hidden="true"
      className="h-[2.5px] w-full bg-gradient-to-r from-[#065E46] via-[#10B981] to-[#0284C7] yeg-scroll-progress-bar"
    />
  );
}

interface RevealBlockProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  direction?: 'up' | 'left' | 'right' | 'scale';
}

export function RevealBlock({
  children,
  className = '',
  delayMs = 0,
  direction = 'up',
}: RevealBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    // Immediately show blocks already within or above the viewport on mount
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.96) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.04, rootMargin: '0px 0px -20px 0px' }
    );

    observer.observe(el);

    // Fallback safety timer so no block ever stays hidden
    const fallbackTimer = window.setTimeout(() => setVisible(true), 900);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  const dirClass =
    direction === 'left'
      ? 'yeg-reveal-left'
      : direction === 'right'
      ? 'yeg-reveal-right'
      : direction === 'scale'
      ? 'yeg-reveal-scale'
      : '';

  return (
    <div
      ref={ref}
      style={{ transitionDelay: delayMs > 0 ? `${delayMs}ms` : undefined }}
      className={`yeg-reveal ${dirClass} ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
