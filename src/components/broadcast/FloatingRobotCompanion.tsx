import { useState, useEffect, useRef, FormEvent } from 'react';
import { 
  Radio, 
  Send, 
  Volume2, 
  VolumeX, 
  X, 
  History, 
  Check, 
  Zap, 
  User, 
  Users, 
  MessageSquare,
  ChevronRight,
  Trash2,
  Heart
} from 'lucide-react';
import { BroadcastMessage, BroadcastCategory } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';
import { parseBroadcastPayload, formatBroadcastMessage } from '../../utils/broadcastFormat';

export interface FloatingRobotCompanionProps {
  onSendBroadcast: (data: {
    sender_name: string;
    message: string;
    category?: BroadcastCategory;
    device_info?: string;
  }) => Promise<any>;
  latestBroadcast?: BroadcastMessage | null;
  recentMessages?: BroadcastMessage[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  currentUser?: {
    nama_lengkap?: string;
    nama?: string;
    username?: string;
    role?: string;
  } | null;
  isAdmin?: boolean;
  onDeleteMessage?: (id: string) => Promise<void>;
  mode?: 'login' | 'dashboard' | 'profile-header' | 'profile-avatar' | 'floating-bottom' | 'inline';
  className?: string;
  isSidebarOpen?: boolean;
  onOpenProfileDetail?: () => void;
  isSpeaking?: boolean;
}

export function FloatingRobotCompanion({
  onSendBroadcast,
  latestBroadcast: _latestBroadcast,
  recentMessages = [],
  soundEnabled,
  onToggleSound,
  currentUser,
  isAdmin = false,
  onDeleteMessage,
  mode = 'dashboard',
  className = '',
  isSidebarOpen = false,
  isSpeaking = false
}: FloatingRobotCompanionProps) {
  // Modal Open State
  const [isOpen, setIsOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Compute default user sender name
  const computeDefaultSender = (): string => {
    if (currentUser?.nama_lengkap) return currentUser.nama_lengkap;
    if (currentUser?.nama) return currentUser.nama;
    if (currentUser?.username) {
      return currentUser.username.toUpperCase() === 'ADMIN' ? 'Administrator' : currentUser.username;
    }
    try {
      const saved = localStorage.getItem('broadcast_sender_name');
      if (saved) return saved;
    } catch {}
    return mode === 'login' ? 'Pos 1 (Depan)' : 'Pos Logistik';
  };

  // Form States: Pengirim, Kepada, Isi Pesan Siar
  const [senderName, setSenderName] = useState<string>(computeDefaultSender);
  const [recipient, setRecipient] = useState<string>('Semua Tim (Publik)');
  const [messageText, setMessageText] = useState('');
  const [selectedCategory] = useState<BroadcastCategory>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update sender name when user logs in or changes
  useEffect(() => {
    if (currentUser) {
      setSenderName(computeDefaultSender());
    }
  }, [currentUser]);

  // Interactive Robot Head & Eye Tracking
  const robotRef = useRef<HTMLDivElement>(null);
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [headTilt, setHeadTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [isNearCursor, setIsNearCursor] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);

  // Active User Display Name
  const activeUserDisplayName = currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username || '';

  // Blinking animation loop for robot eyes
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200);
    }, 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Window cursor tracking for robot avatar
  useEffect(() => {
    let animFrame: number;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!robotRef.current) return;
      const rect = robotRef.current.getBoundingClientRect();
      const robotCenterX = rect.left + rect.width / 2;
      const robotCenterY = rect.top + rect.height / 2;

      const deltaX = e.clientX - robotCenterX;
      const deltaY = e.clientY - robotCenterY;
      const distance = Math.hypot(deltaX, deltaY);

      setIsNearCursor(distance < 240);

      const maxOffset = 5;
      const angle = Math.atan2(deltaY, deltaX);
      const intensity = Math.min(distance / 200, 1);
      const pupilX = Math.cos(angle) * maxOffset * intensity;
      const pupilY = Math.sin(angle) * maxOffset * intensity;

      const maxTilt = 10;
      const rotY = Math.max(-maxTilt, Math.min(maxTilt, (deltaX / window.innerWidth) * 20));
      const rotX = Math.max(-maxTilt, Math.min(maxTilt, -(deltaY / window.innerHeight) * 20));

      cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        setEyeOffset({ x: pupilX, y: pupilY });
        setHeadTilt({ rotateX: rotX, rotateY: rotY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  // Handle Send Broadcast (Pengirim, Kepada, Isi Pesan)
  const handleSend = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      try {
        localStorage.setItem('broadcast_sender_name', senderName.trim());
      } catch {}

      const formattedMessage = formatBroadcastMessage(messageText, recipient);

      await onSendBroadcast({
        sender_name: senderName.trim() || 'Pos Logistik',
        message: formattedMessage,
        category: selectedCategory,
        device_info: navigator.userAgent.includes('Mobile') ? 'HP/Mobile' : 'Desktop'
      });

      if (soundEnabled) {
        playBroadcastSound(selectedCategory);
      }

      setFeedbackMessage({ type: 'success', text: 'Pesan siaran berhasil dikirim ke seluruh perangkat!' });
      setMessageText('');
      setTimeout(() => {
        setFeedbackMessage(null);
        setIsOpen(false);
      }, 1200);
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Gagal mengirim pesan siaran.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isInlineOrRelativeMode = mode === 'profile-avatar' || mode === 'inline' || mode === 'login';

  return (
    <>
      {/* 
        MURNI HANYA ROBOT MELAYANG (FLOATING HUMANOID ROBOT)
        - Jika mode='profile-avatar' / 'login' / 'inline': Disimpan tepat di posisi relative (atas profil / atas form login)
        - Jika mode='floating-bottom' / 'dashboard': Fixed di kanan bawah layar
      */}
      <div 
        id="floating-robot-companion"
        ref={robotRef}
        className={
          isInlineOrRelativeMode
            ? `relative flex items-center justify-center select-none ${className}`
            : `fixed bottom-6 ${isSidebarOpen ? 'right-[380px]' : 'right-6'} z-40 transition-all duration-300 select-none ${className}`
        }
      >
        {/* COMPACT FUTURISTIC FLOATING AI ROBOT COMPANION WITH ARMS & FLOATING PINK HEARTS */}
        <div 
          className="relative cursor-pointer group flex flex-col items-center justify-center"
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          title="Robot Komunikator Siaran (Klik untuk kirim pesan siaran)"
        >
          {/* FLOATING PINK HEARTS / LOVE MELAYANG */}
          {/* Heart 1: Top Left floating & bobbing */}
          <div className="absolute -top-3.5 -left-3 pointer-events-none z-30 animate-bounce duration-1000">
            <div className="relative flex items-center justify-center">
              <Heart 
                size={14} 
                className="text-pink-500 fill-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.8)] transform -rotate-12 transition-transform duration-300 group-hover:scale-125" 
              />
              <span className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-white rounded-full animate-ping" />
            </div>
          </div>

          {/* Heart 2: Top Right floating & gentle drift */}
          <div className="absolute -top-2 -right-3.5 pointer-events-none z-30 animate-[pulse_2s_ease-in-out_infinite]">
            <div className="relative flex items-center justify-center">
              <Heart 
                size={11} 
                className="text-rose-400 fill-pink-300 drop-shadow-[0_0_6px_rgba(251,113,133,0.8)] transform rotate-15 transition-transform duration-300 group-hover:scale-125" 
              />
            </div>
          </div>

          {/* Heart 3: Extra sweet mini heart popping on hover or gentle glow */}
          <div className={`absolute -bottom-1 -right-2 pointer-events-none z-30 transition-all duration-300 ${
            isHovered || isNearCursor ? 'opacity-100 scale-100 translate-y-0' : 'opacity-40 scale-75'
          }`}>
            <Heart 
              size={9} 
              className="text-pink-400 fill-pink-400 drop-shadow-[0_0_5px_rgba(244,114,182,0.9)] animate-pulse" 
            />
          </div>

          {/* Acoustic Wave Animation Rings when robot is speaking */}
          {isSpeaking && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="absolute w-14 h-14 rounded-full border-2 border-indigo-400/80 animate-voice-wave-1 shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
              <div className="absolute w-18 h-18 rounded-full border-2 border-cyan-400/80 animate-voice-wave-2 shadow-[0_0_20px_rgba(34,211,238,0.5)]" />
              <div className="absolute w-22 h-22 rounded-full border-2 border-pink-400/70 animate-voice-wave-3 shadow-[0_0_25px_rgba(244,114,182,0.4)]" />
              <div className="absolute w-24 h-24 rounded-full bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-pink-500/20 blur-xl animate-pulse" />
            </div>
          )}

          {/* Subtle Ambient Cyber Glow */}
          <div className={`absolute -inset-2 rounded-full bg-gradient-to-r from-pink-400/20 via-cyan-400/20 to-indigo-400/20 blur-md transition-opacity duration-300 pointer-events-none ${
            isSpeaking ? 'opacity-100 scale-125' : (isNearCursor || isHovered ? 'opacity-100 scale-110' : 'opacity-25 scale-90')
          }`} />

          {/* Floating Robot Body Container with Smooth Anti-Gravity Bobbing */}
          <div 
            className="relative flex flex-col items-center transition-all duration-200 group-hover:scale-105"
            style={{
              transform: `perspective(400px) rotateX(${headTilt.rotateX * 0.5}deg) rotateY(${headTilt.rotateY * 0.5}deg)`
            }}
          >
            {/* 1. MINI ANTENNA BEACON WITH LOVE PULSE */}
            <div className="flex flex-col items-center -mb-0.5 relative z-20">
              <div className={`w-2.5 h-2.5 rounded-full border border-white/90 flex items-center justify-center transition-colors ${
                isNearCursor || isHovered 
                  ? 'bg-pink-400 shadow-[0_0_8px_#f472b6]' 
                  : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
              }`}>
                <span className="w-1 h-1 bg-white rounded-full animate-ping" />
              </div>
              <div className="w-0.5 h-1.5 bg-indigo-300" />
            </div>

            {/* 2. ROBOT HEAD & SLEEK VISOR WITH ARMS ATTACHED */}
            <div className="relative flex items-center justify-center">
              
              {/* TANGAN KIRI (Left Robot Arm) */}
              <div className="absolute -left-3.5 top-3 flex flex-col items-center z-10 transition-transform duration-200 group-hover:-rotate-12">
                <div className="w-1.5 h-3 bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-full border border-white/60 shadow-xs transform -rotate-12" />
                {/* Tangan Bulat / Hand Paw */}
                <div className="w-2.5 h-2.5 rounded-full bg-white border border-indigo-400 shadow-xs -mt-1 flex items-center justify-center">
                  <div className="w-1 h-1 bg-pink-400 rounded-full" />
                </div>
              </div>

              {/* ROBOT HELMET & VISOR */}
              <div className="relative w-11 h-9 sm:w-12 sm:h-9.5 rounded-2xl bg-gradient-to-b from-white via-indigo-50 to-indigo-200 border border-white shadow-[0_4px_12px_rgba(30,41,59,0.25)] flex items-center justify-center p-1 z-10">
                
                {/* Ear / Audio Transceivers */}
                <div className="absolute -left-1 w-1 h-3.5 rounded-l-md bg-indigo-400 border-l border-white/60 shadow-xs" />
                <div className="absolute -right-1 w-1 h-3.5 rounded-r-md bg-indigo-400 border-r border-white/60 shadow-xs" />

                {/* Glossy OLED Face Visor */}
                <div className="w-full h-full rounded-xl bg-slate-950 border border-indigo-400/50 flex items-center justify-between px-1.5 py-0.5 shadow-inner relative overflow-hidden">
                  {/* Subtle Visor Glass Glare Reflection */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 rounded-t-xl pointer-events-none" />

                  {/* Left Eye */}
                  <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                    {isBlinking ? (
                      <div className="w-2.5 h-0.5 bg-cyan-300 rounded-full shadow-[0_0_4px_#22d3ee]" />
                    ) : isHovered ? (
                      /* Happy squinting eye ^ on hover */
                      <div className="w-2 h-1.5 border-t-2 border-l-2 border-r-2 border-cyan-300 rounded-t-full shadow-[0_0_6px_#22d3ee]" />
                    ) : (
                      /* Dynamic glowing OLED eye */
                      <div 
                        className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] flex items-center justify-center transition-transform duration-75"
                        style={{
                          transform: `translate(${eyeOffset.x * 0.4}px, ${eyeOffset.y * 0.4}px)`
                        }}
                      >
                        <div className="w-0.5 h-0.5 bg-white rounded-full -mt-0.5 -ml-0.5" />
                      </div>
                    )}
                  </div>

                  {/* Center Cute Pink Heart / Mouth */}
                  <div className="flex items-center justify-center">
                    <Heart size={5} className="text-pink-400 fill-pink-400 animate-pulse" />
                  </div>

                  {/* Right Eye */}
                  <div className="relative w-2.5 h-2.5 flex items-center justify-center">
                    {isBlinking ? (
                      <div className="w-2.5 h-0.5 bg-cyan-300 rounded-full shadow-[0_0_4px_#22d3ee]" />
                    ) : isHovered ? (
                      /* Happy squinting eye ^ on hover */
                      <div className="w-2 h-1.5 border-t-2 border-l-2 border-r-2 border-cyan-300 rounded-t-full shadow-[0_0_6px_#22d3ee]" />
                    ) : (
                      /* Dynamic glowing OLED eye */
                      <div 
                        className="w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] flex items-center justify-center transition-transform duration-75"
                        style={{
                          transform: `translate(${eyeOffset.x * 0.4}px, ${eyeOffset.y * 0.4}px)`
                        }}
                      >
                        <div className="w-0.5 h-0.5 bg-white rounded-full -mt-0.5 -ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* TANGAN KANAN (Right Robot Arm - Waving Greeting Gesture) */}
              <div className="absolute -right-3.5 top-2.5 flex flex-col items-center z-10 origin-bottom transition-transform duration-300 group-hover:rotate-12 animate-[bounce_2s_ease-in-out_infinite]">
                {/* Waving Hand / Claw */}
                <div className="w-3 h-3 rounded-full bg-pink-100 border border-pink-400 shadow-xs flex items-center justify-center -mb-0.5">
                  <span className="text-[8px] leading-none">👋</span>
                </div>
                <div className="w-1.5 h-3 bg-gradient-to-t from-indigo-400 to-indigo-600 rounded-full border border-white/60 shadow-xs transform rotate-12" />
              </div>
            </div>

            {/* 3. MINI FLOATING TORSO WITH HEART REACTOR */}
            <div className="relative flex items-center justify-center -mt-1 z-0">
              <div className="w-7 h-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-600 border border-white/80 shadow-xs flex items-center justify-center gap-1 px-1">
                {/* Glowing Pink Arc Core */}
                <Heart size={6} className="text-pink-300 fill-pink-300 animate-pulse drop-shadow-[0_0_4px_#f472b6]" />
                <div className="w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_4px_#22d3ee]" />
              </div>
            </div>

            {/* 4. ANTI-GRAVITY MICRO PLASMA THRUSTER */}
            <div className="w-3.5 h-1 bg-gradient-to-r from-cyan-400 via-pink-400 to-cyan-400 rounded-full blur-[1px] animate-pulse -mt-0.5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ROBOT KOMUNIKATOR SIARAN - FORM SIMPLE (PENGIRIM, KEPADA, ISI, RIWAYAT) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4 sm:p-5 relative overflow-hidden flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                  <Radio size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-200">
                      Robot Komunikator Siaran
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight m-0">
                    Kirim Pesan Siaran
                  </h3>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 relative z-10">
                <button
                  type="button"
                  onClick={onToggleSound}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    soundEnabled 
                      ? 'bg-emerald-500 text-white border-emerald-400' 
                      : 'bg-white/10 text-white/70 border-white/20'
                  }`}
                  title={soundEnabled ? 'Suara Robot Aktif' : 'Suara Dimatikan'}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                  title="Tutup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body: Simple Form Fields */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white space-y-4">
              
              {/* Feedback Alert if sent */}
              {feedbackMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150 ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  <Check size={16} className={feedbackMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'} />
                  <span>{feedbackMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-4">
                
                {/* 1. FIELD: PENGIRIM */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} className="text-indigo-600" />
                      <span>1. Pengirim</span>
                    </label>
                    {activeUserDisplayName && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                        User: {activeUserDisplayName}
                      </span>
                    )}
                  </div>
                  <input 
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Nama Anda / Pengirim (contoh: Dede, Pos 1, Admin Gudang...)"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* 2. FIELD: KEPADA */}
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Users size={13} className="text-indigo-600" />
                    <span>2. Kepada</span>
                  </label>
                  <input 
                    type="text"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    placeholder="Tujuan / Penerima (contoh: Semua Tim (Publik), Pos 1, Gudang...)"
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                  />
                </div>

                {/* 3. FIELD: ISI PESAN SIARAN */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare size={13} className="text-indigo-600" />
                      <span>3. Isi Pesan Siar</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Pesan akan dimunculkan Robot di layar
                    </span>
                  </div>
                  
                  <textarea
                    rows={4}
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Ketik isi pesan siaran yang ingin disiarkan ke semua layar..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                  />
                </div>

                {/* 4. FIELD: RIWAYAT SECTION (COMPACT PREVIEW) */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <History size={13} className="text-indigo-600" />
                      <span>4. Riwayat Siaran ({recentMessages.length})</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Selengkapnya</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>

                  {recentMessages.length === 0 ? (
                    <div className="text-center py-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs">
                      Belum ada riwayat siaran.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {recentMessages.slice(0, 3).map(msg => {
                        const parsed = parseBroadcastPayload(msg.message, msg.sender_name);
                        const timeStr = new Date(msg.created_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div 
                            key={msg.id}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                                <span className="font-extrabold text-indigo-700 uppercase">
                                  {msg.sender_name}
                                </span>
                                {parsed.recipient !== 'Semua Tim (Publik)' && (
                                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                                    @{parsed.recipient}
                                  </span>
                                )}
                                <span className="text-slate-400 ml-auto">{timeStr}</span>
                              </div>
                              <p className="text-slate-700 font-medium text-[11px] truncate m-0">
                                {parsed.cleanMessage || msg.message}
                              </p>
                            </div>

                            {soundEnabled && (
                              <button
                                type="button"
                                onClick={() => playBroadcastSound(msg.category || 'info')}
                                className="p-1 rounded-lg bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 cursor-pointer"
                                title="Bunyikan Ulang Nada"
                              >
                                <Volume2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    Tutup
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !messageText.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyiarkan...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Siarkan Pesan Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KHUSUS RIWAYAT SIARAN LENGKAP */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div 
          className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setShowHistoryModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-cyan-300">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white m-0">
                    Riwayat Pesan Siaran
                  </h3>
                  <p className="text-[10px] text-indigo-200 m-0">
                    Total {recentMessages.length} pesan tersimpan di database
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-white space-y-2">
              {recentMessages.length === 0 ? (
                <div className="text-center py-12 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                  Belum ada pesan siaran di database.
                </div>
              ) : (
                recentMessages.map(item => {
                  const parsed = parseBroadcastPayload(item.message, item.sender_name);
                  const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={item.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="font-extrabold text-indigo-900 uppercase">
                            {item.sender_name}
                          </span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Kepada: {parsed.recipient}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[10px]">
                          <span>{timeStr}</span>
                          {soundEnabled && (
                            <button
                              type="button"
                              onClick={() => playBroadcastSound(item.category || 'info')}
                              className="p-1 rounded-md bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Bunyikan Nada"
                            >
                              <Volume2 size={12} />
                            </button>
                          )}
                          {isAdmin && onDeleteMessage && (
                            <button
                              type="button"
                              onClick={() => onDeleteMessage(item.id)}
                              className="p-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Hapus Pesan"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 font-medium bg-white p-2 rounded-xl border border-slate-100 m-0">
                        {parsed.cleanMessage || item.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
