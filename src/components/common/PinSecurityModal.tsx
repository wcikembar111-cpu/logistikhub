import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  X, 
  Check, 
  Delete as BackspaceIcon, 
  Eye, 
  EyeOff,
  AlertCircle,
  PlusCircle,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const MASTER_SECURITY_PIN = '399339';

interface PinSecurityModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  description?: string;
  actionType?: 'add' | 'edit' | 'delete' | 'manage_users' | 'default';
  targetName?: string;
  onSuccess: () => void;
  onClose: () => void;
  expectedPin?: string;
}

export function PinSecurityModal({
  isOpen,
  title,
  subtitle,
  description,
  actionType = 'default',
  targetName,
  onSuccess,
  onClose,
  expectedPin = MASTER_SECURITY_PIN
}: PinSecurityModalProps) {
  const { showToast } = useNotification();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setErrorMessage('');
      setIsShaking(false);
      setShowPin(false);
      // Auto focus on input after opening
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = (pinToTest?: string) => {
    const currentPin = (pinToTest !== undefined ? pinToTest : pin).trim();
    if (!currentPin) {
      setErrorMessage('Silakan masukkan PIN Keamanan');
      return;
    }

    if (currentPin === expectedPin) {
      setErrorMessage('');
      setPin('');
      onSuccess();
    } else {
      setErrorMessage('PIN Keamanan Salah! Akses Ditolak.');
      setIsShaking(true);
      showToast('Akses Ditolak', 'PIN Keamanan salah. Silakan coba lagi.', 'error');
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMessage('');
      if (nextPin.length === 6) {
        handleVerify(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleVerify();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Color themes and icons based on action type
  const getActionTheme = () => {
    switch (actionType) {
      case 'add':
        return {
          icon: <PlusCircle size={22} className="text-blue-600" />,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          btnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          accentColor: 'text-blue-600',
          headerBg: 'bg-gradient-to-r from-blue-700 to-indigo-800',
          defaultTitle: 'Otorisasi Tambah Menu Aplikasi',
          defaultSubtitle: 'Konfirmasi PIN untuk menambahkan sistem baru'
        };
      case 'edit':
        return {
          icon: <Edit size={22} className="text-amber-600" />,
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          btnClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
          accentColor: 'text-amber-600',
          headerBg: 'bg-gradient-to-r from-amber-600 to-orange-700',
          defaultTitle: 'Otorisasi Edit Menu Aplikasi',
          defaultSubtitle: 'Konfirmasi PIN untuk mengubah data aplikasi'
        };
      case 'delete':
        return {
          icon: <Trash2 size={22} className="text-rose-600" />,
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          btnClass: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500',
          accentColor: 'text-rose-600',
          headerBg: 'bg-gradient-to-r from-rose-600 to-red-700',
          defaultTitle: 'Otorisasi Hapus Menu Aplikasi',
          defaultSubtitle: 'Konfirmasi PIN untuk menghapus aplikasi'
        };
      case 'manage_users':
        return {
          icon: <Users size={22} className="text-purple-600" />,
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          btnClass: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500',
          accentColor: 'text-purple-600',
          headerBg: 'bg-gradient-to-r from-purple-700 to-indigo-800',
          defaultTitle: 'Otorisasi Kelola Pengguna (RBAC)',
          defaultSubtitle: 'Konfirmasi PIN untuk membuka hak akses pengguna'
        };
      default:
        return {
          icon: <KeyRound size={22} className="text-blue-600" />,
          badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
          btnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
          accentColor: 'text-blue-600',
          headerBg: 'bg-gradient-to-r from-slate-800 to-slate-900',
          defaultTitle: 'Verifikasi PIN Keamanan',
          defaultSubtitle: 'Otorisasi tindakan administratif'
        };
    }
  };

  const theme = getActionTheme();
  const displayTitle = title || theme.defaultTitle;
  const displaySubtitle = subtitle || theme.defaultSubtitle;

  return (
    <div 
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 ${
          isShaking ? 'animate-bounce' : ''
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className={`${theme.headerBg} text-white p-5 flex items-center justify-between border-b border-white/10 shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-white/80">
                <ShieldCheck size={12} className="text-amber-300" />
                <span>Security Check</span>
              </div>
              <h3 className="text-base font-bold text-white m-0 tracking-tight">
                {displayTitle}
              </h3>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
            title="Batal / Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Action context details */}
          <div className="text-center space-y-1">
            <p className="text-xs font-semibold text-slate-600 m-0">
              {displaySubtitle}
            </p>
            {targetName && (
              <div className="inline-block bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-xs font-black text-slate-800 mt-1 max-w-full truncate">
                "{targetName}"
              </div>
            )}
            {description && (
              <p className="text-[11px] text-slate-500 m-0 mt-1">
                {description}
              </p>
            )}
          </div>

          {/* PIN Input field */}
          <div className="space-y-2">
            <div className="relative flex items-center">
              <input 
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                name="pin_security_code"
                autoComplete="one-time-code"
                data-lpignore="true"
                value={pin}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setPin(val);
                  setErrorMessage('');
                  if (val.length === 6) {
                    handleVerify(val);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan 6 digit PIN"
                className={`w-full text-center text-xl sm:text-2xl font-mono tracking-widest px-4 py-3 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/10 outline-none transition-all placeholder:text-slate-400 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal font-bold ${
                  !showPin ? 'pin-mask-disc' : ''
                }`}
              />
              <button 
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                title={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Visual PIN Dots Indicator */}
            <div className="flex justify-center items-center gap-2 pt-1">
              {[0, 1, 2, 3, 4, 5].map(idx => (
                <div 
                  key={idx}
                  className={`w-3 h-3 rounded-full transition-all duration-150 ${
                    idx < pin.length 
                      ? 'bg-blue-600 scale-110 shadow-xs' 
                      : 'bg-slate-200 border border-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Error Message display */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 justify-center animate-in fade-in">
                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* Numeric Keypad for fast touch & mouse access */}
          <div className="grid grid-cols-3 gap-2 pt-1 select-none">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyPress(num)}
                className="py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-lg sm:text-xl rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer flex items-center justify-center active:scale-95"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95 uppercase tracking-wider"
              title="Hapus Semua"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="py-2.5 sm:py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-bold text-lg sm:text-xl rounded-xl border border-slate-200 transition-all shadow-2xs cursor-pointer flex items-center justify-center active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600 font-bold text-sm rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95"
              title="Hapus Digit Terakhir"
            >
              <BackspaceIcon size={18} />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => handleVerify()}
              className={`flex-1 py-2.5 px-4 rounded-xl ${theme.btnClass} text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5`}
            >
              <Check size={14} />
              <span>Verifikasi PIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
