import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Calendar,
  RotateCcw,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../hooks/useSupabase';
import { usePwa } from '../../context/PwaContext';
import { LoginFloatingRobot } from '../broadcast/LoginFloatingRobot';
import { FloatingRobotBroadcast } from '../broadcast/FloatingRobotBroadcast';
import { KinoEmblemSvg } from '../broadcast/KinoRobotAvatar';
import { unlockAudioAndSpeech } from '../../utils/welcomeVoice';
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

  // Dynamic session token to prevent browsers from autofilling previously saved credentials
  const [formFieldKey, setFormFieldKey] = useState(() => Math.random().toString(36).substring(2, 8));
  // Autofill blocking gate: fields are readOnly for initial 120ms so browser auto-complete skips them on load
  const [isEditable, setIsEditable] = useState(false);

  const usernameRef = useRef<HTMLInputElement | null>(null);
  const pinRef = useRef<HTMLInputElement | null>(null);

  // Live real-time clock and date widget
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  // Complete cleanup function that resets state, DOM values, and field keys
  const clearForm = useCallback(() => {
    setUsername('');
    setPin('');
    setErrorMessage(null);
    setSuccessMessage(null);
    if (usernameRef.current) usernameRef.current.value = '';
    if (pinRef.current) pinRef.current.value = '';
    setFormFieldKey(Math.random().toString(36).substring(2, 8));
    setIsEditable(false);
    setTimeout(() => setIsEditable(true), 120);
  }, []);

  // Guarantee clean fields on mount and listen to logout events
  useEffect(() => {
    clearForm();

    const checkAutofillTimer = setTimeout(() => {
      // If browser autofill aggressively injected anything before interaction, wipe it clean
      if (usernameRef.current && usernameRef.current.value && !username) {
        usernameRef.current.value = '';
      }
      if (pinRef.current && pinRef.current.value && !pin) {
        pinRef.current.value = '';
      }
      setIsEditable(true);
    }, 120);

    const handleLogoutEvent = () => {
      clearForm();
    };

    window.addEventListener('ckb-auth-logout', handleLogoutEvent);
    window.addEventListener('ckb-auth-inactivity-logout', handleLogoutEvent);

    return () => {
      clearTimeout(checkAutofillTimer);
      window.removeEventListener('ckb-auth-logout', handleLogoutEvent);
      window.removeEventListener('ckb-auth-inactivity-logout', handleLogoutEvent);
    };
  }, [clearForm]);

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

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Buka kunci AudioContext & SpeechSynthesis browser langsung dari interaksi klik/submit user
    unlockAudioAndSpeech();

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
        // Tandai agar sambutan suara menyapa pengguna begitu masuk ke halaman utama
        try {
          sessionStorage.setItem('should_play_welcome_greeting', 'true');
          sessionStorage.removeItem('last_greeted_user_session');
          if (result.user?.nama || result.user?.username) {
            sessionStorage.setItem('pending_welcome_user', result.user.nama || result.user.username);
          }
        } catch {}
        setSuccessMessage(result.message || 'Login berhasil! Membuka halaman utama...');
        
        // Bersihkan state dan DOM input segera agar tidak tersisa di memori
        setUsername('');
        setPin('');
        if (usernameRef.current) usernameRef.current.value = '';
        if (pinRef.current) pinRef.current.value = '';
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
          <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-3">
            
            {/* Robot Companion tepat di atas form login */}
            <div className="relative flex flex-col items-center z-20">
              <div className="flex flex-col items-center">
                {/* Speech Bubble / Badge Sambutan Robot di atas form */}
                <div className="mb-2 px-3.5 py-1.5 backdrop-blur-xs rounded-full shadow-2xs flex items-center gap-2 text-xs font-medium transition-all duration-300 bg-white/95 border border-blue-200 text-slate-700 hover:border-blue-400">
                  <KinoEmblemSvg className="w-4 h-4" />
                  <span className="font-black bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
                    KinoBot • PT Kino Indonesia
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
              {/* Card Form Body (Div container to prevent Chrome form submission password leak checks) */}
              <div 
                className="p-6 sm:p-7 space-y-4"
                role="region"
                aria-label="Portal Login"
              >
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Username Akun
                    </label>
                    {username.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setUsername('');
                          if (usernameRef.current) usernameRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Bersihkan username"
                      >
                        <XCircle size={12} />
                        <span>Bersihkan</span>
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User size={16} />
                    </div>
                    <input 
                      ref={usernameRef}
                      key={`usr_${formFieldKey}`}
                      type="text"
                      name={`user_id_${formFieldKey}`}
                      value={username}
                      onChange={e => {
                        setUsername(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          pinRef.current?.focus();
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!pin) {
                            pinRef.current?.focus();
                          } else {
                            handleSubmit();
                          }
                        }
                      }}
                      onFocus={() => setIsEditable(true)}
                      readOnly={!isEditable}
                      placeholder="misal: admin, dede, pelaksana"
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-bwignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      disabled={loading}
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                    />
                    {username.length > 0 && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          setUsername('');
                          if (usernameRef.current) usernameRef.current.value = '';
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus teks username"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* PIN Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      PIN Keamanan (4-6 Digit)
                    </label>
                    <div className="flex items-center gap-3">
                      {pin.length > 0 && (
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => {
                            setPin('');
                            if (pinRef.current) pinRef.current.value = '';
                          }}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Bersihkan PIN"
                        >
                          <XCircle size={12} />
                          <span>Bersihkan</span>
                        </button>
                      )}
                      <button 
                        type="button" 
                        tabIndex={-1}
                        onClick={() => setShowPin(!showPin)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound size={16} />
                    </div>
                    <input 
                      ref={pinRef}
                      key={`pin_${formFieldKey}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      name={`access_code_${formFieldKey}`}
                      value={pin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setPin(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmit();
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          usernameRef.current?.focus();
                        }
                      }}
                      onFocus={() => setIsEditable(true)}
                      readOnly={!isEditable}
                      placeholder="Masukkan PIN 4-6 digit"
                      autoComplete="off"
                      data-lpignore="true"
                      data-bwignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      disabled={loading}
                      required
                      className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-semibold tracking-wider placeholder:tracking-normal placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none ${
                        !showPin ? 'pin-mask-disc' : ''
                      }`}
                    />
                    {pin.length > 0 && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          setPin('');
                          if (pinRef.current) pinRef.current.value = '';
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus input PIN"
                      >
                        <XCircle size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Reset All Fields Action if Any Input is Entered */}
                {(username.length > 0 || pin.length > 0) && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={clearForm}
                      className="text-xs text-slate-500 hover:text-rose-600 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Kosongkan seluruh kolom input"
                    >
                      <RotateCcw size={12} />
                      <span>Reset / Kosongkan Formulir</span>
                    </button>
                  </div>
                )}

                {/* Submit Action Button */}
                <button 
                  type="button"
                  onClick={() => handleSubmit()}
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

                {/* Privacy and Security Indicator */}
                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center font-medium">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                  <span>Kerahasiaan Aman: Kredensial & PIN otomatis dihapus saat logout</span>
                </div>
              </div>
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
