import React, { useState } from 'react';
import { Heart, Sparkles, X, Copy, Check, Baby, Gift, Send, Calendar, Clock, Smile, ShieldAlert } from 'lucide-react';

interface PopyMaternityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTestPreview?: boolean;
  onTestSound?: () => void;
}

export function PopyMaternityModal({
  isOpen,
  onClose,
  isTestPreview = false,
}: PopyMaternityModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const messageText = `🎉 *Selamat Menjelang Cuti Melahirkan untuk Rekan Popy!* 👶🌸\n\n` +
    `Masa cuti resmi dimulai per tanggal *03 September 2026*.\n` +
    `Di hari terakhir kerja bersama tim ini (02 September 2026), segenap Keluarga Besar & Tim Retur Logistik mengucapkan:\n\n` +
    `✨ *Selamat menjalankan masa Cuti Melahirkan untuk Teh/Mba Popy!*\n` +
    `🙏 *Terima kasih yang sebesar-besarnya* atas segala dedikasi, kerja keras, loyalitas, dan support luar biasanya untuk Tim Retur selama ini.\n\n` +
    `🤲 *Doa Tulus Kami:*\n` +
    `Semoga proses persalinannya dilancarkan dan dimudahkan dalam segala sesuatunya, ibu yang melahirkan diberikan keselamatan, kekuatan, dan lekas pulih sehat, serta buah hati yang dilahirkan senantiasa sehat, sholeh/sholehah, membawa berkah & kebahagiaan berlimpah bagi keluarga. Aamiin yaa Rabbal 'aalamiin 🤲✨`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Gagal copy text:', e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10005] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-rose-300 relative overflow-hidden text-slate-800 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 p-5 sm:p-6 text-white relative overflow-hidden text-center">
          {/* Subtle Decorative Elements */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full blur-lg pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-yellow-300/30 rounded-full blur-lg pointer-events-none" />
          
          <button 
            onClick={onClose}
            className="absolute top-3.5 right-3.5 text-white/80 hover:text-white bg-black/15 hover:bg-black/30 p-1.5 rounded-full transition-all cursor-pointer"
            title="Tutup Popup"
          >
            <X size={18} />
          </button>

          {isTestPreview && (
            <div className="inline-flex items-center gap-1 bg-amber-900/40 text-amber-200 border border-amber-300/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full mb-2">
              <ShieldAlert size={11} />
              <span>Mode Uji Coba Admin (Test Preview)</span>
            </div>
          )}

          <div className="w-16 h-16 bg-white text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-lg border-2 border-rose-200">
            <Baby size={34} className="animate-bounce" />
          </div>

          <span className="text-[11px] font-black tracking-widest uppercase bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-rose-100 border border-white/30 inline-block mb-1">
            🌸 SPECIAL ANNOUNCEMENT & UCAPAN HANGAT 🌸
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-white m-0 tracking-tight leading-tight uppercase drop-shadow-xs">
            Selamat Cuti Melahirkan!
          </h2>
          <p className="text-rose-100 font-extrabold text-sm sm:text-base mt-0.5 m-0">
            Atas Nama: <span className="text-yellow-200 underline decoration-yellow-300 underline-offset-2">POPY</span>
          </p>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Card 1: Ucapan Terima Kasih Support Tim Retur */}
          <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Gift size={20} />
            </div>
            <div className="text-xs sm:text-[13px] leading-relaxed">
              <div className="font-extrabold text-rose-900 text-sm mb-1 flex items-center gap-1.5">
                <span>Terima Kasih Banyak, Popy!</span>
                <Heart size={14} className="text-rose-500 fill-rose-500 inline" />
              </div>
              <p className="text-slate-700 m-0">
                Terima kasih yang tak terhingga atas segala dedikasi, kerja keras, dan support yang luar biasa untuk <strong className="text-rose-900">Tim Retur</strong> selama ini. Kehadiran dan kontribusimu selalu membawa semangat positif bagi seluruh tim.
              </p>
            </div>
          </div>

          {/* Card 2: Doa & Harapan Persalinan */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Sparkles size={20} />
            </div>
            <div className="text-xs sm:text-[13px] leading-relaxed">
              <div className="font-extrabold text-amber-900 text-sm mb-1">
                🤲 Doa & Harapan Terbaik Kami:
              </div>
              <ul className="text-slate-700 m-0 space-y-1.5 list-disc list-inside">
                <li>
                  Semoga proses persalinan berjalan dengan <strong>lancar, selamat, dan mudah</strong> bagi sang ibu.
                </li>
                <li>
                  Semoga debay (bayi) yang dilahirkan <strong>sehat walafiat, sempurna tanpa kurang suatu apa pun</strong>.
                </li>
                <li>
                  Semoga senantiasa <strong>dilancarkan segala sesuatu urusan</strong> dan diberikan pemulihan yang cepat dan penuh berkah.
                </li>
              </ul>
            </div>
          </div>

          {/* Time Reference Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-[11px] text-slate-700">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-1.5 font-semibold text-rose-700">
                <Clock size={14} className="text-rose-500 shrink-0" />
                <span>Momen Pelepasan Tim: <strong>02 September 2026 (11:00 WIB)</strong></span>
              </div>
              <span className="text-[10px] bg-rose-100/80 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                Hari Terakhir Kerja
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Calendar size={14} className="text-amber-500 shrink-0" />
                <span>Mulai Efektif Cuti Melahirkan: <strong>03 September 2026</strong></span>
              </div>
              <div className="font-extrabold text-slate-700 bg-amber-100/70 px-2 py-0.5 rounded-md text-[10px]">
                Tim Retur Logistik Kino
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100 flex-wrap">
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                copied 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Salin ucapan untuk dikirimkan ke WhatsApp"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              <span>{copied ? 'Teks Ucapan Disalin! ✓' : 'Salin Ucapan WA'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <Smile size={15} />
              <span>Tutup & Aamiin YRA</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
