import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  Boxes, 
  Warehouse, 
  Shield, 
  Smartphone, 
  Building2, 
  Calendar 
} from 'lucide-react';
import { useAuth } from '../../hooks/useSupabase';
import { usePwa } from '../../context/PwaContext';
import { LoginFloatingRobot } from '../broadcast/LoginFloatingRobot';
import { FloatingRobotBroadcast } from '../broadcast/FloatingRobotBroadcast';
import { PopyMaternityCountdown } from '../countdown/PopyMaternityCountdown';
import { BroadcastMessage, BroadcastCategory } from '../../types';

interface LoginPageProps {
  onOpenSqlScript?: () => void;
  broadcastMessages?: BroadcastMessage[];
  incomingBroadcast?: BroadcastMessage | null;
  broadcastSoundEnabled?: boolean;
  onToggleBroadcastSound?: () => void;
  onSendBroadcast?: (data: {
    sender_name: string;
    message: string;
    category?: BroadcastCategory;
    device_info?: string;
  }) => Promise<any>;
  onDismissIncomingBroadcast?: () => void;
}

export function LoginPage({ 
  onOpenSqlScript: _onOpenSqlScript,
  broadcastMessages = [],
  incomingBroadcast = null,
  broadcastSoundEnabled = true,
  onToggleBroadcastSound = () => {},
  onSendBroadcast = async () => {},
  onDismissIncomingBroadcast = () => {}
}: LoginPageProps) {
  const { login } = useAuth();
  const { canInstall, promptInstall } = usePwa();

  const messages = broadcastMessages;
  const incoming = incomingBroadcast;
  const soundEnabled = broadcastSoundEnabled;
  const toggleSound = onToggleBroadcastSound;
  const sendBroadcast = onSendBroadcast;
  const dismissIncoming = onDismissIncomingBroadcast;

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live real-time clock and date widget
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit',
          hour12: false 
        }) + ' WIB'
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', { 
          weekday: 'long', 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanUsername || !cleanPin) {
      setErrorMessage('Username dan PIN wajib diisi untuk melanjutkan.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanUsername, cleanPin);
      if (result.success) {
        setSuccessMessage(result.message || 'Login berhasil! Membuka halaman utama...');
      } else {
        setErrorMessage(result.message || 'Username atau PIN tidak sesuai.');
      }
    } catch (err: any) {
      setErrorMessage('Terjadi kendala saat proses autentikasi: ' + (err?.message || 'Gagal login'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Background Decorative Ambient Lighting (Light Theme) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] bg-indigo-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-[32rem] h-[32rem] bg-amber-400/10 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.02]" 
          style={{
            backgroundImage: `radial-gradient(#0f172a 1px, transparent 1px)`,
            backgroundSize: '28px 28px'
          }} 
        />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-blue-400/40 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
            <Warehouse size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-widest text-blue-600 uppercase">PT Kino Indonesia Tbk</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Warehouse Logistics Studio <span className="text-slate-500 font-normal text-xs">(WH-CKB)</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Popy Maternity Countdown (Muncul untuk semua perangkat & user di form login) */}
          <PopyMaternityCountdown isAdmin={false} />

          {/* Live Date & Time Indicator on Desktop */}
          <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-700 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Calendar size={14} className="text-blue-600" />
              <span>{currentDate}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-amber-600 font-mono font-bold">
              <Clock size={14} className="text-amber-500" />
              <span>{currentTime}</span>
            </div>
          </div>

          {/* Action button if PWA installable */}
          {canInstall && (
            <button
              onClick={promptInstall}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Smartphone size={14} />
              <span className="hidden sm:inline">Install Aplikasi PWA</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column: Brand & Security Information */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold shadow-2xs">
              <Shield size={14} className="text-blue-600" />
              <span>Portal Akses Terautentikasi & Terenkripsi</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Sistem Operasional <br />
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-600 bg-clip-text text-transparent">
                  Logistik Terpadu
                </span>
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-lg">
                Silakan masuk dengan akun resmi logistik Anda untuk mengelola Data Pemusnahan, Monitoring WH-CKB, Retur Inventory, Surat Jalan, QR Generator, dan Todo Tim.
              </p>
            </div>

            {/* Feature Highlights Bento List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                  <Boxes size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Manajemen Pemusnahan</h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Standardisasi 26 Kolom Spreadsheet & Real-time Sync</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Keamanan Sesi Ketat</h4>
                  <p className="text-[11px] text-slate-500 leading-tight mt-0.5">Auto-logout 30 menit & Hak Akses Berbasis Role (RBAC)</p>
                </div>
              </div>
            </div>

            {/* Notice Footer Note */}
            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <Building2 size={14} className="text-slate-400" />
              <span>Gudang WH-CKB &bull; PT Kino Indonesia Tbk &bull; Sistem Terlindungi</span>
            </div>
          </div>

          {/* Right Column: Professional Login Form Card with Robot Companion on Top */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center">
            
            {/* Robot Companion tepat di atas form login */}
            <div className="flex flex-col items-center mb-3.5 z-20">
              <div className="flex flex-col items-center">
                {/* Speech Bubble / Badge Sambutan Robot di atas form */}
                <div className="mb-2 px-3 py-1 bg-white/90 backdrop-blur-xs border border-indigo-200/80 rounded-full shadow-2xs flex items-center gap-2 text-xs text-slate-700 font-medium hover:border-indigo-400 transition-colors">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Robot Komunikator CKB
                  </span>
                  <span className="text-slate-400 text-[11px]">&bull; Siaran Cepat</span>
                </div>

                {/* Robot Avatar Component */}
                <LoginFloatingRobot 
                  onSendBroadcast={sendBroadcast}
                  latestBroadcast={messages[0] || null}
                  recentMessages={messages}
                  soundEnabled={soundEnabled}
                  onToggleSound={toggleSound}
                />
              </div>
            </div>

            <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden relative transition-all">
              
              {/* Card Header */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-6 sm:p-7 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                      <Lock size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-blue-100">
                        <ShieldCheck size={12} />
                        <span>Autentikasi Pengguna</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight m-0">
                        Masuk Akun
                      </h3>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-blue-100 mt-2.5 font-medium relative z-10">
                  Masukkan identitas kredensial Anda untuk mengakses modul logistik.
                </p>
              </div>

              {/* Card Form Body */}
              <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
                
                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 leading-relaxed">{errorMessage}</div>
                  </div>
                )}

                {/* Success Banner */}
                {successMessage && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Username Akun
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={16} />
                    </div>
                    <input 
                      type="text"
                      value={username}
                      onChange={e => {
                        setUsername(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="misal: admin, dede, pelaksana"
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="username"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* PIN Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      PIN Keamanan (4-6 Digit)
                    </label>
                    <button 
                      type="button" 
                      onClick={() => setShowPin(!showPin)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={16} />
                    </div>
                    <input 
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => {
                        setPin(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Masukkan PIN 4-6 digit"
                      autoComplete="current-password"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold tracking-wider placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Submit Action Button */}
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Akun...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Halaman Utama</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Incoming broadcast notification dialog on Login Page if someone sends a message */}
      <FloatingRobotBroadcast
        broadcast={incoming}
        onClose={dismissIncoming}
        soundEnabled={soundEnabled}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-500 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          &copy; {new Date().getFullYear()} PT Kino Indonesia Tbk &bull; Warehouse Cikembar Logistics Studio
        </div>
        <div className="flex items-center gap-4 text-slate-500 text-[11px]">
          <span>Enkripsi Sesi Aktif</span>
          <span>&bull;</span>
          <span>Inactivity Auto-Logout: 30 Menit</span>
        </div>
      </footer>
    </div>
  );
}
