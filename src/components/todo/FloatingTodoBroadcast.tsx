import { useEffect, useState } from 'react';
import { ListTodo, Volume2, X, Zap, Flame, AlertCircle, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { TodoData, TodoPriority } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';

export interface IncomingTodoPayload extends Partial<TodoData> {
  task: string;
  priority?: TodoPriority;
  is_blinking?: boolean;
  created_at?: string;
  sender_name?: string;
}

interface FloatingTodoBroadcastProps {
  incomingTodo: IncomingTodoPayload | null;
  onClose: () => void;
  onOpenTodo: () => void;
  soundEnabled: boolean;
}

export function FloatingTodoBroadcast({
  incomingTodo,
  onClose,
  onOpenTodo,
  soundEnabled
}: FloatingTodoBroadcastProps) {
  const [autoCloseTimer, setAutoCloseTimer] = useState<number>(25);

  useEffect(() => {
    if (!incomingTodo) return;

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
  }, [incomingTodo, onClose]);

  if (!incomingTodo) return null;

  const priority = incomingTodo.priority || 'rendah';
  const isBlinking = !!incomingTodo.is_blinking || priority === 'mendesak';
  const isUrgent = priority === 'mendesak' || isBlinking;
  const isHigh = priority === 'tinggi';
  const isMedium = priority === 'sedang';

  const timeFormatted = incomingTodo.created_at
    ? new Date(incomingTodo.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const handlePlaySound = () => {
    const soundCat = isUrgent ? 'urgent' : isHigh ? 'warning' : 'announcement';
    playBroadcastSound(soundCat);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg flex flex-col items-center gap-3 relative pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Animated Header Badge */}
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          {/* Pulsing Radiation Rings */}
          <div
            className={`absolute -top-3 w-16 h-16 rounded-full border-2 animate-ping pointer-events-none ${
              isUrgent ? 'border-red-500/60' : isHigh ? 'border-amber-500/60' : 'border-orange-500/60'
            }`}
          />

          {/* Floating Action Icon with Glowing Shadow */}
          <div
            onClick={handlePlaySound}
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center relative z-10 transition-transform active:scale-95 cursor-pointer shadow-2xl border-2 ${
              isUrgent
                ? 'bg-gradient-to-b from-red-500 via-rose-600 to-red-700 border-red-300 shadow-[0_0_35px_rgba(239,68,68,0.75)]'
                : isHigh
                ? 'bg-gradient-to-b from-amber-500 via-orange-600 to-amber-700 border-amber-300 shadow-[0_0_35px_rgba(245,158,11,0.7)]'
                : 'bg-gradient-to-b from-orange-500 via-amber-600 to-orange-700 border-orange-300 shadow-[0_0_35px_rgba(249,115,22,0.7)]'
            }`}
            title="Klik untuk bunyikan ulang audio"
          >
            {isUrgent ? (
              <Zap size={32} className="text-white fill-white animate-pulse" />
            ) : (
              <ListTodo size={32} className="text-white animate-pulse" />
            )}
          </div>
        </div>

        {/* Modal Dialog Card */}
        <div
          className={`w-full bg-white rounded-3xl shadow-2xl border-2 overflow-hidden animate-in zoom-in-95 duration-150 relative ${
            isUrgent
              ? 'border-red-500/80 shadow-[0_20px_50px_rgba(239,68,68,0.25)]'
              : isHigh
              ? 'border-amber-500/80 shadow-[0_20px_50px_rgba(245,158,11,0.25)]'
              : 'border-orange-400/80 shadow-[0_20px_50px_rgba(249,115,22,0.25)]'
          }`}
        >
          {/* Header Bar */}
          <div
            className={`px-4 sm:px-5 py-3 text-white flex items-center justify-between gap-2 border-b ${
              isUrgent
                ? 'bg-gradient-to-r from-red-950 via-rose-900 to-slate-900 border-red-500/40'
                : isHigh
                ? 'bg-gradient-to-r from-amber-950 via-orange-900 to-slate-900 border-amber-500/40'
                : 'bg-gradient-to-r from-orange-950 via-amber-900 to-slate-900 border-orange-500/40'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`p-1.5 rounded-xl flex items-center justify-center shrink-0 ${
                  isUrgent ? 'bg-red-500/30 text-red-300' : 'bg-orange-500/30 text-orange-300'
                }`}
              >
                <Sparkles size={16} className="animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white m-0 truncate flex items-center gap-1.5">
                  <span>SIARAN TUGAS BARU</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-bold uppercase">
                    Public Todo
                  </span>
                </h4>
                <div className="text-[11px] text-slate-300 font-medium">
                  Disiarkan ke semua perangkat • Pukul {timeFormatted}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {soundEnabled && (
                <button
                  type="button"
                  onClick={handlePlaySound}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-orange-300 transition-all cursor-pointer"
                  title="Bunyikan Nada Tugas"
                >
                  <Volume2 size={15} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Tutup Notifikasi"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 space-y-3.5 bg-gradient-to-b from-orange-50/30 via-slate-50/20 to-white">
            {/* Priority Status Pill */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tingkat:</span>
                {isUrgent ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-red-600 text-white border border-red-700 shadow-md animate-badge-blink">
                    <Zap size={13} className="fill-current animate-bounce" />
                    <span>PRIORITAS KEDIP MENDESAK</span>
                  </span>
                ) : isHigh ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase bg-amber-500 text-white border border-amber-600 shadow-sm">
                    <Flame size={13} className="fill-current" />
                    <span>PRIORITAS TINGGI</span>
                  </span>
                ) : isMedium ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase bg-blue-600 text-white border border-blue-700 shadow-sm">
                    <AlertCircle size={13} />
                    <span>PRIORITAS SEDANG</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-slate-200 text-slate-700 border border-slate-300">
                    <span>TUGAS BIASA</span>
                  </span>
                )}
              </div>

              {incomingTodo.sender_name && (
                <span className="text-[11px] text-slate-500 font-semibold truncate">
                  Oleh: <strong className="text-slate-800 font-bold">{incomingTodo.sender_name}</strong>
                </span>
              )}
            </div>

            {/* Task Content Speech Bubble */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border-2 border-orange-200/80 shadow-sm relative">
              <div className="text-[10px] font-black uppercase tracking-wider text-orange-600 mb-1">
                Rincian Tugas:
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                "{incomingTodo.task}"
              </div>
            </div>

            {/* Auto-close Progress Timer */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1 pt-1">
              <span className="flex items-center gap-1 text-orange-600 font-semibold">
                <ListTodo size={13} />
                Menutup otomatis dalam {autoCloseTimer}s
              </span>
              <div className="w-28 bg-orange-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-red-500 transition-all duration-1000 rounded-full"
                  style={{ width: `${(autoCloseTimer / 25) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 order-2 sm:order-1"
            >
              Tutup Notifikasi
            </button>

            <div className="flex items-center gap-2 order-1 sm:order-2">
              <button
                type="button"
                onClick={() => {
                  onOpenTodo();
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Buka Public Todo</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
