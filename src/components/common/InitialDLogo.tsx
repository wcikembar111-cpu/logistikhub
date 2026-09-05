import React from 'react';

interface InitialDLogoProps {
  className?: string;
  glow?: boolean;
  withContainer?: boolean;
}

/**
 * Modern High-Tech Monogram "D" Logo (DDS / Logistik Tools)
 * Features:
 * - Geometric faceted vertical tech spine in electric sapphire & cyan
 * - Aerodynamic curved forward-loop with precision cyber air-gap
 * - Supersonic amber-gold kinetic speed chevron inside the core
 * - Specular micro-star flare at apex
 */
export function InitialDLogo({ 
  className = "w-6 h-6", 
  glow = false,
  withContainer = false 
}: InitialDLogoProps) {
  const svg = (
    <svg 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]' : 'drop-shadow-xs'} transition-all`}
    >
      <defs>
        {/* Sapphire to Deep Electric Blue for Spine */}
        <linearGradient id="dSpineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="40%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Vibrant Cyan to Royal Indigo for Outer Loop */}
        <linearGradient id="dLoopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="45%" stopColor="#2563EB" />
          <stop offset="85%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>

        {/* Kinetic Amber Gold for Supersonic Speed Core */}
        <linearGradient id="dGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>

        {/* Specular Edge Bevel */}
        <linearGradient id="dEdgeBevel" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* 1. Left Vertical Tech Pillar / Spine with chamfered angles */}
      <path 
        d="M8 12 L13 7 L18 7 L18 41 L13 41 L8 36 Z" 
        fill="url(#dSpineGrad)" 
      />
      {/* Pillar subtle top-edge shine */}
      <path 
        d="M8 12 L13 7 L18 7" 
        stroke="url(#dEdgeBevel)" 
        strokeWidth="1" 
        strokeLinecap="round" 
      />

      {/* 2. Aerodynamic Outer & Inner Curved Monogram "D" Loop */}
      <path 
        d="M21 7 L28 7 C37.5 7 43 13.5 43 24 C43 34.5 37.5 41 28 41 L21 41 L21 33 L27 33 C32.5 33 35.5 29 35.5 24 C35.5 19 32.5 15 27 15 L21 15 Z" 
        fill="url(#dLoopGrad)" 
      />

      {/* Loop Top Specular Curved Highlight */}
      <path 
        d="M21 7 L28 7 C35 7 40 12 41.5 19" 
        stroke="url(#dEdgeBevel)" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
      />

      {/* 3. Golden Supersonic Speed Chevron Core inside the 'D' */}
      <path 
        d="M17 21 L25 21 L29 24 L25 27 L17 27 L20 24 Z" 
        fill="url(#dGoldGrad)" 
      />

      {/* 4. Apex Star Flare Highlight */}
      <circle cx="34" cy="11" r="1.5" fill="#FFFFFF" opacity="0.95" />
      <path 
        d="M34 8.5 V13.5 M31.5 11 H36.5" 
        stroke="#FFFFFF" 
        strokeWidth="0.75" 
        strokeLinecap="round" 
        opacity="0.9" 
      />
    </svg>
  );

  if (withContainer) {
    return (
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-blue-400/40 flex items-center justify-center shadow-md shadow-blue-500/20 p-1.5 shrink-0">
        {svg}
      </div>
    );
  }

  return svg;
}

// Backwards compatibility alias for components expecting KinoEmblemSvg or DdsEmblemSvg
export const DdsEmblemSvg = InitialDLogo;
export const KinoEmblemSvg = InitialDLogo;
