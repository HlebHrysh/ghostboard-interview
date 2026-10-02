'use client';

import React from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { getModalsTranslations } from '@/lib/modalsI18n';

export interface ArenaCriteriaScores {
  thinkingSpeed: number;     // Швидкість мислення (0 - 100)
  technicalAccuracy: number; // Технічна точність (0 - 100)
  architecturalVision: number; // Архітектурний зір (0 - 100)
  communication: number;     // Комунікація (0 - 100)
  stressResilience: number;  // Стійкість до стресу (0 - 100)
}

interface SpiderRadarChartProps {
  scores: ArenaCriteriaScores;
  size?: number;
  className?: string;
}

export const SpiderRadarChart: React.FC<SpiderRadarChartProps> = ({
  scores,
  size = 320,
  className = '',
}) => {
  const { locale } = useLocale();
  const sc = getModalsTranslations(locale).scorecard;

  const CRITERIA_METRICS: Array<{ key: keyof ArenaCriteriaScores; label: string; icon: string }> = [
    { key: 'technicalAccuracy', label: sc.accuracy, icon: '🎯' },
    { key: 'architecturalVision', label: sc.architecture, icon: '🏛️' },
    { key: 'stressResilience', label: sc.stress, icon: '⚡' },
    { key: 'communication', label: sc.communication, icon: '💬' },
    { key: 'thinkingSpeed', label: sc.speed, icon: '⏱️' },
  ];
  const center = size / 2;
  const radius = size * 0.36;
  const count = CRITERIA_METRICS.length; // 5 vertices
  const angleStep = (2 * Math.PI) / count;
  const startAngle = -Math.PI / 2; // 12 o'clock

  // Levels for concentric background web (25%, 50%, 75%, 100%)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  const getCoordinates = (index: number, ratio: number) => {
    const angle = startAngle + index * angleStep;
    const x = center + radius * ratio * Math.cos(angle);
    const y = center + radius * ratio * Math.sin(angle);
    return { x, y };
  };

  // Build polygon path for a given ratio
  const getPolygonPoints = (ratio: number) => {
    return Array.from({ length: count }, (_, i) => {
      const { x, y } = getCoordinates(i, ratio);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  };

  // Build polygon points for the candidate's scores
  const scorePoints = CRITERIA_METRICS.map((metric, i) => {
    const rawVal = scores[metric.key] ?? 70;
    const clampedVal = Math.max(15, Math.min(100, rawVal));
    const ratio = clampedVal / 100;
    const { x, y } = getCoordinates(i, ratio);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible select-none drop-shadow-[0_0_15px_rgba(200,241,53,0.15)]"
      >
        <defs>
          {/* Radial gradient for score polygon fill */}
          <radialGradient id="radarFillGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#C8F135" stopOpacity="0.45" />
            <stop offset="70%" stopColor="#10B981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#065F46" stopOpacity="0.05" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric Guide Webs */}
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={getPolygonPoints(lvl)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
            strokeDasharray={lvl < 1.0 ? '2,3' : 'none'}
          />
        ))}

        {/* Axis Spokes from center to outer ring */}
        {CRITERIA_METRICS.map((_, i) => {
          const { x, y } = getCoordinates(i, 1.0);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
            />
          );
        })}

        {/* Candidate Skill Polygon Area */}
        <polygon
          points={scorePoints}
          fill="url(#radarFillGrad)"
          stroke="#C8F135"
          strokeWidth="2.5"
          filter="url(#radarGlow)"
          className="transition-all duration-700 ease-out"
        />

        {/* Vertex Markers and Labels */}
        {CRITERIA_METRICS.map((metric, i) => {
          const rawVal = scores[metric.key] ?? 70;
          const clampedVal = Math.max(15, Math.min(100, rawVal));
          const { x: vx, y: vy } = getCoordinates(i, clampedVal / 100);
          const { x: lx, y: ly } = getCoordinates(i, 1.28);

          return (
            <g key={metric.key}>
              {/* Point on polygon */}
              <circle
                cx={vx}
                cy={vy}
                r="4.5"
                fill="#C8F135"
                stroke="#000"
                strokeWidth="1.5"
                className="transition-all duration-700 ease-out"
              />

              {/* Text label outside spider web */}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-zinc-300 font-mono text-[10px] tracking-tight font-medium"
              >
                {metric.icon} {metric.label}
              </text>

              {/* Percentage score sub-label */}
              <text
                x={lx}
                y={ly + 12}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-[#C8F135] font-mono text-[9px] font-bold"
              >
                {rawVal}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
