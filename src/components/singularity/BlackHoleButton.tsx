"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MagneticElement } from "./MagneticElement";

interface BlackHoleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "ghost";
  size?: "md" | "lg";
  /** Wrap in magnetic physics (default true). */
  magnetic?: boolean;
  /** Class for the outer wrapper. */
  wrapperClassName?: string;
}

/**
 * High-converting CTA: a photon orbits the rim (CSS conic gradient on the compositor),
 * the control is magnetic, and any click triggers the global singularity shockwave
 * (handled by BlackHoleCanvas via the interactive-element delegate).
 */
export function BlackHoleButton({
  children,
  href,
  variant = "primary",
  size = "md",
  magnetic = true,
  className = "",
  wrapperClassName = "",
  ...rest
}: BlackHoleButtonProps) {
  const pad = size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm";
  const face =
    variant === "primary"
      ? "bh-face-primary"
      : "bh-face-ghost";
  const inner = (
    <>
      <span aria-hidden className="bh-beam" />
      <span className={`relative z-10 m-px inline-flex w-[calc(100%-2px)] items-center justify-center gap-2 rounded-[11px] font-semibold tracking-tight transition-colors ${pad} ${face}`}>
        {children}
      </span>
    </>
  );
  const shell = `bh-button group relative inline-flex overflow-hidden rounded-xl bg-[rgb(var(--sg-ink)/0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgb(var(--sg-ink))] disabled:opacity-50 disabled:pointer-events-none ${className}`;

  const control = href ? (
    <Link href={href} className={shell} data-shockwave>
      {inner}
    </Link>
  ) : (
    <button type="button" {...rest} className={shell}>
      {inner}
    </button>
  );

  return magnetic ? <MagneticElement className={`inline-flex ${wrapperClassName}`}>{control}</MagneticElement> : control;
}
