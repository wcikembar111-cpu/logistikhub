import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Baby, Sparkles, Eye, PartyPopper, CheckCircle } from 'lucide-react';
import { PopyMaternityModal } from './PopyMaternityModal';

interface PopyMaternityCountdownProps {
  isAdmin: boolean;
}

// Target Waktu: 2 September 2026 jam 11:00:00 WIB (UTC+7)
const TARGET_DATE = new Date('2026-09-02T11:00:00+07:00').getTime();

export function PopyMaternityCountdown({ isAdmin }: PopyMaternityCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isFinished: false,
  });

  const [showModal, setShowModal] = useState(false);
  const [isTestPreview, setIsTestPreview] = useState(false);
  const hasAutoTriggeredRef = useRef(false);

  // Play celebratory sound
  const playCelebrationChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Happy celebratory arpeggio (C5 -> E5 -> G5 -> C6 -> E6)
      const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        const startTime = ctx.currentTime + idx * 0.12;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    } catch (e) {
      console.error('Failed to play celebration sound:', e);
    }
  }, []);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = TARGET_DATE - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isFinished: true,
        });

        // Trigger popup automatically if finished and not yet triggered in this session
        const alreadyDismissed = sessionStorage.getItem('popy_maternity_auto_shown');
        if (!hasAutoTriggeredRef.current && !alreadyDismissed) {
          hasAutoTriggeredRef.current = true;
          sessionStorage.setItem('popy_maternity_auto_shown', 'true');
          setIsTestPreview(false);
          setShowModal(true);
          playCelebrationChime();
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        isFinished: false,
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [playCelebrationChime]);

  const handleBadgeClick = () => {
    // Jika bukan admin dan belum tiba waktunya, tidak bisa diklik
    if (!isAdmin && !timeLeft.isFinished) {
      return;
    }
    setIsTestPreview(false);
    setShowModal(true);
  };

  const handleAdminTestPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTestPreview(true);
    setShowModal(true);
    playCelebrationChime();
  };

  const canClickBadge = isAdmin || timeLeft.isFinished;

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Countdown Badge */}
        <div
          onClick={canClickBadge ? handleBadgeClick : undefined}
          className={`py-1 px-2 sm:px-2.5 text-[10px] font-bold rounded-lg border flex items-center gap-1.5 transition-all shadow-2xs select-none ${
            canClickBadge ? 'cursor-pointer active:scale-95' : 'cursor-default'
          } ${
            timeLeft.isFinished
              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 animate-pulse'
              : 'bg-rose-50/70 text-rose-800 border-rose-200'
          }`}
          title={
            canClickBadge
              ? 'Countdown Cuti Melahirkan Popy (2 Sep 2026 11:00 WIB) - Klik untuk lihat ucapan'
              : 'Countdown Cuti Melahirkan Popy (2 Sep 2026 11:00 WIB)'
          }
        >
          <Baby size={12} className="text-rose-500 shrink-0" />
          
          <span className="font-extrabold uppercase tracking-tight text-[9px] sm:text-[10px]">
            Cuti Popy:
          </span>

          {timeLeft.isFinished ? (
            <span className="text-rose-600 font-black flex items-center gap-1">
              <PartyPopper size={11} /> TELAH TIBA 🎉
            </span>
          ) : (
            <span className="font-mono font-bold text-slate-800 text-[10px] sm:text-[11px] tracking-tight">
              {timeLeft.days}h {timeLeft.hours}j {timeLeft.minutes}m {timeLeft.seconds}d
            </span>
          )}
        </div>

        {/* Khusus Admin: Tombol Test Tampilan Popup Pesan */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleAdminTestPreview}
            className="py-1 px-2 text-[9px] sm:text-[10px] font-extrabold rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-300 hover:border-amber-500 flex items-center gap-1 transition-all shadow-2xs cursor-pointer active:scale-95 whitespace-nowrap"
            title="Uji coba tampilan popup ucapan cuti melahirkan Popy (Hanya untuk Admin)"
          >
            <Eye size={11} className="shrink-0 text-amber-600 group-hover:text-white" />
            <span>Test Popup</span>
          </button>
        )}
      </div>

      {/* Popup Ucapan Cuti Melahirkan Popy */}
      <PopyMaternityModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isTestPreview={isTestPreview}
        onTestSound={playCelebrationChime}
      />
    </>
  );
}
