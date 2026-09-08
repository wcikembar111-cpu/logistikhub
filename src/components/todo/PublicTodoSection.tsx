import React, { useState, useMemo } from 'react';
import { 
  ListTodo, 
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
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  PanelRightOpen,
  X,
  Send,
  User,
  Radio
} from 'lucide-react';
import { TodoData, TodoPriority } from '../../types';
import { useNotification } from '../../context/NotificationContext';

export interface PublicTodoSectionProps {
  todos: TodoData[];
  loading?: boolean;
  isAdmin?: boolean;
  currentUser?: { 
    email?: string; 
    username?: string; 
    nama?: string; 
    nama_lengkap?: string; 
    role?: string; 
  } | null;
  onAddTodo: (task: string, priority?: TodoPriority, isBlinking?: boolean, senderName?: string) => void;
  onUpdateStatus: (id: string, status: TodoData['status']) => void;
  onUpdateTodo?: (id: string, updates: Partial<Omit<TodoData, 'id'>>) => void;
  onDeleteTodo: (id: string) => void;
  onDeleteCompletedTodos?: () => void;
  onOpenDrawer?: () => void;
  onRefresh?: () => void;
}

export function PublicTodoSection({
  todos = [],
  loading = false,
  isAdmin = false,
  currentUser,
  onAddTodo,
  onUpdateStatus,
  onUpdateTodo,
  onDeleteTodo,
  onDeleteCompletedTodos,
  onOpenDrawer,
  onRefresh
}: PublicTodoSectionProps) {
  const { showConfirm, showToast } = useNotification();

  // Collapsible toggle (Default true: langsung terbuka dan terlihat di Halaman Utama)
  const [isExpanded, setIsExpanded] = useState(true);

  // Filters & Search
  const [filter, setFilter] = useState<'all' | 'priority' | 'no' | 'onproses' | 'close'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Quick Add Bar State
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickPriority, setQuickPriority] = useState<TodoPriority>('rendah');
  const [quickBlinking, setQuickBlinking] = useState(false);

  // Full Form Add Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalTaskText, setModalTaskText] = useState('');
  const [modalPriority, setModalPriority] = useState<TodoPriority>('rendah');
  const [modalIsBlinking, setModalIsBlinking] = useState(false);

  // Edit / Detail Modal State
  const [editingTodo, setEditingTodo] = useState<TodoData | null>(null);
  const [editTaskText, setEditTaskText] = useState('');
  const [editTaskStatus, setEditTaskStatus] = useState<TodoData['status']>('no');
  const [editTaskPriority, setEditTaskPriority] = useState<TodoPriority>('rendah');
  const [editTaskBlinking, setEditTaskBlinking] = useState(false);

  const safeTodos = todos || [];

  // Counts
  const totalCount = safeTodos.length;
  const noCount = safeTodos.filter(t => t.status === 'no').length;
  const onprosesCount = safeTodos.filter(t => t.status === 'onproses').length;
  const closeCount = safeTodos.filter(t => t.status === 'close').length;
  const priorityCount = safeTodos.filter(t => (t.priority === 'mendesak' || t.priority === 'tinggi' || t.is_blinking) && t.status !== 'close').length;
  const pendingCount = noCount + onprosesCount;

  // Filtered and Sorted todos
  const filteredTodos = useMemo(() => {
    return safeTodos
      .filter(t => {
        // Status & Priority Filter
        if (filter === 'priority') {
          if (!(t.priority === 'mendesak' || t.priority === 'tinggi' || t.is_blinking)) return false;
        } else if (filter !== 'all') {
          if (t.status !== filter) return false;
        }

        // Search Query Filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTask = t.task.toLowerCase().includes(q);
          const matchSender = t.sender_name?.toLowerCase().includes(q);
          return matchTask || matchSender;
        }

        return true;
      })
      .sort((a, b) => {
        // Uncompleted first, then priority weight, then id/date
        if (a.status === 'close' && b.status !== 'close') return 1;
        if (a.status !== 'close' && b.status === 'close') return -1;

        const aWeight = (a.is_blinking || a.priority === 'mendesak') ? 3 : (a.priority === 'tinggi' ? 2 : (a.priority === 'sedang' ? 1 : 0));
        const bWeight = (b.is_blinking || b.priority === 'mendesak') ? 3 : (b.priority === 'tinggi' ? 2 : (b.priority === 'sedang' ? 1 : 0));
        return bWeight - aWeight;
      });
  }, [safeTodos, filter, searchQuery]);

  // Audio chime feedback
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
      console.error("Gagal memutar nada chime:", e);
    }
  };

  const handleTestReminder = () => {
    playChime();
    showToast('Bunyi Pengingat Todo', 'Nada notifikasi siaran tugas berhasil diputar', 'info');
  };

  const getResolvedSenderName = () => {
    return (
      currentUser?.nama_lengkap || 
      currentUser?.nama || 
      (currentUser?.username ? (currentUser.username.toUpperCase() === 'ADMIN' ? 'Administrator' : currentUser.username) : '') || 
      localStorage.getItem('broadcast_sender_name') || 
      (isAdmin ? 'Admin Logistik' : 'Rekan Logistik')
    );
  };

  // Submit Inline Quick Add
  const handleQuickAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickTaskText.trim()) {
      showToast('Perhatian', 'Ketik deskripsi tugas terlebih dahulu', 'warning');
      return;
    }
    const sender = getResolvedSenderName();
    const isBlink = quickBlinking || quickPriority === 'mendesak';
    onAddTodo(quickTaskText.trim(), quickPriority, isBlink, sender);
    showToast('Tersimpan & Disiarkan', 'Tugas baru berhasil disimpan dan disiarkan ke semua layar!', 'success');
    setQuickTaskText('');
    setQuickPriority('rendah');
    setQuickBlinking(false);
  };

  // Submit Modal Add
  const handleModalAddSubmit = () => {
    if (!modalTaskText.trim()) {
      showToast('Perhatian', 'Isi deskripsi tugas tidak boleh kosong', 'warning');
      return;
    }
    const sender = getResolvedSenderName();
    const isBlink = modalIsBlinking || modalPriority === 'mendesak';
    onAddTodo(modalTaskText.trim(), modalPriority, isBlink, sender);
    showToast('Tersimpan & Disiarkan', 'Tugas baru berhasil disimpan ke server dan disiarkan!', 'success');
    setModalTaskText('');
    setModalPriority('rendah');
    setModalIsBlinking(false);
    setShowAddModal(false);
  };

  // Edit Task
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
    showToast('Tersimpan', 'Tugas berhasil diperbarui di server', 'success');
    setEditingTodo(null);
  };

  // Render Priority Badge
  const renderPriorityBadge = (priority?: TodoPriority, isBlinking?: boolean) => {
    const isMendesak = priority === 'mendesak' || isBlinking;
    if (isMendesak) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border border-red-500 animate-badge-blink shadow-xs">
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
          <span>SEDANG</span>
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
    <section 
      id="public-todo-section"
      className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-hidden mb-6 transition-all"
    >
      {/* 1. Header Section */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-orange-50/70 via-amber-50/40 to-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Left: Section Icon & Titles */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ListTodo size={20} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 m-0 uppercase tracking-tight flex items-center gap-2">
                <span>Public Todo & Tugas Tim</span>
              </h2>
              
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                <Radio size={10} className="text-emerald-600 animate-pulse" />
                <span>Live Supabase</span>
              </span>

              {priorityCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase animate-badge-blink shadow-xs flex items-center gap-1">
                  <Zap size={10} className="fill-current" />
                  <span>{priorityCount} Mendesak Kedip</span>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5 truncate">
              Papan tugas bersama divisi logistik: <strong className="text-slate-700">{pendingCount} aktif</strong> ({noCount} todo, {onprosesCount} proses) &bull; {closeCount} selesai
            </p>
          </div>
        </div>

        {/* Right: Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Buka Form Tambah Tugas Baru"
          >
            <Plus size={14} />
            <span>+ Tambah Tugas</span>
          </button>

          {onOpenDrawer && (
            <button
              type="button"
              onClick={onOpenDrawer}
              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Buka Slide-Over Panel Kanan (Drawer)"
            >
              <PanelRightOpen size={13} className="text-orange-500" />
              <span className="hidden md:inline">Mode Drawer</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shadow-2xs"
              title="Muat Ulang Tugas"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-orange-600' : ''} />
            </button>
          )}

          <button
            type="button"
            onClick={handleTestReminder}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shadow-2xs"
            title="Test Bunyi Nada Alarm Pengingat"
          >
            <Volume2 size={14} className="text-slate-600" />
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all cursor-pointer shadow-2xs"
            title={isExpanded ? 'Kecilkan Tampilan Todo' : 'Buka Tampilan Todo'}
          >
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4 space-y-3.5 bg-slate-50/40">
          
          {/* 2. Fast Inline Quick Add Bar */}
          <form 
            onSubmit={handleQuickAddSubmit}
            className="p-2.5 sm:p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-2"
          >
            <div className="flex-1 flex items-center gap-2 min-w-0 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/80 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-100 transition-all">
              <Plus size={16} className="text-orange-500 shrink-0" />
              <input
                type="text"
                value={quickTaskText}
                onChange={(e) => setQuickTaskText(e.target.value)}
                placeholder="Ketik tugas baru untuk disiarkan ke tim logistik... (Tekan Enter)"
                className="w-full bg-transparent text-xs font-medium text-slate-800 outline-none placeholder:text-slate-400"
              />
              {quickTaskText && (
                <button
                  type="button"
                  onClick={() => setQuickTaskText('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Priority & Blinking Options */}
            <div className="flex items-center gap-1.5 flex-wrap justify-between sm:justify-start">
              {/* Priority Selector Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setQuickPriority('rendah');
                    setQuickBlinking(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    quickPriority === 'rendah' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Biasa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickPriority('sedang');
                    setQuickBlinking(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    quickPriority === 'sedang' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sedang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickPriority('tinggi');
                    setQuickBlinking(false);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                    quickPriority === 'tinggi' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Tinggi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickPriority('mendesak');
                    setQuickBlinking(true);
                  }}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-0.5 ${
                    quickPriority === 'mendesak' ? 'bg-red-600 text-white shadow-2xs animate-badge-blink' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Zap size={10} className="fill-current" />
                  <span>Kedip</span>
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Send size={12} />
                <span>Siarkan</span>
              </button>
            </div>
          </form>

          {/* 3. Filter KPI Tabs & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* KPI Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <span>Semua</span>
                <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${filter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {totalCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('priority')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  filter === 'priority'
                    ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                    : 'bg-white hover:bg-red-50 text-red-600 border-slate-200'
                }`}
              >
                <Zap size={12} className="fill-current" />
                <span>Kedip / Mendesak</span>
                <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${filter === 'priority' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                  {priorityCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('no')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  filter === 'no'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                    : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                }`}
              >
                <Circle size={11} className={filter === 'no' ? 'fill-white' : 'text-amber-500'} />
                <span>Todo</span>
                <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${filter === 'no' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                  {noCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('onproses')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  filter === 'onproses'
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-white hover:bg-blue-50 text-blue-700 border-slate-200'
                }`}
              >
                <Clock size={11} />
                <span>Proses</span>
                <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${filter === 'onproses' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>
                  {onprosesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilter('close')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border flex items-center gap-1.5 shrink-0 ${
                  filter === 'close'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border-slate-200'
                }`}
              >
                <CheckCircle2 size={11} />
                <span>Done</span>
                <span className={`px-1.5 py-0.2 text-[9px] rounded-full font-black ${filter === 'close' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                  {closeCount}
                </span>
              </button>
            </div>

            {/* Search Input Box */}
            <div className="relative min-w-[200px] sm:min-w-[240px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari tugas / pengirim..."
                className="w-full bg-white text-xs font-medium text-slate-800 pl-8 pr-7 py-1.5 rounded-xl border border-slate-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-200 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* 4. Task Grid Cards */}
          {loading ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200/80">
              <RefreshCw size={24} className="animate-spin text-orange-500 mx-auto mb-2" />
              <div className="font-bold text-slate-700 text-xs">Menyinkronkan Public Todo Realtime...</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Memuat data dari Supabase</div>
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-2.5">
                <ListTodo size={24} />
              </div>
              <p className="text-xs font-bold text-slate-700 m-0">
                {searchQuery 
                  ? `Tidak ada tugas yang cocok dengan "${searchQuery}"`
                  : filter === 'priority' 
                  ? 'Tidak ada tugas prioritas tinggi atau kedip saat ini.'
                  : filter === 'no'
                  ? 'Semua tugas Todo sudah mulai dikerjakan!'
                  : filter === 'onproses'
                  ? 'Tidak ada tugas yang sedang dalam proses pengerjaan.'
                  : filter === 'close'
                  ? 'Belum ada tugas yang selesai.'
                  : 'Belum ada tugas dalam daftar.'
                }
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Gunakan baris di atas untuk menambah tugas baru bagi tim logistik.
              </p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="mt-3 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-2xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Tambah Tugas Baru
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredTodos.map((t) => {
                const isDone = t.status === 'close';
                const isProses = t.status === 'onproses';
                const isTodo = t.status === 'no';
                const isBlinkingActive = (t.priority === 'mendesak' || t.is_blinking) && !isDone;

                return (
                  <div
                    key={t.id}
                    className={`flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-200 relative overflow-hidden group shadow-2xs ${
                      isBlinkingActive
                        ? 'animate-todo-blink'
                        : isDone
                        ? 'opacity-75 bg-slate-50/80 border-slate-200 hover:opacity-100'
                        : isProses
                        ? 'bg-white border-blue-200 ring-1 ring-blue-100 hover:shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Top Bar Card: Priority & Action Buttons */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div 
                          onClick={() => handleOpenEditModal(t)} 
                          className="cursor-pointer"
                          title="Klik untuk ubah prioritas atau detail tugas"
                        >
                          {renderPriorityBadge(t.priority, t.is_blinking)}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Sender Pill */}
                          {t.sender_name && (
                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md truncate max-w-[120px] inline-flex items-center gap-1">
                              <User size={9} className="text-slate-400" />
                              <span>{t.sender_name}</span>
                            </span>
                          )}

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Edit / Detail Tugas"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Delete Button (Admin Only or user author) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                showConfirm({
                                  title: 'Hapus Tugas',
                                  message: 'Apakah Anda yakin ingin menghapus tugas ini dari papan bersama?',
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
                              title="Hapus tugas ini"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Main Task Description */}
                      <div
                        onClick={() => handleOpenEditModal(t)}
                        className={`font-semibold text-xs leading-relaxed whitespace-pre-wrap break-words cursor-pointer hover:text-orange-600 transition-colors py-1 ${
                          isDone 
                            ? 'line-through text-slate-400' 
                            : isBlinkingActive 
                            ? 'animate-text-blink font-bold' 
                            : 'text-slate-800'
                        }`}
                        title="Klik untuk mengedit detail tugas"
                      >
                        {t.task}
                      </div>
                    </div>

                    {/* Bottom Card Controls: Priority Switcher & 3-Step Status Bar */}
                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                      {/* Priority Cycle Button */}
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
                        className="text-[9px] font-bold px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer flex items-center gap-1"
                        title="Ganti Prioritas Cepat"
                      >
                        <Sparkles size={10} className="text-amber-500" />
                        <span className="hidden sm:inline">Ubah</span> Prioritas
                      </button>

                      {/* 3 Status Buttons: Todo | Proses | Done */}
                      <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(t.id, 'no')}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isTodo 
                              ? 'bg-amber-500 text-white shadow-2xs font-extrabold' 
                              : 'text-slate-600 hover:bg-slate-200/70'
                          }`}
                          title="Tandai Belum Dikerjakan (Todo)"
                        >
                          <Circle size={8} className={isTodo ? 'fill-white' : ''} />
                          <span>Todo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateStatus(t.id, 'onproses')}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isProses 
                              ? 'bg-blue-600 text-white shadow-2xs font-extrabold' 
                              : 'text-slate-600 hover:bg-slate-200/70'
                          }`}
                          title="Tandai Sedang Diproses"
                        >
                          <Clock size={8} />
                          <span>Proses</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onUpdateStatus(t.id, 'close')}
                          className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isDone 
                              ? 'bg-emerald-600 text-white shadow-2xs font-extrabold' 
                              : 'text-slate-600 hover:bg-slate-200/70'
                          }`}
                          title="Tandai Selesai (Done)"
                        >
                          <CheckCircle2 size={8} />
                          <span>Done</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 5. Footer Actions: Bersihkan Selesai & Test Nada */}
          <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Semua pembaruan tersinkronisasi langsung ke seluruh workstation</span>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && closeCount > 0 && onDeleteCompletedTodos && (
                <button
                  type="button"
                  onClick={() => {
                    showConfirm({
                      title: 'Bersihkan Tugas Selesai (Admin)',
                      message: `Hapus sekaligus ${closeCount} tugas yang sudah berstatus Done/Selesai?`,
                      confirmText: 'Hapus Selesai',
                      cancelText: 'Batal',
                      type: 'danger',
                      onConfirm: async () => {
                        await onDeleteCompletedTodos();
                        showToast('Selesai', 'Tugas selesai berhasil dibersihkan', 'info');
                      }
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                  title="Hapus semua tugas yang sudah selesai"
                >
                  <Trash2 size={11} />
                  <span>Bersihkan Selesai ({closeCount})</span>
                </button>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODAL 1: Tambah Tugas Baru (Lengkap) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden text-left">
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 m-0">Tambah Tugas Public Todo</h3>
                <p className="text-xs text-slate-500 m-0">Tugas akan otomatis disiarkan ke semua layar tim</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Tugas:</label>
                <textarea 
                  rows={3}
                  value={modalTaskText}
                  onChange={(e) => setModalTaskText(e.target.value)}
                  placeholder="Ketik tugas yang perlu dikerjakan oleh tim logistik..."
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
                      setModalPriority('rendah');
                      setModalIsBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      modalPriority === 'rendah'
                        ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold">Biasa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalPriority('sedang');
                      setModalIsBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      modalPriority === 'sedang'
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
                      setModalPriority('tinggi');
                      setModalIsBlinking(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      modalPriority === 'tinggi'
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
                      setModalPriority('mendesak');
                      setModalIsBlinking(true);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      modalPriority === 'mendesak'
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
                    <div className="text-[10px] text-slate-500">Tandai tugas dengan highlight berkedip mencolok</div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={modalIsBlinking} 
                    onChange={(e) => {
                      setModalIsBlinking(e.target.checked);
                      if (e.target.checked && modalPriority === 'rendah') {
                        setModalPriority('mendesak');
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
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleModalAddSubmit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Simpan & Siarkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit & Detail Tugas */}
      {editingTodo && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden text-left">
            <button 
              type="button"
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
                <p className="text-xs text-slate-500 m-0">Perbarui status, prioritas, atau deskripsi tugas</p>
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
    </section>
  );
}
