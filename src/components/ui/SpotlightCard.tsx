'use client';

import React, { useRef, useCallback } from 'react';

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  enableTilt?: boolean;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(196,181,253, 0.35)',
  enableTilt = true,
  ...props
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);

      if (enableTilt) {
        if (typeof window !== 'undefined' && (window.innerWidth < 768 || 'ontouchstart' in window)) return;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -4; // subtle max 4deg
        const rotateY = ((x - centerX) / centerX) * 4;

        card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      }
    },
    [enableTilt]
  );

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    if (enableTilt) {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    }
  }, [enableTilt]);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`spotlight-card-wrapper transition-transform duration-200 ease-out ${className}`}
      style={
        {
          '--spotlight-color': glowColor,
        } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
};
