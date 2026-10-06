import { useCallback, useRef, useState } from 'react';

export function useLongPress(onLongPress: () => void, ms = 500) {
  const [isHolding, setIsHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track pointer position to cancel if user drags (scrolls)
  const startPos = useRef<{ x: number, y: number } | null>(null);

  const start = useCallback((e: React.PointerEvent) => {
    setIsHolding(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    
    timerRef.current = setTimeout(() => {
      // Clear any text selection that the browser might have started during the hold
      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
      onLongPress();
      setIsHolding(false);
      timerRef.current = null;
    }, ms);
  }, [onLongPress, ms]);

  const clear = useCallback(() => {
    setIsHolding(false);
    startPos.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const move = useCallback((e: React.PointerEvent) => {
    if (startPos.current && timerRef.current) {
      // If moved more than 15 pixels, cancel the hold (assumed scrolling)
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > 15 || dy > 15) {
        clear();
      }
    }
  }, [clear]);

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onPointerMove: move,
    onContextMenu: (e: React.MouseEvent) => {
      // Prevent default context menu (like saving image or link preview on mobile)
      // Only do this while holding to not break legitimate right clicks if needed,
      // but usually for long-press elements we just disable it.
      e.preventDefault();
    },
    isHolding,
  };
}

