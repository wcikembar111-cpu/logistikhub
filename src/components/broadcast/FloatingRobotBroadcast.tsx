import { Volume2, X, Reply, Check, Users, Sparkles, Radio } from 'lucide-react';
import { KinoRobotAvatar, KinoEmblemSvg } from './KinoRobotAvatar';
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
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg flex flex-col items-center gap-3 relative pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Floating KinoBot Avatar with Corporate Blue & Golden Thrusters */}
        <div className="relative flex flex-col items-center animate-bounce duration-1000">
          
          {/* Signal Rings in Kino Golden Yellow & Corporate Blue */}
          <div className="absolute -top-4 w-16 h-16 rounded-full border-2 border-amber-400/50 animate-ping pointer-events-none" />
          
          {/* Floating Kino Brand Sparks */}
          <div className="absolute -top-3 -left-8 animate-pulse text-amber-400 pointer-events-none">
            <Sparkles size={16} className="text-amber-400 fill-amber-300" />
          </div>
          <div className="absolute -top-2 -right-8 animate-pulse text-sky-400 pointer-events-none delay-150">
            <Sparkles size={14} className="text-sky-400 fill-sky-300" />
          </div>

          {/* DDS Robot Avatar Body */}
          <div 
            className="cursor-pointer group flex flex-col items-center transition-transform active:scale-95" 
            onClick={() => playBroadcastSound('info')}
            title="Klik untuk bunyikan nada siaran"
          >
            <KinoRobotAvatar 
              size="lg"
              isSpeaking={true}
              isHovered={true}
              showFloatingBadges={true}
            />
          </div>
        </div>

        {/* Message Speech Bubble Dialog Delivered by KinoBot */}
        <div className="w-full bg-white rounded-3xl shadow-2xl border-2 border-blue-200 overflow-hidden animate-in zoom-in-95 duration-150 relative">
          
          {/* Header Tag: Pengirim & Kepada with Kino Identity */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 via-sky-50/50 to-amber-50/40 text-slate-800 flex flex-wrap items-center justify-between gap-2 border-b border-blue-100">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <div className="p-1.5 rounded-xl bg-white border border-blue-200 shadow-xs flex items-center justify-center">
                <KinoEmblemSvg className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-semibold">Pengirim:</span>
                <strong className="text-blue-900 font-black uppercase tracking-tight">{broadcast.sender_name}</strong>
                {parsed.recipient && parsed.recipient !== 'Semua Tim (Publik)' && (
                  <span className="bg-blue-100 text-blue-900 border border-blue-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Users size={10} />
                    <span>Kepada: {parsed.recipient}</span>
                  </span>
                )}
                {broadcast.origin === 'external' && (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full">
                    App Lain
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-[11px] text-slate-500 ml-auto">
              <span className="font-mono">{timeFormatted}</span>
              {soundEnabled && (
                <button
                  type="button"
                  onClick={() => playBroadcastSound('info')}
                  className="p-1 rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 cursor-pointer shadow-xs"
                  title="Bunyikan Nada"
                >
                  <Volume2 size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200 transition-all cursor-pointer shadow-xs"
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Speech Bubble Body */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-blue-50/30 via-slate-50/20 to-white">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-blue-100/80 shadow-xs text-slate-800 text-sm sm:text-base font-bold leading-relaxed whitespace-pre-wrap break-words max-h-52 overflow-y-auto">
              "{parsed.cleanMessage || broadcast.message}"
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Radio size={12} className="text-amber-500 animate-pulse" />
              <span>KinoBot Komunikator Logistik</span>
            </div>

            <div className="flex items-center gap-2">
              {onReply && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReply(broadcast.sender_name);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <Reply size={13} />
                  <span>Balas Pesan</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 hover:from-blue-800 hover:to-blue-950 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 border border-blue-600/30"
              >
                <Check size={14} className="stroke-[3]" />
                <span>OK, Saya Mengerti</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
