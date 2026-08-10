import { useState } from 'react';
import { ListTodo, X, Plus, RefreshCw, Trash2, BellRing, Volume2, ChevronLeft } from 'lucide-react';
import { TodoData } from '../types';
import { useNotification } from '../context/NotificationContext';

interface SidebarProps {
  todos: TodoData[];
  loading: boolean;
  isAdmin: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onAddTodo: (task: string) => void;
  onUpdateStatus: (id: string, status: TodoData['status']) => void;
  onDeleteTodo: (id: string) => void;
  onDeleteCompletedTodos?: () => void;
  onRefresh: () => void;
}

const STATUS_CYCLE: TodoData['status'][] = ['no', 'onproses', 'close'];

export function Sidebar({ todos, loading, isAdmin, isOpen, onToggle, onAddTodo, onUpdateStatus, onDeleteTodo, onDeleteCompletedTodos, onRefresh }: SidebarProps) {
  const { showConfirm, showToast } = useNotification();
  // Default otomatis tab TODO ('no')
  const [filter, setFilter] = useState<'all' | 'no' | 'onproses' | 'close'>('no');
  const [newTask, setNewTask] = useState('');
  const [reminderActive, setReminderActive] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);

  const filteredTodos = todos.filter(t => filter === 'all' || t.status === filter).reverse();
  
  const no = todos.filter(t => t.status === 'no').length;
  const onproses = todos.filter(t => t.status === 'onproses').length;
  const close = todos.filter(t => t.status === 'close').length;
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
    setShowReminderModal(true);
    setTimeout(() => setReminderActive(false), 3000);
  };

  const handleAdd = () => {
    if (!newTask.trim()) {
      showToast('Perhatian', 'Silakan ketik isi tugas terlebih dahulu', 'warning');
      return;
    }
    onAddTodo(newTask.trim());
    showToast('Tersimpan', 'Tugas baru berhasil ditambahkan', 'success');
    setNewTask('');
    setShowFormModal(false);
  };

  const cycleStatus = (todo: TodoData) => {
    const idx = STATUS_CYCLE.indexOf(todo.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onUpdateStatus(todo.id, next);
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-2xs z-[85] lg:hidden transition-opacity duration-300 cursor-pointer"
          onClick={onToggle}
          title="Klik untuk menutup Todo sidebar"
        />
      )}
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[380px] lg:w-[360px] xl:w-[380px] bg-white/70 backdrop-blur-xl border-l border-white/40 flex flex-col transition-transform duration-400 ease-in-out z-[90] shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-white/40 bg-white/40">
          <h5 className="m-0 font-bold text-slate-800 flex items-center gap-2.5 text-base">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center border border-orange-500/30 shadow-sm"><ListTodo size={18} /></div> 
            Public Todo
          </h5>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleTestReminder}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                reminderActive 
                  ? 'bg-orange-500 text-white border-orange-600 scale-105 shadow-md' 
                  : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 border-orange-500/30'
              }`}
              title="Bunyikan Nada Pengingat Todo"
            >
              <BellRing size={13} className={reminderActive ? 'animate-bounce' : ''} />
              <span>{pendingCount} Pending</span>
            </button>

            <button onClick={onToggle} className="w-9 h-9 rounded-xl bg-white/50 flex items-center justify-center text-slate-600 hover:text-slate-900 border border-white/60 shadow-sm hover:scale-105 transition-all cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* KPI Summary Cards - Made significantly smaller & compact */}
        <div className="flex p-3 sm:p-4 border-b border-white/40 gap-2.5 bg-transparent">
          <div 
            onClick={() => setFilter('no')}
            className={`flex-1 rounded-xl border shadow-2xs p-2.5 text-center cursor-pointer transition-all ${filter === 'no' ? 'bg-orange-500/15 border-orange-500/40 ring-2 ring-orange-400' : 'bg-white/50 border-white/60'}`}
          >
            <div className="text-lg font-black text-slate-800 leading-tight">{no}</div>
            <div className="font-bold text-[9px] text-slate-600 tracking-wider mt-0.5">Todo</div>
          </div>
          <div 
            onClick={() => setFilter('onproses')}
            className={`flex-1 rounded-xl border shadow-2xs p-2.5 text-center cursor-pointer transition-all ${filter === 'onproses' ? 'bg-blue-900/20 border-blue-900/40 ring-2 ring-blue-800' : 'bg-blue-900/10 border-blue-900/20'}`}
          >
            <div className="text-lg font-black text-blue-900 leading-tight">{onproses}</div>
            <div className="font-bold text-[9px] text-blue-900 tracking-wider mt-0.5">Proses</div>
          </div>
          <div 
            onClick={() => setFilter('close')}
            className={`flex-1 rounded-xl border shadow-2xs p-2.5 text-center cursor-pointer transition-all ${filter === 'close' ? 'bg-emerald-500/25 border-emerald-500/40 ring-2 ring-emerald-500' : 'bg-emerald-500/10 border-emerald-500/20'}`}
          >
            <div className="text-lg font-black text-emerald-700 leading-tight">{close}</div>
            <div className="font-bold text-[9px] text-emerald-600 tracking-wider mt-0.5">Done</div>
          </div>
        </div>

        {/* Action Bar: Tombol Tambah Tugas + Filter Buttons */}
        <div className="px-4 py-3 border-b border-white/40 flex flex-col gap-2.5 bg-white/30">
          <button 
            onClick={() => setShowFormModal(true)} 
            className="glass-btn !bg-orange-500 hover:!bg-orange-600 !text-white !rounded-xl !py-2.5 !px-4 flex items-center justify-center gap-2 text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Plus size={16} /> Tambah Tugas Baru
          </button>

          <div className="flex justify-between items-center gap-1.5 flex-wrap">
            <div className="flex gap-1">
              <button onClick={() => setFilter('all')} className={`glass-btn !py-1 !px-2 !rounded-lg text-[10px] ${filter === 'all' ? '!bg-slate-800 !text-white' : ''}`}>Semua</button>
              <button onClick={() => setFilter('no')} className={`glass-btn !py-1 !px-2 !rounded-lg text-[10px] ${filter === 'no' ? '!bg-orange-600 !text-white' : ''}`}>Todo</button>
              <button onClick={() => setFilter('onproses')} className={`glass-btn !py-1 !px-2 !rounded-lg text-[10px] ${filter === 'onproses' ? '!bg-blue-900 !text-white' : ''}`}>Proses</button>
              <button onClick={() => setFilter('close')} className={`glass-btn !py-1 !px-2 !rounded-lg text-[10px] ${filter === 'close' ? '!bg-emerald-600 !text-white' : ''}`}>Done ({close})</button>
            </div>
            
            <div className="flex gap-1.5 items-center">
              {close > 0 && onDeleteCompletedTodos && (
                <button 
                  onClick={() => {
                    showConfirm({
                      title: 'Hapus Tugas Selesai',
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
                  title="Hapus masal semua tugas yang sudah selesai (Done)"
                  className="glass-btn !bg-red-500/10 hover:!bg-red-500/20 !text-red-600 !py-1 !px-2 !rounded-lg flex items-center gap-1 text-[10px] font-bold border border-red-500/20"
                >
                  <Trash2 size={12} />
                  <span>Hapus Done</span>
                </button>
              )}
              <button onClick={onRefresh} className="glass-btn !p-1.5 !rounded-lg" title="Refresh">
                <RefreshCw size={14} className={loading ? 'animate-spin text-blue-900' : 'text-slate-600'} />
              </button>
            </div>
          </div>
        </div>

        {/* List Task - Positioned significantly higher now */}
        <div className="flex-1 overflow-auto p-4 sm:p-5 bg-transparent custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 font-bold text-slate-500 text-xs">Memuat Daftar Tugas...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-8 font-medium text-slate-500 text-xs">
              {filter === 'no' ? 'Tidak ada tugas Todo.' : (filter === 'onproses' ? 'Tidak ada tugas Proses.' : (filter === 'close' ? 'Tidak ada tugas Done.' : 'Belum ada tugas.'))}
            </div>
          ) : (
            filteredTodos.map(t => {
              const isDone = t.status === 'close';
              const statusLabel = t.status === 'no' ? 'Todo' : (t.status === 'onproses' ? 'Proses' : 'Done');
              
              let statusClasses = '';
              if (t.status === 'no') statusClasses = 'bg-white/60 text-slate-700 border-white/80';
              if (t.status === 'onproses') statusClasses = 'bg-blue-900/20 text-blue-900 border-blue-900/30';
              if (t.status === 'close') statusClasses = 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';

              return (
                <div key={t.id} className={`glass-box p-3.5 mb-3 flex items-start gap-3 transition-all bg-white/40 hover:bg-white/60 ${isDone ? 'opacity-60' : ''}`}>
                  <div 
                    onClick={() => cycleStatus(t)} 
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 transition-colors shadow-2xs mt-0.5 ${isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white/80 border-white text-transparent'}`}
                  >
                    {isDone && <span className="font-bold text-[10px]">✔</span>}
                  </div>
                  
                  <div className={`flex-1 font-medium text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words ${isDone ? 'line-through text-slate-500' : ''}`}>
                    {t.task}
                  </div>
                  
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <button 
                      onClick={() => cycleStatus(t)}
                      className={`border px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wider cursor-pointer shadow-2xs ${statusClasses}`}
                    >
                      {statusLabel}
                    </button>

                    <button 
                      onClick={() => {
                        showConfirm({
                          title: 'Hapus Tugas',
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
                      className="glass-btn !bg-red-500/10 hover:!bg-red-500/20 text-red-600 !p-1 !rounded-lg"
                      title="Hapus tugas ini"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Form Tambah Tugas Baru */}
      {showFormModal && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-box !bg-white/95 p-6 sm:p-7 rounded-3xl max-w-md w-full shadow-2xl border border-orange-400 relative overflow-hidden text-left">
            <button 
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md">
                <Plus size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 m-0">Tambah Tugas Baru</h3>
                <p className="text-xs text-slate-500 m-0">Ketik rincian tugas yang ingin dikerjakan</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Tugas / Catatan:</label>
                <textarea 
                  rows={4}
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Ketik tugas di sini... Buka multi-baris jika panjang"
                  className="w-full bg-slate-50 text-slate-800 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-orange-400 outline-none transition-all shadow-inner placeholder:text-slate-400 resize-y min-h-[90px]"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={handleAdd}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus size={16} /> Simpan Tugas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengingat Todo Aktif dari Lonceng */}
      {showReminderModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-box !bg-white/95 p-6 sm:p-7 rounded-3xl max-w-lg w-full shadow-2xl border border-orange-400 relative overflow-hidden text-left">
            <button 
              onClick={() => setShowReminderModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-all cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
              <BellRing size={28} />
            </div>

            <div className="text-center mb-4">
              <span className="text-[10px] font-bold tracking-wider text-orange-700 bg-orange-100 px-3 py-1 rounded-full border border-orange-300 inline-block mb-1">
                Pengingat Todo Aktif
              </span>
              <h3 className="text-lg font-bold text-slate-800 m-0">
                {pendingCount > 0 ? `Ada ${pendingCount} Tugas Pending` : 'Semua Tugas Selesai'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 m-0">
                Bunyi pengingat aktif. Tambah tugas baru atau lihat daftar tugas Anda:
              </p>
            </div>

            {/* Quick Form Tambah Task */}
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="+ Tambah tugas pengingat cepat..." 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAdd();
                  }
                }}
                className="glass-input flex-1 !text-xs !py-2.5 !px-3"
              />
              <button 
                onClick={handleAdd}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all shrink-0 cursor-pointer"
              >
                Tambah
              </button>
            </div>

            {/* List Tugas Pending */}
            <div className="max-h-52 overflow-y-auto my-3 space-y-2 pr-1 custom-scrollbar">
              {todos.filter(t => t.status !== 'close').length === 0 ? (
                <div className="text-center py-6 text-emerald-600 font-bold text-xs bg-emerald-50 rounded-xl border border-emerald-200">
                  🎉 Tidak ada tugas pending saat ini.
                </div>
              ) : (
                todos.filter(t => t.status !== 'close').map(t => (
                  <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <button 
                        onClick={() => cycleStatus(t)}
                        className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center border font-bold text-[10px] transition-all ${
                          t.status === 'onproses' 
                            ? 'bg-blue-900 text-white border-blue-900' 
                            : 'bg-white text-orange-500 border-orange-400 hover:bg-orange-50'
                        }`}
                        title="Klik untuk ubah status"
                      >
                        {t.status === 'onproses' ? 'P' : 'T'}
                      </button>
                      <span className="text-xs text-slate-800 font-medium leading-relaxed break-words">
                        {t.task}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      t.status === 'onproses' ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-orange-100 text-orange-700 border-orange-300'
                    }`}>
                      {t.status === 'onproses' ? 'Proses' : 'Todo'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2.5 justify-center mt-5">
              <button 
                onClick={playChime}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Volume2 size={15} /> Bunyikan Nada
              </button>
              <button 
                onClick={() => setShowReminderModal(false)}
                className="px-6 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`fixed top-3 sm:top-4 right-0 z-[95] transition-all duration-300 ${isOpen ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0'}`}
      >
        <button 
          onClick={onToggle}
          className="glass-box !bg-orange-500/90 hover:!bg-orange-600 backdrop-blur-md text-white !rounded-l-xl !rounded-r-none border-r-0 px-2.5 py-1.5 flex items-center gap-1.5 shadow-lg transition-all hover:pl-3 cursor-pointer group"
          title="Buka Public Todo"
        >
          <ChevronLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
          <ListTodo size={15} />
          <span className="text-xs font-bold pr-1">Todo</span>
        </button>
      </div>
    </>
  );
}
