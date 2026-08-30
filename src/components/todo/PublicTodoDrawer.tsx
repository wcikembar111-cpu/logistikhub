import React, { useState } from 'react';
import { 
  ListTodo, 
  X, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Volume2, 
  Edit2, 
  CheckCircle2, 
  Clock, 
  Circle, 
  Sparkles, 
  Flame, 
  Zap, 
  AlertCircle
} from 'lucide-react';
import { TodoData, TodoPriority } from '../../types';
import { useNotification } from '../../context/NotificationContext';

interface PublicTodoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  todos: TodoData[];
  loading: boolean;
  isAdmin: boolean;
  currentUser?: { email?: string; username?: string; nama?: string; nama_lengkap?: string; role?: string } | null;
  onAddTodo: (task: string, priority?: TodoPriority, isBlinking?: boolean, senderName?: string) => void;
  onUpdateStatus: (id: string, status: TodoData['status']) => void;
  onUpdateTodo?: (id: string, updates: Partial<Omit<TodoData, 'id'>>) => void;
  onDeleteTodo: (id: string) => void;
  onDeleteCompletedTodos?: () => void;
  onRefresh: () => void;
}

export function PublicTodoDrawer({
  isOpen,
  onClose,
  todos,
  loading,
  isAdmin,
  currentUser,
  onAddTodo,
  onUpdateStatus,
  onUpdateTodo,
  onDeleteTodo,
  onDeleteCompletedTodos,
  onRefresh
}: PublicTodoDrawerProps) {
  const { showConfirm, showToast } = useNotification();

  const [filter, setFilter] = useState<'all' | 'priority' | 'no' | 'onproses' | 'close'>('no');
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<TodoPriority>('rendah');
  const [newIsBlinking, setNewIsBlinking] = useState(false);

  const [, setReminderActive] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  // Edit / Detail Modal State
  const [editingTodo, setEditingTodo] = useState<TodoData | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<TodoData['status']>('no');
  const [editTaskPriority, setEditTaskPriority] = useState<TodoPriority>('rendah');
  const [editTaskBlinking, setEditTaskBlinking] = useState(false);

  // Todo Counts & Filtering
  const safeTodos = todos || [];
  const filteredTodos = safeTodos.filter(t => {
    if (filter === 'priority') return t.priority === 'mendesak' || t.priority === 'tinggi' || t.is_blinking;
    if (filter === 'all') return true;
    return t.status === filter;
  }).sort((a, b) => {
    const aWeight = (a.is_blinking || a.priority === 'mendesak') ? 3 : (a.priority === 'tinggi' ? 2 : (a.priority === 'sedang' ? 1 : 0));
    const bWeight = (b.is_blinking || b.priority === 'mendesak') ? 3 : (b.priority === 'tinggi' ? 2 : (b.priority === 'sedang' ? 1 : 0));
    return bWeight - aWeight;
  });
  
  const no = safeTodos.filter(t => t.status === 'no').length;
  const onproses = safeTodos.filter(t => t.status === 'onproses').length;
  const close = safeTodos.filter(t => t.status === 'close').length;
  const priorityCount = safeTodos.filter(t => (t.priority === 'mendesak' || t.priority === 'tinggi' || t.is_blinking) && t.status !== 'close').length;
  const pendingCount = no + onproses;

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const notes = [659.25, 880.00, 1174.66];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const startTime = ctx.currentTime + index * 0.2;
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.55);
      });
    } catch (e) {
      console.error("Gagal memutar audio todo chime:", e);
    }
  };

  const handleTestReminder = () => {
    playChime();
    setReminderActive(true);
    showToast('Bunyi Pengingat', 'Nada pengingat tugas berhasil diputar', 'info');
    setTimeout(() => setReminderActive(false), 3000);
  };

  const handleAdd = () => {
    if (!newTask.trim()) {
      showToast('Perhatian', 'Silakan ketik isi tugas terlebih dahulu', 'warning');
      return;
    }
    const userSenderName = currentUser?.nama_lengkap || currentUser?.nama || (currentUser?.username ? (currentUser.username.toUpperCase() === 'ADMIN' ? 'Administrator' : currentUser.username) : '') || localStorage.getItem('broadcast_sender_name') || (isAdmin ? 'Admin' : 'Pengguna Public Todo');
    onAddTodo(newTask.trim(), newPriority, newIsBlinking || newPriority === 'mendesak', userSenderName);
    showToast('Tersimpan & Disiarkan', 'Tugas baru berhasil disimpan dan disiarkan ke seluruh perangkat!', 'success');
    setNewTask('');
    setNewPriority('rendah');
    setNewIsBlinking(false);
    setShowFormModal(false);
  };

  const handleOpenEditModal = (todo: TodoData) => {
    setEditingTodo(todo);
    setEditTaskText(todo.task);
    setEditTaskStatus(todo.status);
    setEditTaskPriority(todo.priority || 'rendah');
    setEditTaskBlinking(!!todo.is_blinking);
  };

  const handleSaveEdit = () => {
    if (!editingTodo) return;
    if (!editTaskText.trim()) {
      showToast('Perhatian', 'Isi tugas tidak boleh kosong', 'warning');
      return;
    }
    if (onUpdateTodo) {
      onUpdateTodo(editingTodo.id, { 
        task: editTaskText.trim(), 
        status: editTaskStatus,
        priority: editTaskPriority,
        is_blinking: editTaskBlinking || editTaskPriority === 'mendesak'
      });
    } else {
      onUpdateStatus(editingTodo.id, editTaskStatus);
    }
    showToast('Tersimpan', 'Tugas berhasil diperbarui', 'success');
    setEditingTodo(null);
  };

  const renderPriorityBadge = (priority?: TodoPriority, isBlinking?: boolean) => {
    const isMendesak = priority === 'mendesak' || isBlinking;
    if (isMendesak) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border border-red-500 animate-badge-blink cursor-pointer shadow-sm">
          <Zap size={11} className="fill-current animate-bounce shrink-0" />
          <span>KEDIP MENDESAK</span>
        </span>
      );
    }
    if (priority === 'tinggi') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-amber-500 text-white border border-amber-600 shadow-2xs">
          <Flame size={11} className="fill-current shrink-0" />
          <span>PRIORITAS TINGGI</span>
        </span>
      );
    }
    if (priority === 'sedang') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase bg-blue-600 text-white border border-blue-700 shadow-2xs">
          <AlertCircle size={11} className="shrink-0" />
          <span>PRIORITAS SEDANG</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase bg-slate-200/90 text-slate-600 border border-slate-300">
        <span>BIASA</span>
      </span>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-[95] transition-opacity duration-200 cursor-pointer backdrop-blur-xs"
          onClick={onClose}
          title="Klik untuk menutup Public Todo"
        />
      )}

      {/* Slide-over Drawer on Right Side */}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[400px] bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out z-[100] shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/95 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <ListTodo size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="m-0 font-extrabold text-slate-900 text-sm leading-tight">
                  Public Todo & Tasks
                </h4>
                {priorityCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[9px] font-black uppercase animate-badge-blink">
                    {priorityCount} Kedip
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium m-0 truncate">
                Daftar tugas bersama tim logistik ({pendingCount} pending)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => setShowFormModal(true)} 
              className="px-2.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Tambah Tugas Baru"
            >
              <Plus size={14} />
              <span>Tambah</span>
            </button>

            <button 
              onClick={onRefresh} 
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shadow-2xs" 
              title="Muat Ulang Data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-600' : ''} />
            </button>

            <button 
              onClick={onClose} 
              className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 border border-slate-200 shadow-2xs transition-all cursor-pointer"
              title="Tutup Panel Todo"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-4 p-2.5 border-b border-slate-200 gap-1.5 bg-slate-50/80">
          <div 
            onClick={() => setFilter(prev => prev === 'priority' ? 'all' : 'priority')}
            className={`rounded-xl border shadow-2xs p-1.5 text-center cursor-pointer transition-all ${filter === 'priority' ? 'bg-red-50 border-red-300 ring-2 ring-red-400' : 'bg-white hover:bg-red-50/50 border-slate-200'}`}
            title="Filter Tugas Prioritas / Kedip (Klik lagi untuk lihat semua)"
          >
            <div className="text-xs font-black text-red-600 leading-tight flex items-center justify-center gap-1">
              <Zap size={11} className="text-red-600 fill-current animate-bounce" /> {priorityCount}
            </div>
            <div className="font-bold text-[8px] text-red-700 tracking-wider mt-0.5 uppercase">Kedip</div>
          </div>

          <div 
            onClick={() => setFilter(prev => prev === 'no' ? 'all' : 'no')}
            className={`rounded-xl border shadow-2xs p-1.5 text-center cursor-pointer transition-all ${filter === 'no' ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white hover:bg-amber-50/50 border-slate-200'}`}
            title="Filter Tugas Todo (Klik lagi untuk lihat semua)"
          >
            <div className="text-xs font-black text-slate-800 leading-tight">{no}</div>
            <div className="font-bold text-[8px] text-slate-600 tracking-wider mt-0.5 uppercase">Todo</div>
          </div>

          <div 
            onClick={() => setFilter(prev => prev === 'onproses' ? 'all' : 'onproses')}
            className={`rounded-xl border shadow-2xs p-1.5 text-center cursor-pointer transition-all ${filter === 'onproses' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400' : 'bg-white hover:bg-blue-50/50 border-slate-200'}`}
            title="Filter Tugas Proses (Klik lagi untuk lihat semua)"
          >
            <div className="text-xs font-black text-blue-600 leading-tight">{onproses}</div>
            <div className="font-bold text-[8px] text-blue-600 tracking-wider mt-0.5 uppercase">Proses</div>
          </div>

          <div 
            onClick={() => setFilter(prev => prev === 'close' ? 'all' : 'close')}
            className={`rounded-xl border shadow-2xs p-1.5 text-center cursor-pointer transition-all ${filter === 'close' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400' : 'bg-white hover:bg-emerald-50/50 border-slate-200'}`}
            title="Filter Tugas Selesai / Done (Klik lagi untuk lihat semua)"
          >
            <div className="text-xs font-black text-emerald-600 leading-tight">{close}</div>
            <div className="font-bold text-[8px] text-emerald-600 tracking-wider mt-0.5 uppercase">Done</div>
          </div>
        </div>

        {/* List of Tasks */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-50/30 custom-scrollbar space-y-2.5">
          {loading ? (
            <div className="text-center py-8 font-bold text-slate-500 text-xs">Memuat Daftar Tugas...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-8 font-medium text-slate-500 text-xs">
              {filter === 'priority' ? 'Tidak ada tugas berprioritas tinggi / kedip.' : (filter === 'no' ? 'Tidak ada tugas Todo.' : (filter === 'onproses' ? 'Tidak ada tugas Proses.' : (filter === 'close' ? 'Tidak ada tugas Done.' : 'Belum ada tugas.')))}
            </div>
          ) : (
            filteredTodos.map(t => {
              const isDone = t.status === 'close';
              const isProses = t.status === 'onproses';
              const isTodo = t.status === 'no';
              const isBlinkingActive = (t.priority === 'mendesak' || t.is_blinking) && !isDone;

              return (
                <div 
                  key={t.id} 
                  className={`p-3 flex flex-col gap-2 transition-all border shadow-2xs relative overflow-hidden rounded-2xl ${
                    isBlinkingActive 
                      ? 'animate-todo-blink' 
                      : (isDone 
                          ? 'opacity-70 bg-slate-50 border-slate-200' 
                          : 'bg-white hover:bg-slate-50/80 border-slate-200'
                        )
                  }`}
                >
                  {/* Top Bar Card: Priority Badge & Actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div onClick={() => handleOpenEditModal(t)} className="cursor-pointer">
                      {renderPriorityBadge(t.priority, t.is_blinking)}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => handleOpenEditModal(t)}
                        className="p-1 rounded-lg text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-all cursor-pointer"
                        title="Edit / Detail Tugas"
                      >
                        <Edit2 size={13} />
                      </button>

                      {isAdmin && (
                        <button 
                          onClick={() => {
                            showConfirm({
                              title: 'Hapus Tugas (Admin)',
                              message: 'Apakah Anda yakin ingin menghapus tugas ini?',
                              confirmText: 'Hapus',
                              cancelText: 'Batal',
                              type: 'danger',
                              onConfirm: () => {
                                onDeleteTodo(t.id);
                                showToast('Dihapus', 'Tugas berhasil dihapus', 'info');
                              }
                            });
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Hapus tugas ini (Admin)"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Task Content */}
                  <div 
                    onClick={() => handleOpenEditModal(t)}
                    className={`font-semibold text-xs leading-relaxed whitespace-pre-wrap break-words cursor-pointer hover:text-orange-600 transition-colors ${
                      isDone ? 'line-through text-slate-400' : (isBlinkingActive ? 'animate-text-blink font-bold' : 'text-slate-800')
                    }`}
                    title="Klik untuk lihat / edit tugas"
                  >
                    {t.task}
                  </div>

                  {/* Bottom Bar: Status Choice & Quick Priority Toggle */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-1">
                    {/* Quick Priority Switcher */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextPriority: TodoPriority = 
                          t.priority === 'rendah' ? 'sedang' :
                          t.priority === 'sedang' ? 'tinggi' :
                          t.priority === 'tinggi' ? 'mendesak' : 'rendah';
                        const isBlink = nextPriority === 'mendesak';
                        if (onUpdateTodo) {
                          onUpdateTodo(t.id, { priority: nextPriority, is_blinking: isBlink });
                        }
                      }}
                      className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                      title="Klik untuk putar Prioritas (Biasa -> Sedang -> Tinggi -> Mendesak)"
                    >
                      <Sparkles size={10} className="text-amber-500" />
                      <span>Prioritas</span>
                    </button>

                    {/* 3 Choice Status Selector */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        onClick={() => onUpdateStatus(t.id, 'no')}
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isTodo 
                            ? 'bg-amber-500 text-white shadow-2xs scale-105' 
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                        title="Ubah status ke Todo"
                      >
                        <Circle size={9} className={isTodo ? 'fill-white' : ''} />
                        <span>Todo</span>
                      </button>

                      <button
                        onClick={() => onUpdateStatus(t.id, 'onproses')}
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isProses 
                            ? 'bg-blue-600 text-white shadow-2xs scale-105' 
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                        title="Ubah status ke Proses"
                      >
                        <Clock size={9} />
                        <span>Proses</span>
                      </button>

                      <button
                        onClick={() => onUpdateStatus(t.id, 'close')}
                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isDone 
                            ? 'bg-emerald-600 text-white shadow-2xs scale-105' 
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                        title="Ubah status ke Done (Selesai)"
                      >
                        <CheckCircle2 size={9} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-2.5 border-t border-slate-200 bg-white flex items-center justify-between gap-2">
          <button 
            onClick={handleTestReminder}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Test Bunyi Nada Pengingat Todo"
          >
            <Volume2 size={12} />
            <span>Test Nada</span>
          </button>

          {isAdmin && close > 0 && onDeleteCompletedTodos && (
            <button 
              onClick={() => {
                showConfirm({
                  title: 'Hapus Tugas Selesai (Admin)',
                  message: `Hapus masal ${close} tugas yang sudah berstatus Done/Selesai?`,
                  confirmText: 'Hapus Selesai',
                  cancelText: 'Batal',
                  type: 'danger',
                  onConfirm: async () => {
                    await onDeleteCompletedTodos();
                    showToast('Selesai', 'Tugas selesai berhasil dibersihkan', 'info');
                  }
                });
              }}
              className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Trash2 size={11} />
              <span>Bersihkan Done ({close})</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Tambah Tugas Baru */}
      {showFormModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden text-left">
            <button 
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 m-0">Tambah Tugas Baru</h3>
                <p className="text-xs text-slate-500 m-0">Tugas akan otomatis disiarkan ke semua perangkat tim</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Tugas:</label>
                <textarea 
                  rows={3}
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Ketik tugas yang perlu dikerjakan..."
                  className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-400 resize-none"
                  autoFocus
                />
              </div>

              {/* Priority Choice */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Tingkat Prioritas:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPriority('rendah');
                      setNewIsBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      newPriority === 'rendah'
                        ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">Biasa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewPriority('sedang');
                      setNewIsBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      newPriority === 'sedang'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold">Sedang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewPriority('tinggi');
                      setNewIsBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      newPriority === 'tinggi'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Flame size={14} />
                    <span className="text-xs font-bold">Tinggi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewPriority('mendesak');
                      setNewIsBlinking(true);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      newPriority === 'mendesak'
                        ? 'bg-red-600 text-white border-red-700 shadow-sm animate-badge-blink'
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    <Zap size={14} className="fill-current" />
                    <span className="text-[10px] font-black uppercase">Mendesak</span>
                  </button>
                </div>
              </div>

              {/* Blinking Checkbox */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-badge-blink">
                    <Zap size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">Animasi Kedip-Kedip Warna</div>
                    <div className="text-[10px] text-slate-500">Tandai tugas dengan warna berkedip mencolok</div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={newIsBlinking} 
                    onChange={(e) => {
                      setNewIsBlinking(e.target.checked);
                      if (e.target.checked && newPriority === 'rendah') {
                        setNewPriority('mendesak');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAdd}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Simpan & Siarkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Form Edit/Detail Tugas */}
      {editingTodo && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden text-left">
            <button 
              onClick={() => setEditingTodo(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
                <Edit2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 m-0">Detail & Edit Tugas</h3>
                <p className="text-xs text-slate-500 m-0">Edit status, prioritas, atau deskripsi tugas</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Isi Tugas:</label>
                <textarea 
                  rows={3}
                  value={editTaskText}
                  onChange={(e) => setEditTaskText(e.target.value)}
                  placeholder="Ketik detail tugas..."
                  className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Tingkat Prioritas:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTaskPriority('rendah');
                      setEditTaskBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      editTaskPriority === 'rendah'
                        ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">Biasa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditTaskPriority('sedang');
                      setEditTaskBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      editTaskPriority === 'sedang'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <AlertCircle size={14} />
                    <span className="text-xs font-bold">Sedang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditTaskPriority('tinggi');
                      setEditTaskBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      editTaskPriority === 'tinggi'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Flame size={14} />
                    <span className="text-xs font-bold">Tinggi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditTaskPriority('mendesak');
                      setEditTaskBlinking(true);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      editTaskPriority === 'mendesak'
                        ? 'bg-red-600 text-white border-red-700 shadow-sm animate-badge-blink'
                        : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    <Zap size={14} className="fill-current" />
                    <span className="text-[10px] font-black uppercase">Mendesak</span>
                  </button>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Status Tugas:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTaskStatus('no')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editTaskStatus === 'no'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Circle size={14} />
                    <span>Todo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditTaskStatus('onproses')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editTaskStatus === 'onproses'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Clock size={14} />
                    <span>Proses</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditTaskStatus('close')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editTaskStatus === 'close'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Done</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
