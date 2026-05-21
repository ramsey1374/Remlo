"use client";

import React from "react";

type IconProps = { className?: string, size?: number };

function IconShell({ children, size = 20, className = "" }: React.PropsWithChildren<IconProps>) {
  return (
    <span className={`relative inline-flex items-center justify-center w-9 h-9 ${className}`} style={{ width: size + 8, height: size + 8 }}>
      <span className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/10 to-amber-400/10 blur-sm" />
      <span className="relative z-10 text-indigo-400 dark:text-indigo-300" style={{ display: "inline-flex" }}>
        {children}
      </span>
    </span>
  );
}

export function IconBolt({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop stopColor="#6366F1" stopOpacity="1" />
            <stop offset="1" stopColor="#F59E0B" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" fill="url(#g1)" fillOpacity="0.95" />
      </svg>
    </IconShell>
  );
}

export function IconCircle({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="8" fill="url(#g2)" fillOpacity="0.95" />
        <defs>
          <linearGradient id="g2" x1="0" x2="1">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>
    </IconShell>
  );
}

export function IconLink({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="g3" x1="0" x2="1">
            <stop stopColor="#60A5FA" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>
        <path d="M10.59 13.41a1 1 0 010-1.41l2.83-2.82a3 3 0 114.24 4.24l-1.06 1.06" stroke="url(#g3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13.41 10.59a1 1 0 011.41 0l2.82 2.83a3 3 0 11-4.24 4.24l-1.06-1.06" stroke="url(#g3)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function IconDoc({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="url(#g4)" fillOpacity="0.95" />
        <path d="M14 2v6h6" stroke="#fff" strokeWidth="1" strokeOpacity="0.08" />
        <defs>
          <linearGradient id="g4" x1="0" x2="1"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#6366F1"/></linearGradient>
        </defs>
      </svg>
    </IconShell>
  );
}

export function IconSearch({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="11" cy="11" r="4" stroke="url(#g5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 21l-4.35-4.35" stroke="url(#g5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="g5" x1="0" x2="1"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#F59E0B"/></linearGradient>
        </defs>
      </svg>
    </IconShell>
  );
}

export function IconCheck({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M20 6L9 17l-5-5" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}

export function IconGlobe({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="url(#g6)" strokeWidth="1.4" />
        <path d="M2 12h20M12 2c2 4 2 16 0 20M12 2c-2 4-2 16 0 20" stroke="url(#g6)" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="g6" x1="0" x2="1"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#6366F1"/></linearGradient>
        </defs>
      </svg>
    </IconShell>
  );
}

export function IconShield({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 2l7 3v5c0 5-3 9-7 11-4-2-7-6-7-11V5l7-3z" fill="url(#g7)" />
        <defs>
          <linearGradient id="g7" x1="0" x2="1"><stop stopColor="#34D399" /><stop offset="1" stopColor="#60A5FA" /></linearGradient>
        </defs>
      </svg>
    </IconShell>
  );
}

export function IconChart({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M3 3v18h18" stroke="url(#g8)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="12" width="2" height="6" rx="1" fill="#6366F1" />
        <rect x="10" y="8" width="2" height="10" rx="1" fill="#60A5FA" />
        <rect x="14" y="5" width="2" height="13" rx="1" fill="#F59E0B" />
        <defs>
          <linearGradient id="g8" x1="0" x2="1"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#F59E0B"/></linearGradient>
        </defs>
      </svg>
    </IconShell>
  );
}

export function IconInvoices({ size = 16, className = "" }: IconProps) {
  return IconDoc({ size, className });
}
export function IconPayments({ size = 16, className = "" }: IconProps) {
  return IconLink({ size, className });
}
export function IconAnalytics({ size = 16, className = "" }: IconProps) {
  return IconChart({ size, className });
}
export function IconSettings({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" stroke="#E5E7EB" strokeWidth="0.8" opacity="0.5" />
        <path d="M19.4 15a1.6 1.6 0 00.32 1.76l.02.02a2 2 0 01-2.83 2.83l-.02-.02A1.6 1.6 0 0015 20.6a1.6 1.6 0 00-1.76.32l-.02.02a2 2 0 01-2.83-2.83l.02-.02A1.6 1.6 0 008.4 15a1.6 1.6 0 00-.32-1.76l-.02-.02a2 2 0 012.83-2.83l.02.02A1.6 1.6 0 0013 8.4a1.6 1.6 0 001.76-.32l.02-.02a2 2 0 012.83 2.83l-.02.02A1.6 1.6 0 0019.4 15z" fill="#6366F1" fillOpacity="0.9" />
      </svg>
    </IconShell>
  );
}

export function IconCopy({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="9" y="9" width="9" height="11" rx="2" stroke="#E5E7EB" strokeWidth="1.2" opacity="0.6"/>
        <rect x="6" y="4" width="9" height="11" rx="2" fill="#6366F1" fillOpacity="0.08"/>
      </svg>
    </IconShell>
  );
}

export function IconMenu({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" stroke="#E5E7EB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
      </svg>
    </IconShell>
  );
}

export default IconShell;

export function IconPlus({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="#E5E7EB" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
      </svg>
    </IconShell>
  );
}

export function IconX({ size = 16, className = "" }: IconProps) {
  return (
    <IconShell size={size} className={className}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M6 6l12 12M6 18L18 6" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconShell>
  );
}
