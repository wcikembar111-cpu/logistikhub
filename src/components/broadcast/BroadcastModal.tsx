import React, { useState, useEffect, FormEvent } from 'react';
import { 
  Send, 
  X, 
  History, 
  PlusCircle, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Bot
} from 'lucide-react';
import { BroadcastMessage } from '../../types';
import { playBroadcastSound } from '../../utils/broadcastSound';
import { useNotification } from '../../context/NotificationContext';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: any[];
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
  isAdmin
}: BroadcastModalProps) {
  const { showToast, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  const [senderName, setSenderName] = useState<string>(() => {
    return localStorage.getItem('broadcast_sender_name') || 'Pos Logistik 1';
  });

  const [messageText, setMessageText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

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

      await onSend({
        sender_name: senderName.trim(),
        message: messageText.trim(),
        category: 'info',
        device_info: navigator.userAgent.includes('Mobile') ? 'HP' : 'PC'
      });

      if (soundEnabled) {
        playBroadcastSound('info');
      }

      showToast('Terkirim!', 'Robot kurir berhasil menyiarkan pesan Anda.', 'success');
      setMessageText('');
      setActiveTab('history');
    } catch (err: any) {
      showToast('Gagal', err.message || 'Gagal menyiarkan pesan.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    if (!onClearAll) return;
    showConfirm({
      title: 'Hapus Riwayat Pesan?',
      message: 'Semua riwayat siaran akan dibersihkan. Lanjutkan?',
      confirmText: 'Ya, Bersihkan',
      type: 'danger',
      onConfirm: async () => {
        await onClearAll();
        showToast('Berhasil', 'Riwayat telah dibersihkan.', 'success');
      }
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[800] flex items-center justify-center p-3 sm:p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Simple Modern Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-cyan-300 shadow-inner shrink-0">
              <Bot size={18} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white tracking-tight leading-none truncate m-0">
                Kirim Pesan Siaran
              </h3>
              <p className="text-[11px] text-slate-300 font-medium m-0 mt-0.5 truncate">
                Disampaikan oleh Robot Kurir ke semua layar
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
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-1.5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('compose')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
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
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <History size={14} />
            <span>Riwayat ({messages.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          {activeTab === 'compose' ? (
            <form onSubmit={handleSendBroadcast} className="space-y-3.5">
              {/* Input Nama Pengirim */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Nama Pengirim / Pos
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  placeholder="Contoh: Pos 1, Admin Gudang, Dede..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 outline-none transition-all"
                  required
                />
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
          ) : (
            /* History List */
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Daftar Pesan Terbaru ({messages.length})
                </span>

                {messages.length > 0 && (isAdmin || onClearAll) && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Trash2 size={11} /> Bersihkan
                  </button>
                )}
              </div>

              {loading ? (
                <div className="text-center py-8 text-slate-400 font-medium text-xs">
                  Memuat riwayat...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500">
                  <p className="text-xs font-semibold m-0">Belum ada pesan siaran.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
                    className="mt-2 text-xs font-bold text-blue-900 hover:underline cursor-pointer"
                  >
                    Tulis pesan sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-0.5">
                  {messages.map(item => {
                    const timeStr = new Date(item.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col gap-1"
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
                          </div>

                          <div className="flex items-center gap-1 shrink-0 text-slate-400 text-[10px]">
                            <span>{timeStr}</span>
                            {onDeleteMessage && (
                              <button
                                type="button"
                                onClick={() => onDeleteMessage(item.id)}
                                className="p-0.5 text-slate-300 hover:text-red-600 transition-colors cursor-pointer"
                              >
                                <Trash2 size={11} />
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
        </div>
      </div>
    </div>
  );
}
