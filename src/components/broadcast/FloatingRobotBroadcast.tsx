import { useEffect, useState } from 'react';
import { Bot, Volume2, X, Reply, Sparkles } from 'lucide-react';
import { BroadcastMessage } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';

interface FloatingRobotBroadcastProps {
  broadcast: BroadcastMessage | null;
  onClose: () => void;
  onReply?: (senderName: string) => void;
  soundEnabled: boolean;
}

export function FloatingRobotBroadcast({
  broadcast,
  onClose,
  onReply,
  soundEnabled
}: FloatingRobotBroadcastProps) {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number>(25);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    if (!broadcast) return;

    setAutoCloseTimer(25);
    const interval = setInterval(() => {
      setAutoCloseTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [broadcast, onClose]);

  if (!broadcast) return null;

  const timeFormatted = new Date(broadcast.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg flex flex-col items-center gap-2 relative pointer-events-auto"
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Floating Robot Avatar with Thrusters & Glow */}
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          {/* Holographic Signal Rings */}
          <div className="absolute -top-3 w-12 h-12 rounded-full border-2 border-cyan-400/40 animate-ping pointer-events-none" />

          {/* Robot Head and Body */}
          <div className="relative group cursor-pointer" onClick={() => playBroadcastSound('info')}>
            {/* Robot Head Container */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-b from-slate-800 via-slate-900 to-indigo-950 border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(6,182,212,0.6)] flex items-center justify-center relative z-10 transition-transform active:scale-95">
              
              {/* Antenna */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
                <div className="w-1 h-2 bg-slate-600" />
              </div>

              {/* Robot Face Screen */}
              <div className="w-12 h-8 sm:w-14 sm:h-10 rounded-2xl bg-slate-950 border border-cyan-500/50 flex items-center justify-around px-2 shadow-inner">
                {/* Glowing Animated Eyes */}
                <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
                <div className="w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
              </div>

              {/* Robot Ear Sensors */}
              <div className="absolute -left-1.5 w-1.5 h-5 rounded-l-md bg-cyan-500/80" />
              <div className="absolute -right-1.5 w-1.5 h-5 rounded-r-md bg-cyan-500/80" />
            </div>

            {/* Jet Thruster Flame Glow underneath */}
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <div className="w-2.5 h-4 bg-gradient-to-b from-cyan-400 via-sky-400 to-transparent rounded-full blur-[1px] animate-pulse" />
              <div className="w-3 h-5 bg-gradient-to-b from-cyan-300 via-blue-500 to-transparent rounded-full blur-[1px] animate-pulse delay-75" />
              <div className="w-2.5 h-4 bg-gradient-to-b from-cyan-400 via-sky-400 to-transparent rounded-full blur-[1px] animate-pulse delay-150" />
            </div>
          </div>
        </div>

        {/* Message Speech Bubble Dialog Delivered by Robot */}
        <div className="w-full bg-white rounded-3xl shadow-2xl border-2 border-cyan-500/40 overflow-hidden animate-in zoom-in-95 duration-150 relative">
          
          {/* Header Tag */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white flex items-center justify-between gap-2 border-b border-cyan-500/20">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300">
                <Bot size={15} />
              </div>
              <span className="text-xs font-bold text-white truncate">
                Pesan dari: <strong className="text-cyan-300 uppercase">{broadcast.sender_name}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-300">
              <span>{timeFormatted}</span>
              {soundEnabled && (
                <button
                  type="button"
                  onClick={() => playBroadcastSound('info')}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 cursor-pointer"
                  title="Bunyikan Nada"
                >
                  <Volume2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Speech Bubble Body */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-50 to-white">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-slate-800 text-sm sm:text-base font-bold leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
              "{broadcast.message}"
            </div>

            {/* Auto Close Timer Bar */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
              <span className="flex items-center gap-1">
                <Sparkles size={12} className="text-cyan-500" />
                Robot menutup dalam {autoCloseTimer}s
              </span>
              <div className="w-24 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-1000"
                  style={{ width: `${(autoCloseTimer / 25) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
            {onReply && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReply(broadcast.sender_name);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Reply size={13} />
                <span>Balas Pesan</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              Oke, Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
