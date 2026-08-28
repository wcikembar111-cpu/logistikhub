import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Send, 
  X, 
  History, 
  PlusCircle, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Heart, 
  Database, 
  ShieldCheck, 
  AlertCircle, 
  BellRing, 
  CheckCircle2,
  Globe,
  Radio,
  Link2,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Layers
} from 'lucide-react';
import { BroadcastMessage, ExternalSupabaseConfig, DatabaseSyncStatus } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';
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
    category?: any;
    device_info?: string;
  }) => Promise<any>;
  onDeleteMessage?: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
  initialSenderName?: string;
  isAdmin?: boolean;
  currentUser?: { email?: string; username?: string; nama?: string; nama_lengkap?: string; role?: string } | null;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => Promise<any>;
  isNotificationSupported?: boolean;
  externalConfig?: ExternalSupabaseConfig;
  onUpdateExternalConfig?: (config: ExternalSupabaseConfig) => void;
  onTestExternalConnection?: (url: string, anonKey: string) => Promise<{ success: boolean; message: string; tableReady?: boolean }>;
  syncStatus?: DatabaseSyncStatus;
  isExternalConfigured?: boolean;
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
  notificationPermission,
  onRequestNotificationPermission,
  isNotificationSupported = true,
  externalConfig,
  onUpdateExternalConfig,
  onTestExternalConnection,
  syncStatus,
  isExternalConfigured
}: BroadcastModalProps) {
  const { showToast, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'compose' | 'history' | 'database_sync'>('compose');

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

  const [senderName, setSenderName] = useState<string>(() => {
    if (activeUserDisplayName) return activeUserDisplayName;
    return localStorage.getItem('broadcast_sender_name') || 'Pos Logistik 1';
  });

  // Automatically sync sender name with the logged-in user whenever modal opens or active user changes
  useEffect(() => {
    if (activeUserDisplayName) {
      setSenderName(activeUserDisplayName);
    }
  }, [activeUserDisplayName, isOpen]);

  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // External Supabase Form State
  const [extUrl, setExtUrl] = useState<string>(externalConfig?.url || '');
  const [extKey, setExtKey] = useState<string>(externalConfig?.anonKey || '');
  const [syncTarget, setSyncTarget] = useState<ExternalSupabaseConfig['syncTarget']>(externalConfig?.syncTarget || 'both');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; tableReady?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  useEffect(() => {
    if (externalConfig) {
      setExtUrl(externalConfig.url || '');
      setExtKey(externalConfig.anonKey || '');
      setSyncTarget(externalConfig.syncTarget || 'both');
    }
  }, [externalConfig]);

  useEffect(() => {
    if (initialSenderName) {
      setMessageText(`@${initialSenderName} `);
    }
  }, [initialSenderName]);

  if (!isOpen) return null;

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

      const res = await onSend({
        sender_name: senderName.trim(),
        message: messageText.trim(),
        category: 'info',
        device_info: navigator.userAgent.includes('Mobile') ? 'HP' : 'PC'
      });

      if (soundEnabled) {
        playBroadcastSound('info');
      }

      if (res?.delivery?.external && res?.delivery?.primary) {
        showToast('Tersiar ke 2 Database!', 'Pesan berhasil dikirim ke Aplikasi Ini & Aplikasi Lain secara serentak.', 'success');
      } else if (res?.delivery?.external) {
        showToast('Tersiar ke App Lain!', 'Pesan berhasil dikirim ke Database Aplikasi Lain.', 'success');
      } else {
        showToast('Terkirim!', 'Robot kurir berhasil menyiarkan pesan Anda.', 'success');
      }

      setMessageText('');
      setActiveTab('history');
    } catch (err: any) {
      showToast('Gagal', err.message || 'Gagal menyiarkan pesan.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    if (!onClearAll) {
      showToast('Akses Terbatas', 'Hanya Admin yang dapat menghapus seluruh pesan di database.', 'warning');
      return;
    }

    showConfirm({
      title: 'Kosongkan Seluruh Pesan Siaran?',
      message: 'Semua riwayat pesan siaran akan dihapus secara permanen dari database (termasuk database eksternal jika terhubung). Lanjutkan?',
      confirmText: 'Ya, Hapus Semua di Database',
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
      if (result.success && result.tableReady) {
        showToast('Koneksi Sukses!', result.message, 'success');
      } else if (result.success && !result.tableReady) {
        showToast('Perlu Buat Tabel', result.message, 'warning');
        setShowSqlGuide(true);
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

  const handleResetConnection = () => {
    if (!onUpdateExternalConfig) return;
    setExtUrl('');
    setExtKey('');
    setSyncTarget('both');
    setTestResult(null);
    onUpdateExternalConfig({
      url: '',
      anonKey: '',
      syncTarget: 'both',
      enabled: false
    });
    showToast('Koneksi Direset', 'Koneksi ke database aplikasi lain telah dinonaktifkan.', 'info');
  };

  const sqlSchemaSnippet = `-- SQL Tabel Pesan Siaran untuk Supabase Aplikasi Lain:
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'info',
    device_info VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.broadcast_messages DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.broadcast_messages TO anon, authenticated;

-- Aktifkan Supabase Realtime Replication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'broadcast_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchemaSnippet);
    setCopiedSql(true);
    showToast('Disalin!', 'Struktur data berhasil disalin ke clipboard.', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Simple Modern Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white shadow-md shrink-0 border border-pink-300">
              <Heart size={16} className="fill-white animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-tight leading-none truncate m-0 flex items-center gap-1.5">
                <span>Pusat Pesan Siaran (Broadcast)</span>
                {isExternalConfigured && (
                  <span className="bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    Dual DB
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-pink-200 font-medium m-0 mt-0.5 truncate">
                Disampaikan oleh Robot Pink Love ke semua layar & database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleSound}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
              title={soundEnabled ? 'Suara Robot Aktif' : 'Suara Mute'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-1.5 gap-2 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'compose'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <PlusCircle size={14} />
            <span>Tulis Pesan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={14} />
            <span>Riwayat ({messages.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('database_sync')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'database_sync'
                ? 'border-indigo-900 text-indigo-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe size={14} />
            <span>Database Lain</span>
            {isExternalConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          {/* TAB 1: COMPOSE MESSAGE */}
          {activeTab === 'compose' && (
            <form onSubmit={handleSendBroadcast} className="space-y-3.5">
              {/* Sync Route Indicator if Dual DB Connected */}
              {isExternalConfigured && (
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Radio size={14} className="text-indigo-600 animate-pulse" />
                    <span className="font-semibold text-indigo-950 text-[11px]">
                      Pesan akan disiarkan ke: <strong className="text-indigo-700 uppercase">
                        {syncTarget === 'both' ? 'Kedua Database (Aplikasi Ini & Aplikasi Lain)' : syncTarget === 'external' ? 'Database Aplikasi Lain Saja' : 'Database Aplikasi Ini'}
                      </strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('database_sync')}
                    className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Ubah
                  </button>
                </div>
              )}

              {/* OS Notification Status Banner */}
              {isNotificationSupported && (
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-2.5 text-xs transition-all ${
                  notificationPermission === 'granted'
                    ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {notificationPermission === 'granted' ? (
                      <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                    ) : (
                      <BellRing size={16} className="text-amber-600 animate-bounce shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] leading-tight m-0">
                        {notificationPermission === 'granted' 
                          ? 'Notifikasi Layar OS Aktif' 
                          : 'Notifikasi Layar Belum Aktif'}
                      </p>
                      <p className="text-[10px] text-slate-500 leading-tight m-0 mt-0.5 truncate">
                        {notificationPermission === 'granted'
                          ? 'Siaran akan muncul di layar meski buka tab lain / Excel / HP.'
                          : 'Aktifkan agar siaran tetap muncul saat buka aplikasi lain.'}
                      </p>
                    </div>
                  </div>

                  {notificationPermission !== 'granted' && onRequestNotificationPermission && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await onRequestNotificationPermission();
                        if (res === 'granted') {
                          showToast('Berhasil Aktif', 'Notifikasi sistem OS berhasil diaktifkan.', 'success');
                        } else if (res === 'denied') {
                          showToast('Izin Ditolak', 'Silakan izinkan notifikasi melalui ikon gembok di browser.', 'warning');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
                    >
                      Aktifkan
                    </button>
                  )}
                </div>
              )}

              {/* Input Nama Pengirim */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Nama Pengirim / Pos
                  </label>
                  {activeUserDisplayName && (
                    <span className="text-[10px] text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-bold truncate max-w-[220px]">
                      User Login: {activeUserDisplayName}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Contoh: Pos 1, Admin Gudang, Dede..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all"
                  required
                />
                {/* Saran / Preset Cepat Nama Pengirim */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pilihan Cepat:</span>
                  {activeUserDisplayName && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSenderName(activeUserDisplayName)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                          senderName === activeUserDisplayName
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {activeUserDisplayName}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSenderName(`${activeUserDisplayName} (Pos 1)`)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                          senderName === `${activeUserDisplayName} (Pos 1)`
                            ? 'bg-blue-900 text-white border-blue-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {activeUserDisplayName} (Pos 1)
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setSenderName('Pos Logistik 1')}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      senderName === 'Pos Logistik 1'
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    Pos Logistik 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSenderName('Gudang CKB')}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border font-bold transition-all cursor-pointer ${
                      senderName === 'Gudang CKB'
                        ? 'bg-blue-900 text-white border-blue-900'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    Gudang CKB
                  </button>
                </div>
              </div>

              {/* Input Pesan */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Isi Pesan
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Tulis pesan yang ingin disiarkan..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all resize-none"
                  required
                  autoFocus
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSending || !messageText.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send size={13} />
                  <span>{isSending ? 'Mengirim...' : 'Siarkan Pesan'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: MESSAGE HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {/* Admin Database Control Bar */}
              {isAdmin && onClearAll && messages.length > 0 && (
                <div className="p-2.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                      <Database size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-red-950 m-0 leading-tight">
                        Database Siaran ({messages.length} pesan)
                      </p>
                      <p className="text-[10px] text-red-700 m-0 leading-tight truncate">
                        Kosongkan agar kapasitas database tetap rapi
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearHistory}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>{isDeleting ? 'Menghapus...' : 'Hapus Semua'}</span>
                  </button>
                </div>
              )}

              {/* Status Header */}
              <div className="flex items-center justify-between gap-2 px-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Pesan Tersimpan ({messages.length})
                </span>

                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <ShieldCheck size={11} /> Admin Mode
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <AlertCircle size={10} /> Hapus via Admin
                  </span>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-slate-400 font-medium text-xs">
                  Memuat riwayat...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                  <p className="text-xs font-semibold m-0">Belum ada pesan siaran di database.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
                    className="mt-2 text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                  >
                    Tulis pesan sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[44vh] overflow-y-auto pr-0.5">
                  {messages.map(item => {
                    const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-1 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1.5 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-bold text-slate-800 truncate">
                              {item.sender_name}
                            </span>
                            {item.device_info && (
                              <span className="text-[10px] text-slate-400">
                                • {item.device_info}
                              </span>
                            )}
                            {item.origin === 'external' && (
                              <span className="bg-indigo-100 text-indigo-700 text-[9px] font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                                App Lain
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-slate-400 text-[10px]">
                            <span>{timeStr}</span>
                            {isAdmin && onDeleteMessage && (
                              <button
                                type="button"
                                onClick={() => handleDeleteSingle(item.id, item.sender_name)}
                                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all cursor-pointer"
                                title="Hapus pesan ini dari database (Admin)"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 font-medium m-0 leading-relaxed whitespace-pre-wrap break-words">
                          {item.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXTERNAL SUPABASE DATABASE CONNECTION */}
          {activeTab === 'database_sync' && (
            <div className="space-y-4">
              {/* Architecture Explanation Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-white/10 text-amber-300">
                    <Zap size={15} />
                  </div>
                  <h4 className="text-xs font-bold tracking-tight text-white m-0">
                    Koneksi Siaran Lintas Aplikasi
                  </h4>
                </div>
                <p className="text-[11px] text-blue-100/90 leading-relaxed m-0">
                  Hubungkan broadcast pesan siaran ini ke aplikasi Anda yang satu lagi. Pesan akan terkirim dan diterima secara realtime secara serentak (Dual-Sync).
                </p>

                {/* Connection Status Diagram */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-xl bg-white/10 border border-white/15 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="text-[10px] font-bold text-white uppercase">DB Utama (App Ini)</span>
                    </div>
                    <span className="text-[10px] text-emerald-200 font-medium">Terhubung & Aktif</span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/10 border border-white/15 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      {isExternalConfigured && syncStatus?.isExternalConnected ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      ) : isExternalConfigured ? (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                      )}
                      <span className="text-[10px] font-bold text-white uppercase">DB Aplikasi Lain</span>
                    </div>
                    <span className="text-[10px] text-blue-100 font-medium truncate">
                      {isExternalConfigured && syncStatus?.isExternalConnected
                        ? 'Dual-Sync Aktif ⚡'
                        : isExternalConfigured
                        ? 'Tersimpan (Mencoba Konek)'
                        : 'Belum Dikonfigurasi'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Input Database Eksternal */}
              <form onSubmit={handleSaveExternalConfig} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    URL Server Aplikasi Lain
                  </label>
                  <input
                    type="text"
                    value={extUrl}
                    onChange={e => setExtUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklmn.co"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 outline-none transition-all placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 m-0">
                    Masukkan URL endpoint database / backend aplikasi tujuan.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Kunci Akses (API Key / Token) Aplikasi Lain
                  </label>
                  <input
                    type="password"
                    value={extKey}
                    onChange={e => setExtKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-indigo-900/20 focus:border-indigo-900 outline-none transition-all placeholder:text-slate-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 m-0">
                    Kunci otentikasi publik / token untuk komunikasi antar database.
                  </p>
                </div>

                {/* Mode Sinkronisasi */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Target Sinkronisasi Siaran
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSyncTarget('both')}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        syncTarget === 'both'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <Layers size={12} className={syncTarget === 'both' ? 'text-indigo-600' : 'text-slate-400'} />
                        Dual Sync
                      </span>
                      <span className="text-[9px] text-slate-500 leading-tight">
                        Kirim ke 2 DB serentak
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSyncTarget('external')}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        syncTarget === 'external'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <Globe size={12} className={syncTarget === 'external' ? 'text-indigo-600' : 'text-slate-400'} />
                        Hanya App Lain
                      </span>
                      <span className="text-[9px] text-slate-500 leading-tight">
                        Siaran khusus app lain
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSyncTarget('primary')}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                        syncTarget === 'primary'
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-[11px] font-bold flex items-center gap-1">
                        <Database size={12} className={syncTarget === 'primary' ? 'text-indigo-600' : 'text-slate-400'} />
                        Hanya App Ini
                      </span>
                      <span className="text-[9px] text-slate-500 leading-tight">
                        Database lokal saja
                      </span>
                    </button>
                  </div>
                </div>

                {/* Test Result Message Box if tested */}
                {testResult && (
                  <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[11px] m-0">{testResult.success ? 'Hasil Tes Sukses' : 'Hasil Tes Gagal'}</p>
                      <p className="text-[10px] m-0 mt-0.5 leading-relaxed">{testResult.message}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons: Test, Save, Reset */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !extUrl.trim() || !extKey.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <RefreshCw size={13} className={isTesting ? 'animate-spin' : ''} />
                    <span>{isTesting ? 'Mengetes...' : 'Tes Koneksi'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isExternalConfigured && (
                      <button
                        type="button"
                        onClick={handleResetConnection}
                        className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-all cursor-pointer"
                      >
                        Putuskan
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={!extUrl.trim() || !extKey.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Link2 size={13} />
                      <span>Simpan & Sambungkan</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Schema Accordion for External Database */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Database size={13} className="text-slate-500" />
                    Struktur Data Tabel untuk Aplikasi Lain
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowSqlGuide(!showSqlGuide)}
                    className="text-[10px] font-bold text-blue-900 hover:underline cursor-pointer"
                  >
                    {showSqlGuide ? 'Sembunyikan' : 'Lihat Struktur Data'}
                  </button>
                </div>

                {showSqlGuide && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] text-slate-500 leading-relaxed m-0">
                      Gunakan struktur data ini di database aplikasi Anda yang satu lagi agar tabel dan fitur sinkronisasi realtime siap digunakan:
                    </p>
                    <div className="relative">
                      <pre className="p-2.5 rounded-lg bg-slate-950 text-emerald-400 text-[10px] font-mono overflow-x-auto max-h-36 leading-relaxed select-all">
                        {sqlSchemaSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopySql}
                        className="absolute top-2 right-2 px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs transition-all cursor-pointer"
                      >
                        {copiedSql ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                        <span>{copiedSql ? 'Tersalin' : 'Salin Struktur'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

