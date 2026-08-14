// components/TopProgressBar.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Lightweight top progress bar that activates on Next.js page navigations.
 * No external dependencies — pure CSS animation.
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathname = useRef(pathname);

  const start = useCallback(() => {
    setVisible(true);
    setProgress(0);

    // Simulate progress: fast start, slows down as it approaches 90%
    let current = 0;
    timerRef.current = setInterval(() => {
      current += Math.max(1, (90 - current) * 0.08);
      if (current >= 90) current = 90;
      setProgress(current);
    }, 50);
  }, []);

  const finish = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, []);

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      finish();
      prevPathname.current = pathname;
    }
  }, [pathname, finish]);

  // Intercept link clicks to start progress bar before navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Only handle internal links (not external, hash, or mailto)
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#')
      ) {
        return;
      }

      // Don't trigger for cmd/ctrl+click (new tab)
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;

      start();
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [start]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease-out' }}
    >
      <div
        className="h-[3px] bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
        style={{
          width: `${progress}%`,
          transition: progress === 100
            ? 'width 200ms ease-out'
            : 'width 100ms linear',
        }}
      />
    </div>
  );
}
