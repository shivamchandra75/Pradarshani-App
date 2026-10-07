import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Syncs a modal's open state with the URL search params so the system Back button closes it.
 */
export function useHistoryModal(isOpen: boolean, onClose: () => void, modalId: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Keep a ref so we don't trigger effects needlessly if onClose changes
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      // When modal opens, if the param isn't there, push it to history
      if (!searchParams.has(modalId)) {
        const next = new URLSearchParams(searchParams);
        next.set(modalId, 'true');
        setSearchParams(next); // This PUSHES a new history state
      }
    } else {
      // When modal explicitly closes (via UI X button), remove the param from URL without pushing history (use replace)
      // Wait, if they close it via UI, we want to POP the state if we were the ones who pushed it!
      // But we can't reliably POP without potentially popping too far if they refreshed.
      // So replacing is safer, or doing navigate(-1) if we know we pushed it.
      if (searchParams.has(modalId)) {
        const next = new URLSearchParams(searchParams);
        next.delete(modalId);
        setSearchParams(next, { replace: true });
      }
    }
  }, [isOpen, modalId]); // intentionally omitting searchParams so we don't loop

  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    // If the modal is currently open, but the URL param is gone
    if (isOpen && !searchParams.has(modalId)) {
      // If it WAS open in the previous render cycle, it means the URL param was actively removed (e.g., user pressed system back button)
      // If it WAS NOT open in the previous render cycle, it means it just opened locally and React Router hasn't updated the URL yet.
      if (wasOpen) {
        onCloseRef.current();
      }
    }
  }, [searchParams.has(modalId), isOpen, modalId]);
}
