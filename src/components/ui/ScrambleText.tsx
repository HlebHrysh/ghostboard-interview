'use client';

import React, { useState, useEffect, useRef } from 'react';

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';

interface ScrambleTextProps {
  text: string;
  className?: string;
  speed?: number; // ms per tick
  scrambleDuration?: number; // total duration in ms
  as?: React.ElementType;
}

export const ScrambleText: React.FC<ScrambleTextProps> = ({
  text,
  className = '',
  speed = 25,
  scrambleDuration = 400,
  as: Component = 'span',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const animRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayText(text);
      return;
    }

    if (!text) {
      setDisplayText('');
      return;
    }

    const chars = Array.from(text);
    const totalSteps = Math.max(10, Math.floor(scrambleDuration / speed));
    let currentStep = 0;

    if (animRef.current) clearInterval(animRef.current);

    animRef.current = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      const revealedCount = Math.floor(progress * chars.length);

      const scrambled = chars
        .map((char, idx) => {
          if (char === ' ' || char === '\n' || char === '\t') return char;
          if (idx < revealedCount) {
            return char;
          }
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');

      setDisplayText(scrambled);

      if (currentStep >= totalSteps) {
        if (animRef.current) clearInterval(animRef.current);
        setDisplayText(text);
      }
    }, speed);

    return () => {
      if (animRef.current) clearInterval(animRef.current);
    };
  }, [text, speed, scrambleDuration]);

  return <Component className={className}>{displayText}</Component>;
};
