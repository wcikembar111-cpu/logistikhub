import React from 'react';
import { Volume2, VolumeX, Sparkles, Mic, Play, Square } from 'lucide-react';

interface VoiceWaveVisualizerProps {
  isSpeaking: boolean;
  onTogglePlay?: () => void;
  onStop?: () => void;
  greetingText?: string;
  className?: string;
}

export const VoiceWaveVisualizer: React.FC<VoiceWaveVisualizerProps> = ({
  isSpeaking,
  onTogglePlay,
  onStop,
  greetingText,
  className = ''
}) => {
  return (
    <div 
      className={`relative w-full max-w-md transition-all duration-300 ${className}`}
    >
      {/* Expanding Ambient Wave Rings Behind when Speaking */}
      {isSpeaking && (
        <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-amber-500/20 blur-md animate-pulse pointer-events-none" />
      )}

      <div 
        className={`relative rounded-2xl border transition-all duration-300 p-3 flex flex-col gap-2.5 overflow-hidden shadow-xs ${
          isSpeaking 
            ? 'bg-gradient-to-r from-blue-50/95 via-indigo-50/95 to-blue-50/95 border-indigo-300/80 shadow-indigo-100 ring-2 ring-indigo-400/20' 
            : 'bg-white/90 backdrop-blur-xs border-slate-200/90 hover:border-slate-300'
        }`}
      >
        {/* Top Row: Status, Animated Wave Bars, and Audio Action Button */}
        <div className="flex items-center justify-between gap-3">
          
          {/* Left: Indicator & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isSpeaking 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                : 'bg-blue-50 text-blue-600 border border-blue-200'
            }`}>
              {isSpeaking ? (
                <Volume2 size={16} className="animate-bounce" />
              ) : (
                <Mic size={15} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-500 animate-ping' : 'bg-slate-300'}`} />
                <h4 className="text-xs font-bold text-slate-800 tracking-tight truncate">
                  {isSpeaking ? 'Suara Robot Menyapa...' : 'Sambutan Suara Interaktif'}
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {isSpeaking ? 'Sedang membacakan sapaan audio' : 'Klik tombol untuk mendengarkan'}
              </p>
            </div>
          </div>

          {/* Center/Right: Audio Soundwave Equalizer Bars */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/5 border border-slate-200/60">
            {[
              { height: isSpeaking ? 'h-6' : 'h-1.5', delay: '0ms' },
              { height: isSpeaking ? 'h-4' : 'h-2', delay: '150ms' },
              { height: isSpeaking ? 'h-7' : 'h-1.5', delay: '75ms' },
              { height: isSpeaking ? 'h-5' : 'h-3', delay: '220ms' },
              { height: isSpeaking ? 'h-8' : 'h-2', delay: '100ms' },
              { height: isSpeaking ? 'h-4' : 'h-1.5', delay: '180ms' },
              { height: isSpeaking ? 'h-6' : 'h-2.5', delay: '50ms' },
            ].map((bar, idx) => (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-200 ${
                  isSpeaking
                    ? 'bg-gradient-to-t from-blue-600 to-indigo-500 animate-pulse'
                    : 'bg-slate-300'
                } ${bar.height}`}
                style={{
                  animationDelay: bar.delay,
                  animationDuration: isSpeaking ? '600ms' : '0ms'
                }}
              />
            ))}
          </div>

          {/* Action Trigger Button */}
          {onTogglePlay && (
            <button
              type="button"
              onClick={isSpeaking && onStop ? onStop : onTogglePlay}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs ${
                isSpeaking
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/20'
              }`}
              title={isSpeaking ? 'Hentikan Suara' : 'Dengarkan Sambutan Suara'}
            >
              {isSpeaking ? (
                <>
                  <Square size={12} className="fill-rose-700" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play size={12} className="fill-white" />
                  <span>Sapa</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Live Speaking Caption or Teaser */}
        {greetingText && (
          <div className="text-[11px] leading-relaxed text-slate-600 bg-white/80 rounded-xl px-3 py-1.5 border border-slate-200/70 flex items-start gap-1.5">
            <Sparkles size={13} className={`shrink-0 mt-0.5 ${isSpeaking ? 'text-amber-500 animate-spin' : 'text-slate-400'}`} />
            <span className="italic line-clamp-2">
              &ldquo;{greetingText}&rdquo;
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
