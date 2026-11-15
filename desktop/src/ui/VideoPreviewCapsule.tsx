import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Maximize2, Play, Sparkles, X } from 'lucide-react';
import { SPRING } from './primitives';

export interface VideoCapsuleSpec {
  id: string;
  src: string;
  poster?: string;
  title: string;
  subtitle: string;
  badge?: string;
}

/**
 * 6 curated studio demo clips synchronized from `/public/videos/` into `desktop/public/videos/`.
 */
export const STUDIO_VIDEO_CLIPS: Record<string, VideoCapsuleSpec> = {
  mascot: {
    id: 'mascot',
    src: './videos/ghost-mascot.mp4',
    poster: './hero-ghost.png',
    title: 'Dual-Column Copilot',
    subtitle: '26/74% спліт-екран + 4-фазна шпаргалка',
    badge: 'LIVE PREVIEW',
  },
  notch: {
    id: 'notch',
    src: './videos/ghost2.mp4',
    poster: './hud_minimal_banner.png',
    title: 'Eyeline Notch',
    subtitle: 'Суфлер прямо біля камери без бігу очей',
    badge: 'LIVE PREVIEW',
  },
  headphones: {
    id: 'headphones',
    src: './videos/headphones.mp4',
    poster: './hero-ghost.jpg',
    title: 'System Loopback',
    subtitle: 'Ізольований перехоп без мікрофона',
    badge: 'AUDIO PIPELINE',
  },
  stealth: {
    id: 'stealth',
    src: './videos/ghost.mp4',
    poster: './ghost-transparent.png',
    title: 'Screen Share Stealth',
    subtitle: 'Апаратна невидимість на Zoom / Meet',
    badge: 'STEALTH GUARD',
  },
  book: {
    id: 'book',
    src: './videos/book.mp4',
    poster: './hud_minimal_retina.png',
    title: 'AI Deep Dive & Code',
    subtitle: 'Швидке пояснення архітектури та складних питань',
    badge: 'TURBO RACE',
  },
  money: {
    id: 'money',
    src: './videos/money.mp4',
    poster: './hud_minimal_widescreen.png',
    title: 'Offer Ready Flow',
    subtitle: 'Рольовий контекст та адаптація під стек',
    badge: 'PRO WORKFLOW',
  },
};

export interface VideoPreviewCapsuleProps {
  clip: VideoCapsuleSpec;
  compact?: boolean;
  /** Optional interactive action button ("Протестувати вигляд") rendered inside card or overlay */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const VideoPreviewCapsule: React.FC<VideoPreviewCapsuleProps> = ({
  clip,
  compact = false,
  actionLabel = 'Протестувати вигляд',
  onAction,
  className = '',
}) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const openModal = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const dlg = dialogRef.current;
    setModalOpen(true);
    if (dlg && !dlg.open) {
      if (typeof dlg.showModal === 'function') {
        dlg.showModal();
      } else {
        dlg.setAttribute('open', 'true');
      }
    }
  }, []);

  const closeModal = useCallback(() => {
    const dlg = dialogRef.current;
    setModalOpen(false);
    if (dlg?.open) {
      if (typeof dlg.close === 'function') {
        dlg.close();
      } else {
        dlg.removeAttribute('open');
      }
    }
  }, []);

  // Light-dismiss fallback for WebKitGTK / engines without declarative `closedby="any"`
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;

    const onClose = () => setModalOpen(false);
    dlg.addEventListener('close', onClose);

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (ev: PointerEvent) => {
        const r = dlg.getBoundingClientRect();
        return (
          ev.clientX < r.left ||
          ev.clientX > r.right ||
          ev.clientY < r.top ||
          ev.clientY > r.bottom
        );
      };
      const onPointerDown = (ev: PointerEvent) => {
        pressedOutside = isOutside(ev);
      };
      const onPointerUp = (ev: PointerEvent) => {
        if (pressedOutside && isOutside(ev)) closeModal();
      };
      dlg.addEventListener('pointerdown', onPointerDown);
      dlg.addEventListener('pointerup', onPointerUp);
      return () => {
        dlg.removeEventListener('close', onClose);
        dlg.removeEventListener('pointerdown', onPointerDown);
        dlg.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dlg.removeEventListener('close', onClose);
    };
  }, [closeModal]);

  return (
    <>
      <div
        className={`group relative overflow-hidden rounded-xl border border-white/10 bg-[#0d0d10] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] ${className}`}
      >
        <div
          className={`relative w-full overflow-hidden bg-[#09090b] ${
            compact ? 'aspect-[16/8.5]' : 'aspect-video'
          }`}
        >
          {!videoFailed ? (
            <video
              src={clip.src}
              poster={clip.poster}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              onError={() => setVideoFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : clip.poster ? (
            <img
              src={clip.poster}
              alt={clip.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {clip.title}
            </div>
          )}

          {/* Crisp gradient vignette without any expensive blur filter */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#09090b]/90 via-transparent to-[#09090b]/30"
          />

          {/* Top-left LIVE PREVIEW pill */}
          <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-full border border-white/12 bg-[#09090b]/90 px-2 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.09em] text-zinc-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {clip.badge ?? 'LIVE PREVIEW'}
          </div>

          {/* Expand / test visual triggers on hover or always subtle */}
          <div className="absolute right-2 top-2 flex items-center gap-1">
            {onAction && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                transition={SPRING}
                onClick={(e) => {
                  e.stopPropagation();
                  onAction();
                }}
                className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-[#09090b]/95 px-2 py-0.5 text-[10.5px] font-medium text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] hover:border-white/30"
              >
                <Eye className="h-3 w-3 text-emerald-400" />
                {actionLabel}
              </motion.button>
            )}
            <motion.button
              type="button"
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING}
              onClick={openModal}
              title="Відкрити велике прев’ю"
              aria-label={`Відкрити прев’ю ${clip.title}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-[#09090b]/95 text-zinc-300 hover:border-white/30 hover:text-white"
            >
              <Maximize2 className="h-3 w-3" />
            </motion.button>
          </div>

          {/* Bottom caption */}
          <div className="pointer-events-none absolute inset-x-2.5 bottom-2 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[11.5px] font-medium text-white">
                {clip.title}
              </div>
              <div className="truncate text-[10px] text-zinc-400">
                {clip.subtitle}
              </div>
            </div>
            <Play className="h-3 w-3 shrink-0 text-zinc-400 opacity-80" />
          </div>
        </div>
      </div>

      {/* Native <dialog> light-dismiss video inspection modal (zero backdrop-blur for 60fps WebKitGTK) */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby={`video-modal-title-${clip.id}`}
        onClick={(e) => e.stopPropagation()}
        className="m-auto w-[min(640px,92vw)] rounded-2xl border border-white/15 bg-[#111114] p-0 text-zinc-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_32px_80px_-16px_rgba(0,0,0,0.95)]"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
          <div>
            <h3
              id={`video-modal-title-${clip.id}`}
              className="text-sm font-medium tracking-tight text-white"
            >
              {clip.title}
            </h3>
            <p className="text-[11.5px] text-zinc-400">{clip.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            aria-label="Закрити перегляд"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="aspect-video w-full bg-[#09090b]">
          {modalOpen && !videoFailed ? (
            <video
              src={clip.src}
              poster={clip.poster}
              autoPlay
              loop
              muted
              playsInline
              controls
              className="h-full w-full object-contain"
            />
          ) : clip.poster ? (
            <img
              src={clip.poster}
              alt={clip.title}
              className="h-full w-full object-contain"
            />
          ) : null}
        </div>
      </dialog>
    </>
  );
};
