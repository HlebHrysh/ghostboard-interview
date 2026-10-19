'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseDocumentPiPOptions {
  width?: number;
  height?: number;
  title?: string;
  onClose?: () => void;
}

export function useDocumentPiP({
  width = 460,
  height = 280,
  title = 'Ghostboard Teleprompter',
  onClose,
}: UseDocumentPiPOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);
  const pipWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      setIsSupported(true);
    }
  }, []);

  const copyStylesToWindow = useCallback((targetDoc: Document) => {
    // Copy all style tags and link stylesheets from host document
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
      targetDoc.head.appendChild(el.cloneNode(true));
    });
  }, []);

  const closePiP = useCallback(() => {
    if (pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch {}
      pipWindowRef.current = null;
    }
    setPipContainer(null);
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const openPiP = useCallback(async () => {
    if (!isSupported || typeof window === 'undefined') {
      return false;
    }

    // If already open, focus it
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus();
      return true;
    }

    try {
      const pipWindow: Window = await (window as any).documentPictureInPicture.requestWindow({
        width,
        height,
      });

      pipWindowRef.current = pipWindow;
      pipWindow.document.title = title;

      // Base styles for clean dark-mode presentation
      pipWindow.document.body.style.margin = '0';
      pipWindow.document.body.style.padding = '0';
      pipWindow.document.body.style.backgroundColor = '#0a0a0d';
      pipWindow.document.body.style.color = '#ffffff';
      pipWindow.document.body.style.overflow = 'hidden';
      pipWindow.document.body.style.userSelect = 'none';

      copyStylesToWindow(pipWindow.document);

      const mountPoint = pipWindow.document.createElement('div');
      mountPoint.id = 'ghostboard-pip-root';
      mountPoint.style.width = '100vw';
      mountPoint.style.height = '100vh';
      mountPoint.style.display = 'flex';
      mountPoint.style.flexDirection = 'column';
      pipWindow.document.body.appendChild(mountPoint);

      setPipContainer(mountPoint);
      setIsOpen(true);

      pipWindow.addEventListener('pagehide', () => {
        pipWindowRef.current = null;
        setPipContainer(null);
        setIsOpen(false);
        onClose?.();
      });

      return true;
    } catch (err) {
      console.warn('[useDocumentPiP] Failed to open Picture-in-Picture window:', err);
      return false;
    }
  }, [isSupported, width, height, title, copyStylesToWindow, onClose]);

  const togglePiP = useCallback(async () => {
    if (isOpen) {
      closePiP();
      return false;
    }
    return openPiP();
  }, [isOpen, closePiP, openPiP]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        try {
          pipWindowRef.current.close();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isOpen,
    pipContainer,
    openPiP,
    closePiP,
    togglePiP,
  };
}
