import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Wifi, WifiOff, Sparkles, Share2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaInstallPrompt() {
  const { showToast } = useNotification();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed as PWA)
    const checkStandalone = () => {
      const isPwa =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isPwa);
    };
    checkStandalone();

    // Check iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Online / Offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi Pulih', 'Aplikasi kembali online & tersinkronisasi.', 'success');
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Mode Offline', 'Aplikasi berjalan dalam mode offline lokal.', 'info');
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // App installed listener
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      showToast('Aplikasi Terpasang', 'CKBLogistic Hub berhasil dipasang ke perangkat Anda!', 'success');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        showToast('Memasang...', 'Sedang menambahkan CKBLogistic ke layar utama', 'success');
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  // If already running standalone or dismissed, don't show install banner
  if (isStandalone || dismissed) {
    // Show only small offline badge if disconnected
    if (!isOnline) {
      return (
        <div className="fixed bottom-4 left-4 z-50 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 shadow-lg animate-pulse">
          <WifiOff size={14} />
          <span>Mode Offline (PWA Cache)</span>
        </div>
      );
    }
    return null;
  }

  // Show banner if install prompt available or if user is on iOS and not standalone
  const canInstall = !!deferredPrompt || (isIos && !isStandalone);

  if (!canInstall) return null;

  return (
    <>
      {/* Floating PWA Install Bar */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[150] animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-3.5 rounded-2xl border border-blue-500/40 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white shrink-0 shadow-inner border border-white/20">
              <Smartphone size={20} className="animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-white truncate m-0 leading-tight">
                  Pasang CKBLogistic App
                </h4>
                <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[9px] font-black rounded-md border border-cyan-400/30">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 m-0 truncate mt-0.5">
                Akses cepat, layar penuh & offline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1 transition-all active:scale-95"
            >
              <Download size={13} />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-blue-200 space-y-4 text-slate-800 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center font-bold">
                  <Smartphone size={18} />
                </div>
                <h3 className="text-sm font-bold text-slate-900 m-0">Pasang di iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <p className="m-0 font-medium">Ikuti langkah mudah berikut di peramban Safari:</p>
              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                <span>Ketuk tombol <strong>Bagikan / Share</strong> (<Share2 size={12} className="inline mx-0.5" />) di bilah navigasi Safari bawah.</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                <span>Gulir ke bawah lalu pilih opsi <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</span>
              </div>
              <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                <span>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Oke, Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
