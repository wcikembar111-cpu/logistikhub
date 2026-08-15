import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Radio, 
  Send, 
  X, 
  History, 
  PlusCircle, 
  AlertOctagon, 
  AlertTriangle, 
  Info, 
  Megaphone, 
  Volume2, 
  VolumeX, 
  Trash2, 
  RotateCcw,
  Sparkles,
  Database
} from 'lucide-react';
import { BroadcastMessage, BroadcastCategory } from '../../types';
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
    category?: BroadcastCategory;
    device_info?: string;
  }) => Promise<any>;
  onDeleteMessage?: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
  initialSenderName?: string;
  isAdmin?: boolean;
}

const PRESET_MESSAGES = [
  { text: 'Tolong bantu cek stock opname di area gudang.', category: 'info' as BroadcastCategory, label: '📦 Cek Stock' },
  { text: 'Surat Jalan dan armada muatan baru saja tiba di docking.', category: 'info' as BroadcastCategory, label: '🚚 Muatan Tiba' },
  { text: 'MENDESAK: Mohon segera konfirmasi dokumen barang urgent.', category: 'urgent' as BroadcastCategory, label: '🚨 Urgent Dokumen' },
  { text: 'Perhatian: Ada barang mendekati masa ED, mohon diverifikasi.', category: 'warning' as BroadcastCategory, label: '⚠️ Cek ED' },
  { text: 'Pengumuman: Briefing operasional logistik diadakan 5 menit lagi.', category: 'announcement' as BroadcastCategory, label: '📢 Briefing Tim' }
];

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
  isAdmin
}: BroadcastModalProps) {
  const { showToast, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  const [senderName, setSenderName] = useState<string>(() => {
    return localStorage.getItem('broadcast_sender_name') || 'Pos Logistik 1';
  });

  const [messageText, setMessageText] = useState<string>('');
  const [category, setCategory] = useState<BroadcastCategory>('info');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  useEffect(() => {
    if (initialSenderName) {
      setMessageText(`@${initialSenderName} `);
    }
  }, [initialSenderName]);

  if (!isOpen) return null;

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      showToast('Peringatan', 'Silakan ketik isi pesan siaran terlebih dahulu.', 'warning');
      return;
    }

    if (!senderName.trim()) {
      showToast('Peringatan', 'Silakan masukkan nama pengirim / perangkat.', 'warning');
      return;
    }

    setIsSending(true);
    try {
      // Save sender name preference
      localStorage.setItem('broadcast_sender_name', senderName.trim());

      await onSend({
        sender_name: senderName.trim(),
        message: messageText.trim(),
        category,
        device_info: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop / PC'
      });

      // Play local confirmation sound
      if (soundEnabled) {
        playBroadcastSound(category);
      }

      showToast('Berhasil!', 'Pesan siaran berhasil dikirim ke seluruh perangkat.', 'success');
      setMessageText('');
      setActiveTab('history');
    } catch (err: any) {
      showToast('Gagal Mengirim', err.message || 'Terjadi kesalahan saat menyiarkan pesan.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    if (!onClearAll) return;
    showConfirm({
      title: 'Hapus Semua Riwayat Siaran?',
      message: 'Semua riwayat pesan siaran di database akan dibersihkan. Lanjutkan?',
      confirmText: 'Ya, Bersihkan',
      type: 'danger',
      onConfirm: async () => {
        await onClearAll();
        showToast('Berhasil', 'Riwayat siaran telah dibersihkan.', 'success');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <Radio size={22} className="animate-pulse text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white uppercase m-0">
                  Siaran Antar-Perangkat
                </h3>
                <span className="text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Live Realtime
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium m-0 mt-0.5">
                Kirim pesan instan & notifikasi pop-up ke semua komputer/HP yang membuka aplikasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                  : 'bg-white/10 text-slate-400 border-white/10 hover:bg-white/20 line-through'
              }`}
              title={soundEnabled ? 'Suara Siaran Aktif (Klik untuk Mute)' : 'Suara Siaran Dimatikan'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('compose')}
            className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'compose'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle size={15} />
            <span>Kirim Siaran Baru</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-4 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={15} />
            <span>Riwayat Siaran ({messages.length})</span>
          </button>

          <div className="ml-auto pb-2">
            <button
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="text-[11px] font-bold text-slate-500 hover:text-blue-900 bg-white border border-slate-200 hover:border-blue-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              title="Lihat Skema SQL Supabase untuk Database Siaran"
            >
              <Database size={13} className="text-blue-900" />
              <span>Skema SQL Supabase</span>
            </button>
          </div>
        </div>

        {/* SQL Guide Dropdown/Modal View */}
        {showSqlGuide && (
          <div className="p-4 bg-slate-900 text-slate-200 border-b border-slate-800 text-xs shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-amber-400 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Database size={14} /> Tabel Supabase Database (broadcast_messages)
              </span>
              <button
                onClick={() => setShowSqlGuide(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mb-2">
              Tabel ini sudah otomatis disediakan di <code>supabase_schema.sql</code>. Pastikan Anda telah menjalankan perintah SQL ini di Supabase SQL Editor:
            </p>
            <pre className="bg-slate-950 p-3 rounded-xl overflow-x-auto text-[11px] font-mono text-emerald-400 border border-slate-800">
{`CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_name VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'info',
    device_info VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.broadcast_messages DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.broadcast_messages TO anon, authenticated;`}
            </pre>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-white">
          {activeTab === 'compose' ? (
            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Row 1: Sender Name & Urgency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Nama Perangkat / Pengirim
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder="Contoh: Pos 1, Admin Gudang, Dede..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all shadow-xs"
                    required
                  />
                  <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                    Nama ini akan muncul di judul pop-up semua perangkat.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    Tingkat Urgensi / Jenis Pesan
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategory('info')}
                      className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                        category === 'info'
                          ? 'bg-blue-50 border-blue-600 text-blue-950 font-bold ring-2 ring-blue-300'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                      }`}
                    >
                      <Info size={16} className="text-blue-600 shrink-0" />
                      <span className="text-xs">Info Umum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('urgent')}
                      className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                        category === 'urgent'
                          ? 'bg-red-50 border-red-600 text-red-950 font-bold ring-2 ring-red-300'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                      }`}
                    >
                      <AlertOctagon size={16} className="text-red-600 shrink-0" />
                      <span className="text-xs">Mendesak</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('warning')}
                      className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                        category === 'warning'
                          ? 'bg-amber-50 border-amber-600 text-amber-950 font-bold ring-2 ring-amber-300'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                      }`}
                    >
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span className="text-xs">Peringatan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCategory('announcement')}
                      className={`p-2 rounded-xl text-left border flex items-center gap-2 transition-all cursor-pointer ${
                        category === 'announcement'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold ring-2 ring-emerald-300'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 text-xs'
                      }`}
                    >
                      <Megaphone size={16} className="text-emerald-600 shrink-0" />
                      <span className="text-xs">Pengumuman</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preset Quick Chips */}
              <div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  <span>Template Pesan Cepat:</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PRESET_MESSAGES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setMessageText(preset.text);
                        setCategory(preset.category);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200/80 active:scale-95 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Isi Pesan Siaran
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Ketik pesan yang ingin disiarkan ke seluruh perangkat..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900 focus:border-blue-900 outline-none transition-all shadow-xs"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => playBroadcastSound(category)}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Uji coba dengarkan nada chime"
                >
                  <Volume2 size={15} /> Tes Nada
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase transition-all cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSending || !messageText.trim()}
                    className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send size={15} />
                    <span>{isSending ? 'Menyiarkan...' : 'Siarkan Pesan'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Tab Riwayat Siaran */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase">
                  Daftar Pesan Siaran Terbaru ({messages.length})
                </span>

                {messages.length > 0 && (isAdmin || onClearAll) && (
                  <button
                    onClick={handleClearHistory}
                    className="text-[11px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg border border-red-200 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} /> Bersihkan Riwayat
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-10 text-slate-400 font-bold text-xs animate-pulse">
                  Memuat riwayat siaran...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Radio size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-600 text-xs font-bold m-0">Belum ada pesan siaran.</p>
                  <p className="text-slate-400 text-[11px] m-0 mt-1">
                    Pesan yang Anda kirim akan tersimpan di database dan muncul di sini.
                  </p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="mt-3 px-4 py-2 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-950 transition-all shadow-xs cursor-pointer"
                  >
                    Kirim Pesan Pertama
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {messages.map(item => {
                    const timeStr = new Date(item.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    const categoryBadge = {
                      urgent: { bg: 'bg-red-100 text-red-700 border-red-300', label: 'MENDESAK' },
                      warning: { bg: 'bg-amber-100 text-amber-800 border-amber-300', label: 'PERINGATAN' },
                      announcement: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'PENGUMUMAN' },
                      info: { bg: 'bg-blue-100 text-blue-900 border-blue-300', label: 'INFO' }
                    }[item.category] || { bg: 'bg-blue-100 text-blue-900 border-blue-300', label: 'INFO' };

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-800">
                              {item.sender_name}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${categoryBadge.bg}`}
                            >
                              {categoryBadge.label}
                            </span>
                            {item.device_info && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                • {item.device_info}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-semibold text-slate-400">
                              {timeStr}
                            </span>
                            {onDeleteMessage && (
                              <button
                                onClick={() => onDeleteMessage(item.id)}
                                className="p-1 rounded text-slate-300 hover:text-red-600 transition-colors"
                                title="Hapus pesan ini"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-700 m-0 leading-relaxed whitespace-pre-wrap break-words">
                          {item.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
