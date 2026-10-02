'use client';

import React, { useRef, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';

interface FluidAudioWaveformProps {
  isCapturing: boolean;
  className?: string;
  width?: number;
  height?: number;
}

export const FluidAudioWaveform: React.FC<FluidAudioWaveformProps> = ({
  isCapturing,
  className = '',
  width = 160,
  height = 28,
}) => {
  const { locale } = useLocale();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetVolRef = useRef<number>(0);
  const currentVolRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const handleVolume = (e: Event) => {
      if (isCapturing) {
        const vol = (e as CustomEvent).detail;
        targetVolRef.current = Math.max(vol, 4);
      } else {
        targetVolRef.current = 0;
      }
    };
    window.addEventListener('ghostboard:audio_volume', handleVolume);
    return () => window.removeEventListener('ghostboard:audio_volume', handleVolume);
  }, [isCapturing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Smooth lerp volume transition
      currentVolRef.current += (targetVolRef.current - currentVolRef.current) * 0.14;
      phaseRef.current += 0.05 + (currentVolRef.current / 100) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const midY = height / 2;
      const normalizedVol = currentVolRef.current / 100;
      const maxAmplitude = Math.min(height / 2 - 2, 4 + normalizedVol * (height / 2 - 4));

      // Draw 2 harmonic organic sine waves
      const waves = [
        {
          color: isCapturing
            ? normalizedVol > 0.4
              ? 'rgba(200, 241, 53, 0.9)'
              : 'rgba(52, 211, 153, 0.85)'
            : 'rgba(113, 113, 122, 0.3)',
          freq: 0.045,
          speed: 1,
          phaseOffset: 0,
          lineWidth: 2,
        },
        {
          color: isCapturing
            ? 'rgba(56, 189, 248, 0.45)'
            : 'rgba(82, 82, 91, 0.15)',
          freq: 0.035,
          speed: 1.3,
          phaseOffset: Math.PI / 3,
          lineWidth: 1.5,
        },
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.lineWidth = w.lineWidth;
        ctx.strokeStyle = w.color;
        ctx.lineCap = 'round';

        for (let x = 0; x < width; x += 2) {
          // Envelope function: attenuate ends so waves pinch at canvas boundaries
          const env = Math.sin((x / width) * Math.PI);
          const y =
            midY +
            Math.sin(x * w.freq + phaseRef.current * w.speed + w.phaseOffset) *
              maxAmplitude *
              env;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [width, height, isCapturing]);

  const waveTitle = (
    {
      ua: { active: 'Аудіопотік активний', idle: 'Аудіопотік неактивний' },
      en: { active: 'Audio stream active', idle: 'Audio stream idle' },
      pl: { active: 'Strumień audio aktywny', idle: 'Strumień audio nieaktywny' },
      de: { active: 'Audiostream aktiv', idle: 'Audiostream inaktiv' },
      fr: { active: 'Flux audio actif', idle: 'Flux audio inactif' },
      es: { active: 'Flujo de audio activo', idle: 'Flujo de audio inactivo' },
      pt: { active: 'Fluxo de áudio ativo', idle: 'Fluxo de áudio inativo' },
      it: { active: 'Flusso audio attivo', idle: 'Flusso audio inattivo' },
      cs: { active: 'Zvukový stream aktivní', idle: 'Zvukový stream neaktivní' },
      nl: { active: 'Audiostream actief', idle: 'Audiostream inactief' },
    }[locale] || { active: 'Audio stream active', idle: 'Audio stream idle' }
  );

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      title={isCapturing ? waveTitle.active : waveTitle.idle}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
};
