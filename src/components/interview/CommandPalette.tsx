'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  /** Keyboard shortcut shown on the right (display only). */
  hint?: string;
  disabled?: boolean;
  /** Extra words matched by the filter. */
  keywords?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
  placeholder?: string;
  emptyLabel?: string;
}

/**
 * ⌘K / Ctrl+K palette. Solid surface (no backdrop-filter) so it stays at 60 FPS on WebKitGTK
 * and stays legible on top of a video call. Every command runs with a single Enter / click.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  placeholder = 'Команда або дія…',
  emptyLabel = 'Нічого не знайдено',
}) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setCursor(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!isOpen) return null;

  const exec = (cmd: PaletteCommand | undefined) => {
    if (!cmd || cmd.disabled) return;
    onClose();
    // Let the palette unmount (and restore focus) before the action runs.
    window.setTimeout(cmd.run, 0);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (filtered.length ? (c + 1) % filtered.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (filtered.length ? (c - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      exec(filtered[cursor]);
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-2 pt-[8vh] sm:px-3 sm:pt-[14vh]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full min-w-0 max-w-[520px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111113] shadow-[0_24px_60px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            aria-controls="gb-palette-list"
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
          />
          <kbd className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-zinc-400">Esc</kbd>
        </div>

        <div id="gb-palette-list" ref={listRef} role="listbox" className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-1.5">
          {filtered.length === 0 && <div className="px-3 py-6 text-center text-sm text-zinc-400">{emptyLabel}</div>}
          {filtered.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            const active = i === cursor;
            return (
              <React.Fragment key={cmd.id}>
                {showGroup && (
                  <div className="px-3 pb-1 pt-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">{cmd.group}</div>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={cmd.disabled || undefined}
                  data-index={i}
                  disabled={cmd.disabled}
                  onMouseMove={() => setCursor(i)}
                  onClick={() => exec(cmd)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    active ? 'bg-white/[0.08] text-white' : 'text-zinc-200'
                  }`}
                >
                  <span className="min-w-0 truncate">{cmd.label}</span>
                  {active && !cmd.hint ? (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                  ) : (
                    cmd.hint && (
                      <kbd className="shrink-0 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                        {cmd.hint}
                      </kbd>
                    )
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
