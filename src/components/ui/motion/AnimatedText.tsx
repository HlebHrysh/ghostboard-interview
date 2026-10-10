"use client";

import React, { useRef, useMemo } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";

interface AnimatedTextProps {
  text: string;
  className?: string;
}

interface CharProps {
  char: string;
  progress: MotionValue<number>;
  range: [number, number];
}

function Character({ char, progress, range }: CharProps) {
  const opacity = useTransform(progress, range, [0.2, 1]);
  const y = useTransform(progress, range, [3, 0]);

  return (
    <span className="relative inline-block">
      <span className="opacity-0 select-none">{char}</span>
      <motion.span
        style={{ opacity, y }}
        className="absolute left-0 top-0 text-[#D7E2EA] font-medium transition-colors"
      >
        {char}
      </motion.span>
    </span>
  );
}

export function AnimatedText({ text, className = "" }: AnimatedTextProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.35"],
  });

  const structuredWords = useMemo(() => {
    const rawWords = text.split(" ");
    const totalChars = Math.max(1, text.length);

    return rawWords.map((word, wordIdx) => {
      // Pure mathematical offset calculation without variable mutation
      const prefixLength = rawWords.slice(0, wordIdx).join(" ").length + (wordIdx > 0 ? 1 : 0);

      const chars = word.split("").map((char, charIdx) => {
        const globalIdx = prefixLength + charIdx;
        const start = globalIdx / totalChars;
        const end = (globalIdx + 1) / totalChars;
        return { char, range: [start, end] as [number, number] };
      });

      return chars;
    });
  }, [text]);

  return (
    <p
      ref={containerRef}
      className={`relative leading-relaxed select-none ${className}`}
    >
      {structuredWords.map((wordChars, wordIdx) => (
        <span key={wordIdx} className="inline-block whitespace-nowrap">
          {wordChars.map((item, charIdx) => (
            <Character
              key={`${wordIdx}-${charIdx}`}
              char={item.char}
              progress={scrollYProgress}
              range={item.range}
            />
          ))}
          {wordIdx < structuredWords.length - 1 && (
            <span className="inline-block">&nbsp;</span>
          )}
        </span>
      ))}
    </p>
  );
}
