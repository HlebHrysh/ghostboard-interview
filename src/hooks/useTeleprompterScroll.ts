'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseTeleprompterScrollOptions {
  /**
   * Automatically scroll when content updates.
   * Default: true
   */
  autoScrollEnabled?: boolean;
  /**
   * Idle timeout in ms before resuming auto-scroll after manual user interaction.
   * Default: 3000ms
   */
  userOverrideTimeoutMs?: number;
  /**
   * Vertical scroll speed multiplier in pixels per frame when continuous scrolling.
   * Default: 1.0
   */
  defaultSpeed?: number;
}

export interface UseTeleprompterScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPaused: boolean;
  isUserInteracting: boolean;
  speed: number;
  togglePause: () => void;
  setPause: (paused: boolean) => void;
  setSpeed: (speed: number) => void;
  scrollToBottom: (smooth?: boolean) => void;
  scrollToTop: (smooth?: boolean) => void;
  notifyContentAppended: () => void;
}

/**
 * High-performance teleprompter auto-scroll engine.
 * - Smoothly follows live incoming streaming content.
 * - Detects manual user scrolls/wheel/touches and pauses auto-scroll.
 * - Resumes auto-scroll automatically after 3 seconds of inactivity.
 */
export function useTeleprompterScroll({
  autoScrollEnabled = true,
  userOverrideTimeoutMs = 3000,
  defaultSpeed = 1.0,
}: UseTeleprompterScrollOptions = {}): UseTeleprompterScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [speed, setSpeed] = useState(defaultSpeed);

  const isPausedRef = useRef(isPaused);
  const isUserInteractingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  // Synchronize refs
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const clearResumeTimer = () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  };

  /**
   * Called whenever user manually interacts with the container (wheel, touch, pointer)
   */
  const handleUserInteraction = useCallback(() => {
    if (isProgrammaticScrollRef.current) return;

    setIsUserInteracting(true);
    isUserInteractingRef.current = true;
    clearResumeTimer();

    resumeTimerRef.current = setTimeout(() => {
      setIsUserInteracting(false);
      isUserInteractingRef.current = false;
    }, userOverrideTimeoutMs);
  }, [userOverrideTimeoutMs]);

  /**
   * Smoothly scrolls container to the bottom.
   */
  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;

    isProgrammaticScrollRef.current = true;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });

    // Reset programmatic flag after transition
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 150);
  }, []);

  /**
   * Smoothly scrolls container to the top.
   */
  const scrollToTop = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;

    isProgrammaticScrollRef.current = true;
    el.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });

    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 150);
  }, []);

  /**
   * Triggers scroll update when new tokens / content are appended.
   */
  const notifyContentAppended = useCallback(() => {
    if (!autoScrollEnabled || isPausedRef.current || isUserInteractingRef.current) {
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    // Keep reading position glued to the new content if already near bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 260) {
      scrollToBottom(true);
    }
  }, [autoScrollEnabled, scrollToBottom]);

  // Bind passive listeners for user-override detection
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = () => handleUserInteraction();
    const onTouch = () => handleUserInteraction();
    const onPointerDown = () => handleUserInteraction();

    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouch, { passive: true });
    el.addEventListener('pointerdown', onPointerDown, { passive: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouch);
      el.removeEventListener('pointerdown', onPointerDown);
      clearResumeTimer();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [handleUserInteraction]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const setPause = useCallback((paused: boolean) => {
    setIsPaused(paused);
  }, []);

  return {
    containerRef,
    isPaused,
    isUserInteracting,
    speed,
    togglePause,
    setPause,
    setSpeed,
    scrollToBottom,
    scrollToTop,
    notifyContentAppended,
  };
}
