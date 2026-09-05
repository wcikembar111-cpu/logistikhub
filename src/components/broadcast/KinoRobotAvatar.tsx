import React from 'react';
import { Sparkles } from 'lucide-react';
import { InitialDLogo } from '../common/InitialDLogo';

export interface KinoRobotAvatarProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isSpeaking?: boolean;
  isBlinking?: boolean;
  isHovered?: boolean;
  isNearCursor?: boolean;
  eyeOffset?: { x: number; y: number };
  headTilt?: { rotateX: number; rotateY: number };
  showFloatingBadges?: boolean;
  className?: string;
}

/**
 * Modern High-Tech Monogram "D" Logo (DDS / Logistik Tools)
 */
export function KinoEmblemSvg({ className = "w-5 h-5", glow = false }: { className?: string; glow?: boolean }) {
  return <InitialDLogo className={className} glow={glow} />;
}

export const DdsEmblemSvg = InitialDLogo;

/**
 * Robot Maskot Resmi PT KINO INDONESIA (KinoBot)
 * Didesain aerodinamis, futuristik, dan ramah dengan skema warna
 * resmi PT Kino Indonesia: Royal Corporate Blue (#0060A9) & Golden Yellow (#F7A81B).
 */
export function KinoRobotAvatar({
  size = 'md',
  isSpeaking = false,
  isBlinking = false,
  isHovered = false,
  isNearCursor = false,
  eyeOffset = { x: 0, y: 0 },
  headTilt = { rotateX: 0, rotateY: 0 },
  showFloatingBadges = true,
  className = ''
}: KinoRobotAvatarProps) {

  // Scale map according to size preset
  const scaleClasses = {
    xs: 'scale-75',
    sm: 'scale-90',
    md: 'scale-100',
    lg: 'scale-125 sm:scale-135',
    xl: 'scale-140 sm:scale-160'
  }[size];

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      
      {/* FLOATING KINO BRAND SPARKS & EMBLEMS */}
      {showFloatingBadges && (
        <>
          {/* Top Left: Floating Kino Golden Dynamic Spark */}
          <div className="absolute -top-3.5 -left-4 pointer-events-none z-30 animate-bounce duration-1000">
            <div className="relative flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 shadow-[0_0_8px_rgba(245,166,35,0.9)] flex items-center justify-center transform -rotate-12 group-hover:scale-110 transition-transform">
                <Sparkles size={10} className="text-blue-900 fill-blue-900" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-white rounded-full animate-ping" />
            </div>
          </div>

          {/* Top Right: Floating Kino Mini Dynamic Star */}
          <div className="absolute -top-2 -right-4 pointer-events-none z-30 animate-[pulse_2.2s_ease-in-out_infinite]">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border border-amber-400 p-0.5 shadow-[0_0_6px_rgba(0,96,169,0.8)] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            </div>
          </div>

          {/* Bottom Right: Mini Kinetic Energy Swoosh on hover */}
          <div className={`absolute -bottom-1 -right-2.5 pointer-events-none z-30 transition-all duration-300 ${
            isHovered || isNearCursor ? 'opacity-100 scale-100 translate-y-0' : 'opacity-40 scale-75'
          }`}>
            <div className="w-3 h-3 rounded-full bg-amber-400/90 text-[8px] font-black text-blue-950 flex items-center justify-center shadow-[0_0_6px_rgba(247,168,27,0.9)]">
              ★
            </div>
          </div>
        </>
      )}

      {/* ACOUSTIC VOICE WAVES (Saat robot sedang bersuara) */}
      {isSpeaking && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="absolute w-14 h-14 rounded-full border-2 border-amber-400/80 animate-ping shadow-[0_0_15px_rgba(245,166,35,0.7)]" />
          <div className="absolute w-18 h-18 rounded-full border-2 border-blue-500/80 animate-voice-wave-1 shadow-[0_0_20px_rgba(0,96,169,0.6)]" />
          <div className="absolute w-22 h-22 rounded-full border border-sky-300/60 animate-voice-wave-2 shadow-[0_0_25px_rgba(56,189,248,0.5)]" />
        </div>
      )}

      {/* AMBIENT CORPORATE GLOW */}
      <div className={`absolute -inset-2 rounded-full bg-gradient-to-r from-blue-600/30 via-amber-400/25 to-blue-500/30 blur-md transition-opacity duration-300 pointer-events-none ${
        isSpeaking ? 'opacity-100 scale-125' : (isNearCursor || isHovered ? 'opacity-100 scale-110' : 'opacity-25 scale-90')
      }`} />

      {/* ========================================================================= */}
      {/* ROBOT BODY WRAPPER (Interactive 3D Tilt & Bobbing) */}
      {/* ========================================================================= */}
      <div 
        className={`relative flex flex-col items-center transition-all duration-200 ${scaleClasses}`}
        style={{
          transform: `perspective(400px) rotateX(${headTilt.rotateX * 0.45}deg) rotateY(${headTilt.rotateY * 0.45}deg)`
        }}
      >
        {/* 1. KINO CROWN / ANTENNA SENSOR WITH DYNAMIC GOLD BEACON */}
        <div className="flex flex-col items-center -mb-0.5 relative z-20">
          <div className="relative flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full border border-white flex items-center justify-center transition-all ${
              isSpeaking 
                ? 'bg-amber-300 shadow-[0_0_10px_#f59e0b] scale-110'
                : (isNearCursor || isHovered 
                    ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' 
                    : 'bg-gradient-to-tr from-amber-400 to-yellow-200 shadow-[0_0_6px_#f59e0b]')
            }`}>
              <div className="w-1 h-1 rounded-full bg-white animate-ping" />
            </div>
            {/* Aerodynamic Antenna Fin */}
            <div className="absolute -top-1 w-1.5 h-1.5 bg-amber-300 rotate-45 rounded-xs" />
          </div>
          <div className="w-0.5 h-2 bg-gradient-to-b from-amber-300 to-blue-600" />
        </div>

        {/* 2. ROBOT HEAD & SLEEK VISOR WITH ARMS ATTACHED */}
        <div className="relative flex items-center justify-center">
          
          {/* TANGAN KIRI (Left Robotic Arm in Kino Royal Blue) */}
          <div className="absolute -left-3.5 top-3 flex flex-col items-center z-10 transition-transform duration-200 group-hover:-rotate-12">
            <div className="w-1.5 h-3.5 bg-gradient-to-b from-blue-600 to-blue-800 rounded-full border border-amber-300/80 shadow-xs transform -rotate-12" />
            {/* Robotic Hand Paw with White & Gold Accent */}
            <div className="w-3 h-3 rounded-full bg-white border border-blue-600 shadow-xs -mt-1 flex items-center justify-center">
              <div className="w-1 h-1 bg-amber-500 rounded-full" />
            </div>
          </div>

          {/* ROBOT HEAD HELMET (Kino Royal Blue with Golden Trim & White Glare) */}
          <div className="relative w-12 h-10 sm:w-13 sm:h-10.5 rounded-2xl bg-gradient-to-b from-[#0073C8] via-[#0060A9] to-[#004880] border-2 border-white/90 shadow-[0_4px_16px_rgba(0,64,120,0.45)] flex items-center justify-center p-1 z-10">
            
            {/* Top Gloss Highlights */}
            <div className="absolute top-0.5 left-2 right-2 h-1 bg-white/40 rounded-full blur-[0.5px] pointer-events-none" />

            {/* Left Ear Antenna: Kino Golden Swoosh Fin */}
            <div className="absolute -left-1.5 top-2.5 w-1.5 h-4.5 rounded-l-md bg-gradient-to-b from-amber-300 to-amber-500 border-l border-white shadow-xs flex items-center justify-center">
              <div className="w-0.5 h-2 bg-blue-900 rounded-full" />
            </div>

            {/* Right Ear Antenna: Kino Golden Swoosh Fin */}
            <div className="absolute -right-1.5 top-2.5 w-1.5 h-4.5 rounded-r-md bg-gradient-to-b from-amber-300 to-amber-500 border-r border-white shadow-xs flex items-center justify-center">
              <div className="w-0.5 h-2 bg-blue-900 rounded-full" />
            </div>

            {/* Dark Glossy OLED Visor Screen */}
            <div className="w-full h-full rounded-xl bg-[#09111e] border border-sky-400/40 flex items-center justify-between px-1.5 py-0.5 shadow-inner relative overflow-hidden">
              
              {/* Visor Glare Reflection Curved Line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

              {/* LEFT EYE (LED Blue/Cyan or Golden) */}
              <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                {isBlinking ? (
                  <div className="w-2.5 h-0.5 bg-amber-300 rounded-full shadow-[0_0_5px_#f59e0b]" />
                ) : isHovered ? (
                  /* Happy smiling squint eye ^ on hover */
                  <div className="w-2.5 h-1.5 border-t-2 border-l-2 border-r-2 border-amber-300 rounded-t-full shadow-[0_0_6px_#fbbf24]" />
                ) : (
                  /* High-Tech Glowing Eye with pupil tracking */
                  <div 
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-200 shadow-[0_0_6px_#38bdf8] flex items-center justify-center transition-transform duration-75"
                    style={{
                      transform: `translate(${eyeOffset.x * 0.4}px, ${eyeOffset.y * 0.4}px)`
                    }}
                  >
                    <div className="w-1 h-1 bg-white rounded-full -mt-0.5 -ml-0.5" />
                  </div>
                )}
              </div>

              {/* CENTER DISPLAY: Mini Kino Leaf / Energy Core */}
              <div className="flex flex-col items-center justify-center">
                {isSpeaking ? (
                  /* Equalizer wave when speaking */
                  <div className="flex items-center gap-0.5">
                    <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse" />
                    <span className="w-0.5 h-3 bg-white rounded-full animate-ping" />
                    <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse" />
                  </div>
                ) : (
                  /* Friendly smile / Kino emblem accent */
                  <div className="w-2 h-0.5 bg-amber-400/90 rounded-full shadow-[0_0_3px_#f59e0b]" />
                )}
              </div>

              {/* RIGHT EYE (LED Blue/Cyan or Golden) */}
              <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                {isBlinking ? (
                  <div className="w-2.5 h-0.5 bg-amber-300 rounded-full shadow-[0_0_5px_#f59e0b]" />
                ) : isHovered ? (
                  /* Happy smiling squint eye ^ on hover */
                  <div className="w-2.5 h-1.5 border-t-2 border-l-2 border-r-2 border-amber-300 rounded-t-full shadow-[0_0_6px_#fbbf24]" />
                ) : (
                  /* High-Tech Glowing Eye with pupil tracking */
                  <div 
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-sky-400 to-cyan-200 shadow-[0_0_6px_#38bdf8] flex items-center justify-center transition-transform duration-75"
                    style={{
                      transform: `translate(${eyeOffset.x * 0.4}px, ${eyeOffset.y * 0.4}px)`
                    }}
                  >
                    <div className="w-1 h-1 bg-white rounded-full -mt-0.5 -ml-0.5" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TANGAN KANAN (Right Arm - Waving Greeting Gesture) */}
          <div className="absolute -right-3.5 top-2.5 flex flex-col items-center z-10 origin-bottom transition-transform duration-300 group-hover:rotate-12 animate-[bounce_2s_ease-in-out_infinite]">
            {/* Friendly Hand Paw with Wave */}
            <div className="w-3.5 h-3.5 rounded-full bg-amber-100 border border-amber-400 shadow-xs flex items-center justify-center -mb-0.5">
              <span className="text-[9px] leading-none">👋</span>
            </div>
            <div className="w-1.5 h-3.5 bg-gradient-to-t from-blue-600 to-blue-800 rounded-full border border-amber-300/80 shadow-xs transform rotate-12" />
          </div>
        </div>

        {/* 3. ROBOT TORSO WITH PT KINO INDONESIA EMBLEM REACTOR */}
        <div className="relative flex items-center justify-center -mt-1.5 z-5">
          <div className="w-9 h-4.5 rounded-xl bg-gradient-to-b from-[#005596] to-[#003B6B] border border-white/90 shadow-md flex items-center justify-center px-1.5 gap-1">
            {/* Official Kino Emblem Core */}
            <div className="w-3.5 h-3.5 rounded-full bg-white/95 flex items-center justify-center p-0.5 shadow-inner">
              <KinoEmblemSvg className="w-3 h-3" />
            </div>

            {/* "DDS" Micro Typography Badge */}
            <span className="text-[6.5px] font-black tracking-wider text-amber-300 drop-shadow-xs">
              DDS
            </span>
          </div>
        </div>

        {/* 4. HOVER PLASMA DUAL THRUSTERS (Kino Golden & Blue Flames) */}
        <div className="flex items-center justify-center gap-2 -mt-0.5">
          {/* Left Thruster */}
          <div className="w-2 h-1.5 bg-gradient-to-b from-amber-300 via-amber-500 to-transparent rounded-full blur-[0.6px] animate-pulse" />
          {/* Right Thruster */}
          <div className="w-2 h-1.5 bg-gradient-to-b from-sky-400 via-blue-600 to-transparent rounded-full blur-[0.6px] animate-pulse delay-75" />
        </div>
      </div>
    </div>
  );
}
