import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Delete, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { verifyPin } from '../../utils/pinAuth';

interface PinLockScreenProps {
  onUnlocked: () => void;
}

export function PinLockScreen({ onUnlocked }: PinLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showNumbers, setShowNumbers] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [shake, setShake] = useState<boolean>(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus hidden input for physical keyboard entry
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle Lockout countdown
  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleDigitPress = (digit: string) => {
    if (isVerifying || isSuccess || lockoutTimer > 0) return;
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      setErrorMsg('');

      if (newPin.length === 6) {
        submitPin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    if (isVerifying || isSuccess || lockoutTimer > 0) return;
    setPin(prev => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    if (isVerifying || isSuccess) return;
    setPin('');
    setErrorMsg('');
  };

  const submitPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const result = await verifyPin(pinToVerify, rememberDevice);
      if (result.success) {
        setIsSuccess(true);
        setTimeout(() => {
          onUnlocked();
        }, 500);
      } else {
        setShake(true);
        setErrorMsg(result.message || 'PIN 6 digit tidak sesuai.');
        if (result.lockoutSeconds) {
          setLockoutTimer(result.lockoutSeconds);
        }
        setTimeout(() => {
          setShake(false);
          setPin('');
          if (inputRef.current) inputRef.current.focus();
        }, 600);
      }
    } catch {
      setErrorMsg('Gagal memverifikasi PIN. Silakan coba lagi.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (lockoutTimer > 0) return;
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleDigitPress(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
      e.preventDefault();
      handleClear();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950 p-4 select-none overflow-y-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Hidden input to capture physical keyboard naturally */}
      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        value={pin}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 6);
          setPin(val);
          if (val.length === 6) submitPin(val);
        }}
        className="opacity-0 absolute -top-9999px left-0 w-1 h-1 pointer-events-none"
        autoFocus
      />

      <div className="relative w-full max-w-[380px] sm:max-w-[420px] rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-white my-auto">
        
        {/* Top Header & Logo */}
        <div className="text-center mb-6">
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-900/40 mb-3.5 border border-white/30">
            {isSuccess ? (
              <Unlock size={30} className="text-emerald-300 animate-bounce" />
            ) : (
              <Lock size={30} className="text-amber-300 animate-pulse" />
            )}
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-blue-900 border-2 border-white flex items-center justify-center">
              <ShieldCheck size={13} className="text-blue-300" />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
            CKB LOGISTIC HUB
          </h1>
          <p className="text-xs text-blue-200/80 font-medium mt-1">
            Masukkan 6 Digit PIN Akses untuk Membuka Aplikasi
          </p>
        </div>

        {/* 6 Digit Indicators */}
        <div className={`flex justify-center items-center gap-2.5 sm:gap-3.5 mb-5 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const hasDigit = pin.length > index;
            const digitChar = pin[index];

            return (
              <div
                key={index}
                className={`w-11 h-13 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center text-lg sm:text-xl font-black transition-all duration-200 border ${
                  hasDigit
                    ? isSuccess
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/40 scale-105'
                      : 'bg-white/25 border-white/60 text-white ring-2 ring-blue-400/40 scale-105 shadow-md shadow-blue-950/50'
                    : 'bg-white/5 border-white/15 text-white/30'
                }`}
              >
                {hasDigit ? (
                  showNumbers ? (
                    digitChar
                  ) : (
                    <div className={`w-3.5 h-3.5 rounded-full ${isSuccess ? 'bg-emerald-400' : 'bg-white'}`} />
                  )
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </div>
            );
          })}
        </div>

        {/* Toggle Show/Hide Digits */}
        <div className="flex items-center justify-between text-[11px] text-blue-200/80 font-semibold mb-4 px-1">
          <button
            type="button"
            onClick={() => setShowNumbers(!showNumbers)}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          >
            {showNumbers ? <EyeOff size={13} /> : <Eye size={13} />}
            <span>{showNumbers ? 'Sembunyikan Angka' : 'Tampilkan Angka'}</span>
          </button>

          <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              className="rounded border-white/30 bg-white/10 text-blue-600 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Ingat di Perangkat Ini</span>
          </label>
        </div>

        {/* Error / Status Feedback */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 text-xs font-semibold flex items-center gap-2 mb-4 justify-center animate-fade-in">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {lockoutTimer > 0 && (
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold text-center mb-4 animate-pulse">
            Terkunci selama {lockoutTimer} detik untuk keamanan.
          </div>
        )}

        {isSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center gap-2 mb-4 justify-center animate-scale-up">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>PIN Terverifikasi! Membuka aplikasi...</span>
          </div>
        )}

        {/* Numeric Keypad for Mobile & Touch Screen */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mb-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              disabled={isVerifying || isSuccess || lockoutTimer > 0}
              onClick={() => handleDigitPress(num)}
              className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-lg sm:text-xl font-black text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            type="button"
            disabled={isVerifying || isSuccess || pin.length === 0}
            onClick={handleClear}
            className="h-12 sm:h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-xs font-extrabold text-blue-200 uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
          >
            Hapus
          </button>

          {/* Zero Button */}
          <button
            type="button"
            disabled={isVerifying || isSuccess || lockoutTimer > 0}
            onClick={() => handleDigitPress('0')}
            className="h-12 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-lg sm:text-xl font-black text-white transition-all flex items-center justify-center shadow-xs cursor-pointer"
          >
            0
          </button>

          {/* Backspace Button */}
          <button
            type="button"
            disabled={isVerifying || isSuccess || pin.length === 0}
            onClick={handleBackspace}
            className="h-12 sm:h-14 rounded-2xl bg-white/5 hover:bg-white/15 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-white transition-all flex items-center justify-center cursor-pointer"
            title="Hapus Satu Digit"
          >
            <Delete size={20} className="text-blue-200" />
          </button>
        </div>

        {/* Security Note Footer */}
        <div className="text-center pt-2 text-[10px] text-blue-200/50 font-medium">
          🔒 Verifikasi aman di sisi server (PIN tidak tersimpan di script browser).
        </div>
      </div>
    </div>
  );
}
