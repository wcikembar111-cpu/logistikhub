import { Heart, Volume2, X, Reply, Check, Users } from 'lucide-react';
import { BroadcastMessage } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';
import { parseBroadcastPayload } from '../../utils/broadcastFormat';

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
  if (!broadcast) return null;

  const timeFormatted = new Date(broadcast.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const parsed = parseBroadcastPayload(broadcast.message, broadcast.sender_name);

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg flex flex-col items-center gap-2 relative pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Floating Pink Love Robot Avatar with Thrusters & Glow */}
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          
          {/* Holographic Love Heart Signal Rings */}
          <div className="absolute -top-4 w-14 h-14 rounded-full border-2 border-pink-400/50 animate-ping pointer-events-none" />
          
          {/* Floating Miniature Hearts around Robot */}
          <div className="absolute -top-2 -left-6 animate-pulse text-pink-400 pointer-events-none">
            <Heart size={14} className="fill-pink-400 opacity-80 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div className="absolute -top-1 -right-6 animate-pulse text-rose-400 pointer-events-none delay-150">
            <Heart size={12} className="fill-rose-400 opacity-90" />
          </div>

          {/* Robot Head and Body with Hands and Legs */}
          <div 
            className="relative group cursor-pointer flex flex-col items-center" 
            onClick={() => playBroadcastSound('info')}
            title="Klik untuk bunyikan nada"
          >
            {/* Robot Head Container - Pink / Magenta Cyber Gradient */}
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-b from-pink-500 via-rose-600 to-pink-700 border-2 border-pink-300 shadow-[0_0_30px_rgba(244,63,94,0.65)] flex items-center justify-center relative z-10 transition-transform active:scale-95">
              
              {/* Antenna with Glowing Heart Top */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="p-0.5 rounded-full bg-pink-300 shadow-[0_0_12px_#fb7185] animate-pulse">
                  <Heart size={12} className="text-pink-600 fill-pink-600" />
                </div>
                <div className="w-1 h-2 bg-pink-300" />
              </div>

              {/* Robot Face Screen (Glossy Visor) */}
              <div className="w-12 h-8 sm:w-14 sm:h-9 rounded-2xl bg-slate-900 border border-pink-400/60 flex items-center justify-around px-1.5 sm:px-2 shadow-inner relative overflow-hidden">
                
                {/* Glowing Heart / Love Eyes */}
                <div className="flex items-center justify-center animate-pulse">
                  <Heart size={13} className="text-pink-400 fill-pink-400 shadow-[0_0_8px_#f43f5e]" />
                </div>

                {/* Cute Blush Cheek Dots */}
                <div className="w-1 h-1 rounded-full bg-pink-500/80 blur-[0.5px]" />

                {/* Glowing Heart / Love Eyes */}
                <div className="flex items-center justify-center animate-pulse">
                  <Heart size={13} className="text-pink-400 fill-pink-400 shadow-[0_0_8px_#f43f5e]" />
                </div>
              </div>

              {/* Robot Pink Ear Sensors */}
              <div className="absolute -left-1.5 w-1.5 h-5 rounded-l-md bg-pink-300 shadow-[0_0_6px_#f43f5e]" />
              <div className="absolute -right-1.5 w-1.5 h-5 rounded-r-md bg-pink-300 shadow-[0_0_6px_#f43f5e]" />
            </div>

            {/* Robot Torso and Tangan (Hands & Arms) */}
            <div className="relative flex items-center justify-center -mt-1 z-5">
              {/* Tangan Kiri */}
              <div className="flex flex-col items-center -mr-1">
                <div className="w-2.5 h-4 bg-pink-400 rounded-sm" />
                <div className="w-3 h-3 bg-pink-300 rounded-full border border-white -mt-0.5 flex items-center justify-center shadow-xs">
                  <div className="w-1 h-1 bg-pink-600 rounded-full" />
                </div>
              </div>

              {/* Torso */}
              <div className="w-12 h-8 rounded-xl bg-gradient-to-b from-rose-600 to-pink-800 border-2 border-pink-300/80 shadow-md flex items-center justify-center">
                <Heart size={10} className="text-white fill-white animate-pulse" />
              </div>

              {/* Tangan Kanan (Melambai) */}
              <div className="flex flex-col items-center -ml-1 animate-bounce">
                <div className="w-2.5 h-4 bg-pink-400 rounded-sm rotate-12" />
                <div className="w-3.5 h-3.5 bg-amber-300 rounded-full border border-white -mt-0.5 flex items-center justify-center text-[9px] shadow-sm">
                  👋
                </div>
              </div>
            </div>

            {/* Kaki (Legs & Feet) with Plasma Thrusters */}
            <div className="flex items-center justify-center gap-2.5 -mt-0.5 relative z-0">
              {/* Kaki Kiri */}
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-3.5 bg-rose-500 rounded-b-sm" />
                <div className="w-3.5 h-2 bg-pink-300 rounded-full border border-white/70 -mt-0.5" />
                <div className="w-2 h-4 bg-gradient-to-b from-pink-300 via-rose-500 to-transparent rounded-full blur-[0.5px] animate-pulse" />
              </div>

              {/* Kaki Kanan */}
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-3.5 bg-rose-500 rounded-b-sm" />
                <div className="w-3.5 h-2 bg-pink-300 rounded-full border border-white/70 -mt-0.5" />
                <div className="w-2 h-4 bg-gradient-to-b from-pink-300 via-rose-500 to-transparent rounded-full blur-[0.5px] animate-pulse delay-75" />
              </div>
            </div>
          </div>
        </div>

        {/* Message Speech Bubble Dialog Delivered by Pink Love Robot */}
        <div className="w-full bg-white rounded-3xl shadow-2xl border-2 border-pink-200 overflow-hidden animate-in zoom-in-95 duration-150 relative">
          
          {/* Header Tag: Pengirim & Kepada */}
          <div className="px-4 py-3 bg-pink-50 text-slate-800 flex flex-wrap items-center justify-between gap-2 border-b border-pink-200">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="p-1 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                <Heart size={14} className="fill-pink-600 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                <span>Pengirim:</span>
                <strong className="text-pink-600 uppercase">{broadcast.sender_name}</strong>
                {parsed.recipient && parsed.recipient !== 'Semua Tim (Publik)' && (
                  <span className="bg-pink-200 text-pink-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Users size={10} />
                    <span>Kepada: {parsed.recipient}</span>
                  </span>
                )}
                {broadcast.origin === 'external' && (
                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-indigo-200">
                    App Lain
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-500 ml-auto">
              <span>{timeFormatted}</span>
              {soundEnabled && (
                <button
                  type="button"
                  onClick={() => playBroadcastSound('info')}
                  className="p-1 rounded-lg bg-white hover:bg-pink-100 text-pink-600 border border-pink-200 cursor-pointer"
                  title="Bunyikan Nada"
                >
                  <Volume2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-all cursor-pointer"
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Speech Bubble Body */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-pink-50/40 via-rose-50/20 to-white">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-pink-100 shadow-xs text-slate-800 text-sm sm:text-base font-bold leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
              "{parsed.cleanMessage || broadcast.message}"
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-4 py-2.5 bg-pink-50/50 border-t border-pink-100 flex items-center justify-end gap-2">
            {onReply && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReply(broadcast.sender_name);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Reply size={13} />
                <span>Balas Pesan</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} className="stroke-[3]" />
              <span>OK, Saya Mengerti</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
