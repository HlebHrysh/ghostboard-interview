"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

interface ButtonProps {
  label?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function ContactButton({
  label = "Contact Me",
  href = "#contact",
  onClick,
  className = "",
}: ButtonProps) {
  const content = (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      style={{
        background: "linear-gradient(123deg, #18011F 7%, #B600A8 37%, #7621B0 72%, #BE4C00 100%)",
        boxShadow: "0px 4px 4px rgba(181, 1, 167, 0.25), inset 4px 4px 12px #7721B1",
        outline: "2px solid rgba(255, 255, 255, 0.85)",
        outlineOffset: "-3px",
      }}
      className={`relative inline-flex items-center justify-center rounded-full px-8 py-3 sm:px-10 sm:py-3.5 md:px-12 md:py-4 text-xs sm:text-sm md:text-base text-white font-medium uppercase tracking-widest cursor-pointer select-none group overflow-hidden ${className}`}
    >
      {/* Subtle sweep sheen on hover */}
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
      <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        {label}
      </span>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return <button type="button" onClick={onClick}>{content}</button>;
}

export function LiveProjectButton({
  label = "Live Project",
  href,
  onClick,
  className = "",
}: ButtonProps) {
  const content = (
    <motion.div
      whileHover={{ scale: 1.04, backgroundColor: "rgba(215, 226, 234, 0.12)" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`inline-flex items-center gap-2 rounded-full border-2 border-[#D7E2EA] px-6 py-2.5 sm:px-8 sm:py-3 text-xs sm:text-sm text-[#D7E2EA] font-medium uppercase tracking-widest transition-colors cursor-pointer select-none ${className}`}
    >
      <span>{label}</span>
      <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </motion.div>
  );

  if (href) {
    return <Link href={href} target="_blank" rel="noopener noreferrer">{content}</Link>;
  }
  return <button type="button" onClick={onClick}>{content}</button>;
}
