import { useState } from 'react';
import { ListTodo, X, Plus, RefreshCw, Trash2, BellRing, Volume2 } from 'lucide-react';
import { TodoData } from '../types';

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
  // Default otomatis tab TODO ('no')
  const [filter, setFilter] = useState<'all' | 'no' | 'onproses' | 'close'>('no');
  const [newTask, setNewTask] = useState('');
  const [reminderActive, setReminderActive] = useState(false);

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
    setTimeout(() => setReminderActive(false), 3000);
  };

  const handleAdd = () => {
    if (!newTask.trim()) return;
    onAddTodo(newTask.trim());
    setNewTask('');
  };

  const cycleStatus = (todo: TodoData) => {
    const idx = STATUS_CYCLE.indexOf(todo.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onUpdateStatus(todo.id, next);
  };

  return (
    <>
      <div 
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[400px] lg:w-[360px] xl:w-[400px] bg-white/60 backdrop-blur-xl border-l border-white/40 flex flex-col transition-transform duration-500 ease-in-out z-[90] shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-between items-center p-6 border-b border-white/40 bg-white/40">
          <h5 className="m-0 font-extrabold text-slate-800 flex items-center gap-3 text-base uppercase">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-600 flex items-center justify-center border border-orange-500/30 shadow-sm"><ListTodo size={20} /></div> 
            Public Todo
          </h5>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleTestReminder}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                reminderActive 
                  ? 'bg-orange-500 text-white border-orange-600 scale-105 shadow-md' 
                  : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 border-orange-500/30'
              }`}
              title="Bunyikan Nada Pengingat Todo"
            >
              <BellRing size={14} className={reminderActive ? 'animate-bounce' : ''} />
              <span>{pendingCount} Pending</span>
            </button>

            <button onClick={onToggle} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-slate-600 hover:text-slate-900 border border-white/60 shadow-sm hover:scale-105 transition-all cursor-pointer">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex p-6 border-b border-white/40 gap-3 bg-transparent">
          <div 
            onClick={() => setFilter('no')}
            className={`flex-1 rounded-2xl border shadow-sm p-4 text-center cursor-pointer transition-all ${filter === 'no' ? 'bg-orange-500/15 border-orange-500/40 ring-2 ring-orange-400' : 'bg-white/50 border-white/60'}`}
          >
            <div className="text-2xl font-black text-slate-800">{no}</div>
            <div className="font-bold uppercase text-[10px] text-slate-600 tracking-widest mt-1">Todo</div>
          </div>
          <div 
            onClick={() => setFilter('onproses')}
            className={`flex-1 rounded-2xl border shadow-sm p-4 text-center cursor-pointer transition-all ${filter === 'onproses' ? 'bg-blue-900/20 border-blue-900/40 ring-2 ring-blue-800' : 'bg-blue-900/10 border-blue-900/20'}`}
          >
            <div className="text-2xl font-black text-blue-900">{onproses}</div>
            <div className="font-bold uppercase text-[10px] text-blue-900 tracking-widest mt-1">Proses</div>
          </div>
          <div 
            onClick={() => setFilter('close')}
            className={`flex-1 rounded-2xl border shadow-sm p-4 text-center cursor-pointer transition-all ${filter === 'close' ? 'bg-emerald-500/25 border-emerald-500/40 ring-2 ring-emerald-500' : 'bg-emerald-500/10 border-emerald-500/20'}`}
          >
            <div className="text-2xl font-black text-emerald-700">{close}</div>
            <div className="font-bold uppercase text-[10px] text-emerald-600 tracking-widest mt-1">Done</div>
          </div>
        </div>

        {/* Form Tambah Tugas Baru dengan Textarea agar muat teks panjang */}
        <div className="p-6 border-b border-white/40 bg-white/20">
          <label className="block text-[11px] font-black uppercase text-slate-600 mb-2 tracking-wider">
            Tambah Tugas Baru (Form Multi-Baris):
          </label>
          <div className="flex flex-col gap-2">
            <textarea 
              rows={3}
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Ketik tugas di sini... BISA PANJANG & BISA DILIPAT BARIS"
              className="w-full bg-white/80 text-slate-800 border border-white/80 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-orange-400 outline-none transition-all shadow-sm placeholder:text-slate-400 resize-y min-h-[70px]"
            />
            <div className="flex justify-end gap-2">
              {newTask.trim() && (
                <button 
                  onClick={() => setNewTask('')} 
                  className="glass-btn !bg-slate-200 hover:!bg-slate-300 !text-slate-700 !rounded-xl !py-2 !px-3 text-xs"
                >
                  Bersihkan
                </button>
              )}
              <button 
                onClick={handleAdd} 
                className="glass-btn !bg-orange-500 hover:!bg-orange-600 !text-white !rounded-xl !py-2 !px-4 flex items-center gap-1 text-xs font-bold shadow-md"
              >
                <Plus size={16} /> SIMPAN TUGAS
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-white/40 flex justify-between items-center bg-white/30 gap-2 flex-wrap">
          <div className="flex gap-1.5">
            <button onClick={() => setFilter('all')} className={`glass-btn !py-1.5 !px-2.5 !rounded-lg text-[10px] ${filter === 'all' ? '!bg-slate-800 !text-white' : ''}`}>ALL</button>
            <button onClick={() => setFilter('no')} className={`glass-btn !py-1.5 !px-2.5 !rounded-lg text-[10px] ${filter === 'no' ? '!bg-orange-600 !text-white' : ''}`}>TODO</button>
            <button onClick={() => setFilter('onproses')} className={`glass-btn !py-1.5 !px-2.5 !rounded-lg text-[10px] ${filter === 'onproses' ? '!bg-blue-900 !text-white' : ''}`}>PROSES</button>
            <button onClick={() => setFilter('close')} className={`glass-btn !py-1.5 !px-2.5 !rounded-lg text-[10px] ${filter === 'close' ? '!bg-emerald-600 !text-white' : ''}`}>DONE ({close})</button>
          </div>
          
          <div className="flex gap-2 items-center">
            {close > 0 && onDeleteCompletedTodos && (
              <button 
                onClick={onDeleteCompletedTodos}
                title="Hapus masal semua tugas yang sudah selesai (DONE)"
                className="glass-btn !bg-red-500/10 hover:!bg-red-500/20 !text-red-600 !py-1.5 !px-2.5 !rounded-lg flex items-center gap-1 text-[10px] font-bold border border-red-500/20"
              >
                <Trash2 size={13} />
                <span>Hapus Done</span>
              </button>
            )}
            <button onClick={onRefresh} className="glass-btn !p-2 !rounded-lg">
              <RefreshCw size={16} className={loading ? 'animate-spin text-blue-900' : 'text-slate-600'} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-transparent custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 font-bold text-slate-500 uppercase">Memuat Tugas...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-8 font-bold text-slate-500 uppercase">
              {filter === 'no' ? 'Tidak ada tugas TODO.' : (filter === 'onproses' ? 'Tidak ada tugas PROSES.' : (filter === 'close' ? 'Tidak ada tugas DONE.' : 'Kosong.'))}
            </div>
          ) : (
            filteredTodos.map(t => {
              const isDone = t.status === 'close';
              const statusLabel = t.status === 'no' ? 'TODO' : (t.status === 'onproses' ? 'PROSES' : 'DONE');
              
              let statusClasses = '';
              if (t.status === 'no') statusClasses = 'bg-white/60 text-slate-700 border-white/80';
              if (t.status === 'onproses') statusClasses = 'bg-blue-900/20 text-blue-900 border-blue-900/30';
              if (t.status === 'close') statusClasses = 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';

              return (
                <div key={t.id} className={`glass-box p-4 mb-4 flex items-start gap-3 transition-all bg-white/40 hover:bg-white/60 ${isDone ? 'opacity-60' : ''}`}>
                  <div 
                    onClick={() => cycleStatus(t)} 
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 transition-colors shadow-sm mt-0.5 ${isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white/80 border-white text-transparent'}`}
                  >
                    {isDone && <span className="font-black text-xs">✔</span>}
                  </div>
                  
                  <div className={`flex-1 font-semibold text-xs text-slate-800 leading-relaxed whitespace-pre-wrap break-words ${isDone ? 'line-through text-slate-500' : ''}`}>
                    {t.task}
                  </div>
                  
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <button 
                      onClick={() => cycleStatus(t)}
                      className={`border px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-sm ${statusClasses}`}
                    >
                      {statusLabel}
                    </button>

                    <button 
                      onClick={() => onDeleteTodo(t.id)}
                      className="glass-btn !bg-red-500/10 hover:!bg-red-500/20 text-red-600 !p-1.5 !rounded-lg"
                      title="Hapus tugas ini"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div 
        className={`fixed top-1/2 -translate-y-1/2 z-[95] transition-all duration-500 ease-in-out ${isOpen ? 'right-[100vw] sm:right-[400px] lg:right-[360px] xl:right-[400px]' : 'right-0'}`}
      >
        <button 
          onClick={onToggle}
          className="glass-box !bg-orange-500/80 backdrop-blur-md !rounded-l-2xl !rounded-r-none !border-r-0 !text-white hover:!bg-orange-500 w-12 h-32 flex flex-col items-center justify-center font-bold text-[12px] tracking-widest uppercase transition-all shadow-lg"
        >
          <ListTodo size={20} className="mb-2" />
          <span style={{ writingMode: 'vertical-lr' }}>TODO</span>
        </button>
      </div>
    </>
  );
}
