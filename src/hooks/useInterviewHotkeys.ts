import { useEffect } from 'react';
import { toast } from 'sonner';

interface UseInterviewHotkeysOptions {
  isCapturingRef: React.MutableRefObject<boolean>;
  isCopilotGeneratingRef: React.MutableRefObject<boolean>;
  triggerModeRef: React.MutableRefObject<'auto' | 'enter'>;
  isFrozenRef: React.MutableRefObject<boolean>;
  pendingNewCountRef: React.MutableRefObject<number>;
  activeQAIdRef: React.MutableRefObject<string | null>;
  interviewQAs: Array<{ id: string }>;
  setIsFrozen: (val: boolean) => void;
  setPendingNewCount: (val: number | ((prev: number) => number)) => void;
  setActiveQAId: (val: string | null) => void;
  handleToggleTriggerModeRef: React.MutableRefObject<() => void>;
  handleManualEnterTriggerRef: React.MutableRefObject<() => void>;
  handleTriggerScreenshotRef: React.MutableRefObject<() => void>;
  handleToggleConciseRef?: React.MutableRefObject<() => void>;
}

export function useInterviewHotkeys({
  isCapturingRef,
  isCopilotGeneratingRef,
  triggerModeRef,
  isFrozenRef,
  pendingNewCountRef,
  activeQAIdRef,
  interviewQAs,
  setIsFrozen,
  setPendingNewCount,
  setActiveQAId,
  handleToggleTriggerModeRef,
  handleManualEnterTriggerRef,
  handleTriggerScreenshotRef,
  handleToggleConciseRef,
}: UseInterviewHotkeysOptions) {
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Enter - Manual trigger
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isCapturingRef.current) {
          toast.info('🎙️ Спочатку увімкніть мікрофон/захоплення.');
          return;
        }
        if (triggerModeRef.current !== 'enter') {
          toast.info('💡 Для використання [Enter] перемкніться у ручний режим (Клавіша M).');
          return;
        }
        handleManualEnterTriggerRef.current();
        return;
      }

      // M - Toggle mode
      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleToggleTriggerModeRef.current();
        return;
      }

      // Space - Freeze/Unfreeze queue
      if (e.code === 'Space') {
        e.preventDefault();
        if (isFrozenRef.current) {
          // Unfreeze and jump to latest
          isFrozenRef.current = false;
          setIsFrozen(false);
          setPendingNewCount(0);
          pendingNewCountRef.current = 0;
          if (interviewQAs.length > 0) {
            setActiveQAId(interviewQAs[0].id);
          }
          toast.success('▶️ Трансляцію відновлено. Показано останню відповідь.', {
            id: 'freeze-toast',
            duration: 2000,
          });
        } else {
          isFrozenRef.current = true;
          setIsFrozen(true);
          toast.info('⏸️ Екран зафіксовано. Ви можете спокійно читати. Нові відповіді будуть у черзі.', {
            id: 'freeze-toast',
            duration: 4000,
          });
        }
        return;
      }

      // Esc - Unfreeze
      if (e.key === 'Escape' && isFrozenRef.current) {
        e.preventDefault();
        isFrozenRef.current = false;
        setIsFrozen(false);
        setPendingNewCount(0);
        pendingNewCountRef.current = 0;
        if (interviewQAs.length > 0) {
          setActiveQAId(interviewQAs[0].id);
        }
        toast.success('▶️ Трансляцію відновлено.', { id: 'freeze-toast' });
        return;
      }

      // ArrowRight - Jump to next in queue
      if (e.key === 'ArrowRight' && isFrozenRef.current && pendingNewCountRef.current > 0) {
        e.preventDefault();
        const currentIdx = interviewQAs.findIndex((q) => q.id === activeQAIdRef.current);
        if (currentIdx > 0) {
          const nextQA = interviewQAs[currentIdx - 1];
          setActiveQAId(nextQA.id);
          setPendingNewCount((prev) => {
            const next = Math.max(0, typeof prev === 'number' ? prev - 1 : 0);
            pendingNewCountRef.current = next;
            return next;
          });
          if (currentIdx - 1 === 0) {
            isFrozenRef.current = false;
            setIsFrozen(false);
            toast.success('▶️ Ви дійшли до останньої відповіді. Трансляцію відновлено.');
          }
        }
        return;
      }

      // Q - Dismiss top
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        if (handleToggleConciseRef?.current) {
          handleToggleConciseRef.current();
        }
      }

      // F9 - Screenshot
      if (e.key === 'F9') {
        e.preventDefault();
        handleTriggerScreenshotRef.current();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [
    interviewQAs,
    setIsFrozen,
    setPendingNewCount,
    setActiveQAId,
    isCapturingRef,
    isCopilotGeneratingRef,
    triggerModeRef,
    isFrozenRef,
    pendingNewCountRef,
    activeQAIdRef,
    handleToggleTriggerModeRef,
    handleManualEnterTriggerRef,
    handleTriggerScreenshotRef,
    handleToggleConciseRef
  ]);
}
