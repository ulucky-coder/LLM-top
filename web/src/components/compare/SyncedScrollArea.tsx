"use client";

import { useRef, useEffect, ReactNode, useCallback } from "react";

interface SyncedScrollAreaProps {
  children: ReactNode;
  syncEnabled: boolean;
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
  className?: string;
}

export function SyncedScrollArea({
  children,
  syncEnabled,
  scrollTop,
  onScroll,
  className,
}: SyncedScrollAreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  // Sync scroll position when prop changes
  useEffect(() => {
    if (syncEnabled && ref.current && !isScrolling.current) {
      ref.current.scrollTop = scrollTop;
    }
  }, [scrollTop, syncEnabled]);

  const handleScroll = useCallback(() => {
    if (syncEnabled && ref.current) {
      isScrolling.current = true;
      onScroll(ref.current.scrollTop);

      // Reset scrolling flag after a short delay
      setTimeout(() => {
        isScrolling.current = false;
      }, 50);
    }
  }, [syncEnabled, onScroll]);

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className={className}
    >
      {children}
    </div>
  );
}
