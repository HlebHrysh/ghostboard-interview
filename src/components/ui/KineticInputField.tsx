"use client";

import React, { useState } from "react";

interface KineticInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  shortcut?: string;
}

export function KineticInputField({
  label,
  hint,
  error,
  shortcut,
  className = "",
  ...props
}: KineticInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`space-y-1.5 font-mono ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <label className="text-zinc-400 font-medium tracking-wide flex items-center gap-2">
          <span
            className={`w-1 h-1 rounded-full transition-colors ${
              focused ? "bg-white shadow-[0_0_6px_#fff]" : "bg-zinc-600"
            }`}
          />
          {label}
        </label>
        {shortcut && (
          <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
            {shortcut}
          </span>
        )}
      </div>

      <div className="relative rounded-xl p-px transition-all duration-300">
        {/* Animated titanium border beam on focus */}
        <div
          className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${
            focused
              ? "opacity-100 bg-gradient-to-r from-white/30 via-white/80 to-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              : "opacity-0"
          }`}
        />

        <div className="relative rounded-[11px] bg-[#08080a] border border-white/[0.08] overflow-hidden">
          <input
            {...props}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {hint && !error && <p className="text-[11px] text-zinc-500 font-sans">{hint}</p>}
      {error && (
        <p className="text-[11px] text-zinc-300 font-sans font-medium flex items-center gap-1">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
