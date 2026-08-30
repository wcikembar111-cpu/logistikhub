import { useState, useEffect, FormEvent } from 'react';
import { 
  Send, 
  X, 
  History, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Radio, 
  User, 
  Users, 
  MessageSquare, 
  Zap, 
  Bell, 
  Flame, 
  AlertTriangle, 
  Sparkles,
  Globe,
  Layers,
  Database,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { BroadcastMessage, ExternalSupabaseConfig, DatabaseSyncStatus, BroadcastCategory } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';
import { parseBroadcastPayload, formatBroadcastMessage } from '../../utils/broadcastFormat';
import { useNotification } from '../../context/NotificationContext';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: BroadcastMessage[];
  loading: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSend: (data: {
    sender_name: string;
    message: string;
    category?: BroadcastCategory;
    device_info?: string;
  }) => Promise<any>;
  onDeleteMessage?: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
  initialSenderName?: string;
  isAdmin?: boolean;
  currentUser?: { email?: string; username?: string; nama?: string; nama_lengkap?: string; role?: string } | null;
  externalConfig?: ExternalSupabaseConfig;
  onUpdateExternalConfig?: (config: ExternalSupabaseConfig) => void;
  onTestExternalConnection?: (url: string, anonKey: string) => Promise<{ success: boolean; message: string; tableReady?: boolean }>;
  syncStatus?: DatabaseSyncStatus;
  isExternalConfigured?: boolean;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => Promise<any>;
  isNotificationSupported?: boolean;
}

export function BroadcastModal({
  isOpen,
  onClose,
  messages,
  loading,
  soundEnabled,
  onToggleSound,
  onSend,
  onDeleteMessage,
  onClearAll,
  initialSenderName,
  isAdmin,
  currentUser,
  externalConfig,
  onUpdateExternalConfig,
  onTestExternalConnection,
  syncStatus,
  isExternalConfigured,
  notificationPermission,
  onRequestNotificationPermission,
  isNotificationSupported
}: BroadcastModalProps) {
  const { showToast, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'simple_form' | 'history' | 'database_sync'>('simple_form');

  // Dynamic user profile resolution for active logged-in user
  const currentUsername = (currentUser?.username || '').toLowerCase();
  const isSuperAdminUser = (currentUser?.role || '').toLowerCase() === 'superadmin' || currentUsername === 'superadmin';
  const isDedeUser = currentUsername === 'dede' || currentUser?.nama?.toLowerCase().includes('dede') || currentUser?.nama_lengkap?.toLowerCase().includes('dede');
  const isAdminUser = !isSuperAdminUser && ((currentUser?.role || '').toLowerCase() === 'admin' || currentUsername === 'admin');
  const isOperatorUser = (currentUser?.role || '').toLowerCase() === 'operator';

  const activeUserDisplayName = currentUser?.nama_lengkap || currentUser?.nama || (
    isSuperAdminUser ? 'Super Administrator' :
    isDedeUser ? 'Dede Suparman' :
    isAdminUser ? 'Administrator Logistics' :
    isOperatorUser ? 'Operator Logistik' :
    currentUser?.username ? (currentUser.username.toUpperCase() === 'ADMIN' ? 'Administrator' : currentUser.username) : ''
  );

  // Form Fields: 1. Pengirim, 2. Kepada, 3. Isi Pesan Siar
  const [senderName, setSenderName] = useState<string>(() => {
    if (activeUserDisplayName) return activeUserDisplayName;
    return localStorage.getItem('broadcast_sender_name') || 'Pos Logistik';
  });

  const [recipient, setRecipient] = useState<string>('Semua Tim (Publik)');
  const [messageText, setMessageText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<BroadcastCategory>('info');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // External Supabase Form State
  const [extUrl, setExtUrl] = useState<string>(externalConfig?.url || '');
  const [extKey, setExtKey] = useState<string>(externalConfig?.anonKey || '');
  const [syncTarget, setSyncTarget] = useState<ExternalSupabaseConfig['syncTarget']>(externalConfig?.syncTarget || 'both');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);

  useEffect(() => {
    if (activeUserDisplayName) {
      setSenderName(activeUserDisplayName);
    }
  }, [activeUserDisplayName, isOpen]);

  useEffect(() => {
    if (initialSenderName) {
      setRecipient(initialSenderName);
    }
  }, [initialSenderName]);

  useEffect(() => {
    if (externalConfig) {
      setExtUrl(externalConfig.url || '');
      setExtKey(externalConfig.anonKey || '');
      setSyncTarget(externalConfig.syncTarget || 'both');
    }
  }, [externalConfig]);

  if (!isOpen) return null;

  const quickSenders = [
    activeUserDisplayName || 'Saya',
    'Pos 1 (Depan)',
    'Security WH',
    'Admin Gudang',
    'Operator CKB'
  ];

  const quickRecipients = [
    'Semua Tim (Publik)',
    'Gudang / WH',
    'Pos 1 / Security',
    'Operator CKB',
    'Admin Logistik'
  ];

  const bellPresets: { category: BroadcastCategory; title: string; label: string; icon: any; desc: string }[] = [
    { category: 'info', title: 'Bel Ding-Dong', label: 'Ding-Dong', icon: Bell, desc: 'Panggilan Standar' },
    { category: 'urgent', title: 'Sirine Darurat', label: 'Sirine Urgent', icon: Flame, desc: 'Panggilan Urgent' },
    { category: 'warning', title: 'Chime Amber', label: 'Peringatan', icon: AlertTriangle, desc: 'Peringatan Tim' },
    { category: 'announcement', title: 'Fanfare Megah', label: 'Pengumuman', icon: Sparkles, desc: 'Briefing / Info' }
  ];

  const presetTemplates = [
    { label: '🚚 Truk Bongkar', text: 'Truk pengiriman logistik sudah tiba di docking WH-CKB, mohon tim bersiap.' },
    { label: '📦 Retur Inventory', text: 'Terdapat paket retur baru yang perlu diverifikasi di area gudang.' },
    { label: '⚠️ Urgent Panggilan', text: 'Panggilan penting: Mohon perwakilan tim operasional segera merapat.' },
    { label: '🔔 Pengumuman', text: 'Briefing dan koordinasi logistik harian akan segera dimulai.' },
    { label: '✅ Stock Selesai', text: 'Pengecekan fisik dan Stock Opname lokasi rak telah selesai diverifikasi.' }
  ];

  const handleSendBroadcast = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      showToast('Peringatan', 'Silakan ketik pesan terlebih dahulu.', 'warning');
      return;
    }

    if (!senderName.trim()) {
      showToast('Peringatan', 'Silakan masukkan nama pengirim.', 'warning');
      return;
    }

    setIsSending(true);
    try {
      localStorage.setItem('broadcast_sender_name', senderName.trim());

      const formattedMessage = formatBroadcastMessage(messageText, recipient);

      const res = await onSend({
        sender_name: senderName.trim(),
        message: formattedMessage,
        category: selectedCategory,
        device_info: navigator.userAgent.includes('Mobile') ? 'HP' : 'PC'
      });

      if (soundEnabled) {
        playBroadcastSound(selectedCategory);
      }

      if (res?.delivery?.external && res?.delivery?.primary) {
        showToast('Tersiar ke 2 Database!', 'Pesan berhasil dikirim ke Aplikasi Ini & Aplikasi Lain secara serentak.', 'success');
      } else {
        showToast('Terkirim!', 'Robot kurir berhasil menyiarkan pesan Anda.', 'success');
      }

      setMessageText('');
      onClose();
    } catch (err: any) {
      showToast('Gagal', err.message || 'Gagal menyiarkan pesan.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleTriggerBellSound = async (bellItem: typeof bellPresets[0]) => {
    if (soundEnabled) {
      playBroadcastSound(bellItem.category);
    }

    try {
      const formattedMessage = formatBroadcastMessage(`🔔 [SUARA BEL] ${bellItem.title} dibunyikan`, recipient);

      await onSend({
        sender_name: senderName.trim() || 'Pos Logistik',
        message: formattedMessage,
        category: bellItem.category,
        device_info: 'Robot Interkom Bel'
      });

      showToast('Suara Tersiar!', `Suara "${bellItem.title}" berhasil disiarkan ke seluruh perangkat.`, 'success');
    } catch (e: any) {
      showToast('Gagal', 'Gagal membunyikan suara ke jaringan.', 'error');
    }
  };

  const handleClearHistory = () => {
    if (!onClearAll) {
      showToast('Akses Terbatas', 'Hanya Admin yang dapat menghapus seluruh pesan di database.', 'warning');
      return;
    }

    showConfirm({
      title: 'Kosongkan Seluruh Pesan Siaran?',
      message: 'Semua riwayat pesan siaran akan dihapus secara permanen dari database. Lanjutkan?',
      confirmText: 'Ya, Hapus Semua',
      type: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await onClearAll();
          showToast('Database Bersih', 'Seluruh riwayat pesan siaran di database berhasil dikosongkan.', 'success');
        } catch (e: any) {
          showToast('Gagal', 'Terjadi kesalahan saat menghapus pesan di database.', 'error');
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleDeleteSingle = (id: string, sender: string) => {
    if (!onDeleteMessage) return;

    showConfirm({
      title: 'Hapus Pesan?',
      message: `Hapus pesan siaran dari "${sender}" dari database?`,
      confirmText: 'Hapus Pesan',
      type: 'danger',
      onConfirm: async () => {
        try {
          await onDeleteMessage(id);
          showToast('Terhapus', 'Pesan siaran berhasil dihapus dari database.', 'success');
        } catch (e) {
          showToast('Gagal', 'Gagal menghapus pesan.', 'error');
        }
      }
    });
  };

  const handleTestConnection = async () => {
    if (!extUrl.trim() || !extKey.trim()) {
      showToast('Data Belum Lengkap', 'Masukkan URL Server dan Kunci Akses database aplikasi lain untuk dites.', 'warning');
      return;
    }

    if (!onTestExternalConnection) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTestExternalConnection(extUrl.trim(), extKey.trim());
      setTestResult(result);
      if (result.success) {
        showToast('Koneksi Sukses!', result.message, 'success');
      } else {
        showToast('Koneksi Gagal', result.message, 'error');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Gagal mengetes koneksi database.'
      });
      showToast('Error', 'Gagal mengetes koneksi.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveExternalConfig = (e: FormEvent) => {
    e.preventDefault();
    if (!onUpdateExternalConfig) return;

    const trimmedUrl = extUrl.trim();
    const trimmedKey = extKey.trim();
    const isEnabled = Boolean(trimmedUrl && trimmedKey);

    onUpdateExternalConfig({
      url: trimmedUrl,
      anonKey: trimmedKey,
      syncTarget,
      enabled: isEnabled
    });

    if (isEnabled) {
      showToast('Tersimpan & Terhubung!', 'Konfigurasi sinkronisasi database aplikasi lain berhasil disimpan dan tersambung.', 'success');
    } else {
      showToast('Disimpan', 'Koneksi database eksternal dimatikan.', 'info');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
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
                Kirim Pesan Siaran & Suara Bel
              </h3>
            </div>
          </div>

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
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('simple_form')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'simple_form'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send size={13} />
            <span>Kirim Pesan Siar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={13} />
            <span>Riwayat ({messages.length})</span>
          </button>

          {isExternalConfigured && (
            <button
              type="button"
              onClick={() => setActiveTab('database_sync')}
              className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'database_sync'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe size={13} />
              <span>Database Lain</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          )}
        </div>

        {/* Modal Body: SIMPLE FORM (Pengirim, Kepada, Isi Pesan, Riwayat) */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white space-y-4">
          
          {activeTab === 'simple_form' && (
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              
              {/* 1. Pengirim */}
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
                  placeholder="Nama Pengirim (contoh: Dede, Pos 1, Admin...)"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                />

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cepat:</span>
                  {quickSenders.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSenderName(q)}
                      className={`text-[10px] px-2.5 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        senderName === q 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Kepada */}
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

                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target:</span>
                  {quickRecipients.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRecipient(r)}
                      className={`text-[10px] px-2.5 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                        recipient === r 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Isi Pesan Siar & Suara Bel */}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-indigo-600" />
                  <span>3. Isi Pesan Siar</span>
                </label>
                <textarea
                  rows={3}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Tulis pesan yang ingin disiarkan..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs sm:text-sm font-semibold placeholder:text-slate-400 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                  autoFocus
                />

                {/* Suara Bel Interkom */}
                <div className="mt-2.5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <Zap size={13} className="text-amber-500" />
                      <span>Bunyikan Suara Bel:</span>
                    </span>
                    <span className="text-[10px] text-indigo-600 font-medium">Klik untuk bunyikan</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {bellPresets.map(bell => {
                      const Icon = bell.icon;
                      const isSelected = selectedCategory === bell.category;
                      return (
                        <button
                          key={bell.category}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(bell.category);
                            handleTriggerBellSound(bell);
                          }}
                          className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-white border-indigo-600 shadow-xs ring-1 ring-indigo-500'
                              : 'bg-white/80 hover:bg-white border-slate-200 hover:border-indigo-300'
                          }`}
                          title={`Bunyikan ${bell.title}`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon size={14} className="text-indigo-600" />
                            <span className="text-[9px] text-emerald-600 font-extrabold uppercase">Siar Bel</span>
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 leading-tight truncate">{bell.label}</span>
                          <span className="text-[9px] text-slate-500 truncate">{bell.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Preset Templates */}
                <div className="space-y-1.5 mt-2.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Template Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {presetTemplates.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMessageText(item.text)}
                        className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 font-semibold transition-all cursor-pointer text-left"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Riwayat Section Preview */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <History size={13} className="text-indigo-600" />
                    <span>4. Riwayat ({messages.length})</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    Buka Riwayat Lengkap &rarr;
                  </button>
                </div>

                {messages.length === 0 ? (
                  <div className="text-center py-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 text-xs">
                    Belum ada riwayat siaran.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {messages.slice(0, 2).map(msg => {
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

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-md shadow-indigo-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyiarkan...</span>
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Siarkan Pesan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: RIWAYAT LENGKAP */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {isAdmin && onClearAll && messages.length > 0 && (
                <div className="p-2.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Database size={14} className="text-red-700" />
                    <span className="text-xs font-bold text-red-950 truncate">
                      Database Siaran ({messages.length} pesan)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearHistory}
                    disabled={isDeleting}
                    className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>{isDeleting ? 'Menghapus...' : 'Hapus Semua'}</span>
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-slate-400 font-medium text-xs">
                  Memuat riwayat...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                  <p className="text-xs font-semibold m-0">Belum ada pesan siaran di database.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-0.5">
                  {messages.map(item => {
                    const parsed = parseBroadcastPayload(item.message, item.sender_name);
                    const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between gap-1.5 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-extrabold text-indigo-900 uppercase">
                              {item.sender_name}
                            </span>
                            <span className="text-slate-400">&rarr;</span>
                            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Kepada: {parsed.recipient}
                            </span>
                            {item.origin === 'external' && (
                              <span className="bg-indigo-200 text-indigo-900 text-[9px] font-black px-1.5 py-0.2 rounded">
                                App Lain
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[10px]">
                            <span>{timeStr}</span>
                            {soundEnabled && (
                              <button
                                type="button"
                                onClick={() => playBroadcastSound(item.category || 'info')}
                                className="text-indigo-600 hover:text-indigo-800 p-1 cursor-pointer"
                                title="Bunyikan Nada"
                              >
                                <Volume2 size={13} />
                              </button>
                            )}
                            {isAdmin && onDeleteMessage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(item.id, item.sender_name)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                                title="Hapus pesan ini (Admin)"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-800 font-medium m-0 leading-relaxed whitespace-pre-wrap break-words">
                          {parsed.cleanMessage || item.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATABASE LAIN */}
          {activeTab === 'database_sync' && (
            <div className="space-y-3">
              <form onSubmit={handleSaveExternalConfig} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    URL Server Aplikasi Lain
                  </label>
                  <input
                    type="text"
                    value={extUrl}
                    onChange={e => setExtUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklmn.supabase.co"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Kunci Akses (Anon Key)
                  </label>
                  <input
                    type="password"
                    value={extKey}
                    onChange={e => setExtKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>

                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[11px] m-0">{testResult.success ? 'Hasil Tes Sukses' : 'Hasil Tes Gagal'}</p>
                      <p className="text-[10px] m-0 mt-0.5 leading-relaxed">{testResult.message}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !extUrl.trim() || !extKey.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                    <span>{isTesting ? 'Mengetes...' : 'Tes Koneksi'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!extUrl.trim() || !extKey.trim()}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Link2 size={13} />
                    <span>Simpan & Sambungkan</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
