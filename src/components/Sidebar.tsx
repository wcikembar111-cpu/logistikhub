import { useState } from 'react';
import { ListTodo, X, Plus, RefreshCw } from 'lucide-react';
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
  onRefresh: () => void;
}

const STATUS_CYCLE: TodoData['status'][] = ['no', 'onproses', 'close'];

export function Sidebar({ todos, loading, isAdmin, isOpen, onToggle, onAddTodo, onUpdateStatus, onDeleteTodo, onRefresh }: SidebarProps) {
  const [filter, setFilter] = useState<'all' | 'no' | 'onproses' | 'close'>('all');
  const [newTask, setNewTask] = useState('');

  const filteredTodos = todos.filter(t => filter === 'all' || t.status === filter).reverse();
  
  const no = todos.filter(t => t.status === 'no').length;
  const onproses = todos.filter(t => t.status === 'onproses').length;
  const close = todos.filter(t => t.status === 'close').length;

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
          <button onClick={onToggle} className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-slate-600 hover:text-slate-900 border border-white/60 shadow-sm hover:scale-105 transition-all cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="flex p-6 border-b border-white/40 gap-3 bg-transparent">
          <div className="flex-1 rounded-2xl bg-white/50 border border-white/60 shadow-sm p-4 text-center">
            <div className="text-2xl font-black text-slate-700">{no}</div>
            <div className="font-bold uppercase text-[10px] text-slate-500 tracking-widest mt-1">Todo</div>
          </div>
          <div className="flex-1 rounded-2xl bg-sky-500/10 border border-sky-500/20 shadow-sm p-4 text-center">
            <div className="text-2xl font-black text-sky-700">{onproses}</div>
            <div className="font-bold uppercase text-[10px] text-sky-600 tracking-widest mt-1">Proses</div>
          </div>
          <div className="flex-1 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm p-4 text-center">
            <div className="text-2xl font-black text-emerald-700">{close}</div>
            <div className="font-bold uppercase text-[10px] text-emerald-600 tracking-widest mt-1">Done</div>
          </div>
        </div>

        <div className="p-6 border-b border-white/40 bg-white/20">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="KETIK TUGAS BARU..."
              className="flex-1 bg-white/70 text-slate-800 border border-white/80 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-orange-400 outline-none transition-all shadow-sm placeholder:text-slate-400"
            />
            <button onClick={handleAdd} className="glass-btn !bg-orange-500/80 hover:!bg-orange-500 !text-white !rounded-xl !px-4">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-white/40 flex justify-between bg-white/30">
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`glass-btn !py-2 !px-3 !rounded-lg text-[10px] ${filter === 'all' ? '!bg-slate-800 !text-white' : ''}`}>ALL</button>
            <button onClick={() => setFilter('no')} className={`glass-btn !py-2 !px-3 !rounded-lg text-[10px] ${filter === 'no' ? '!bg-slate-800 !text-white' : ''}`}>TODO</button>
            <button onClick={() => setFilter('onproses')} className={`glass-btn !py-2 !px-3 !rounded-lg text-[10px] ${filter === 'onproses' ? '!bg-slate-800 !text-white' : ''}`}>PROSES</button>
            <button onClick={() => setFilter('close')} className={`glass-btn !py-2 !px-3 !rounded-lg text-[10px] ${filter === 'close' ? '!bg-slate-800 !text-white' : ''}`}>DONE</button>
          </div>
          <div className="flex gap-2">
            <button onClick={onRefresh} className="glass-btn !p-2 !rounded-lg">
              <RefreshCw size={16} className={loading ? 'animate-spin text-sky-500' : 'text-slate-600'} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-transparent custom-scrollbar">
          {loading ? (
            <div className="text-center py-8 font-bold text-slate-500 uppercase">Memuat Tugas...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center py-8 font-bold text-slate-500 uppercase">Kosong.</div>
          ) : (
            filteredTodos.map(t => {
              const isDone = t.status === 'close';
              const statusLabel = t.status === 'no' ? 'TODO' : (t.status === 'onproses' ? 'PROSES' : 'DONE');
              
              let statusClasses = '';
              if (t.status === 'no') statusClasses = 'bg-white/60 text-slate-600 border-white/80';
              if (t.status === 'onproses') statusClasses = 'bg-sky-500/20 text-sky-700 border-sky-500/30';
              if (t.status === 'close') statusClasses = 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30';

              return (
                <div key={t.id} className={`glass-box p-4 mb-4 flex items-center gap-3 transition-all bg-white/40 hover:bg-white/60 ${isDone ? 'opacity-60' : ''}`}>
                  <div 
                    onClick={() => cycleStatus(t)} 
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer shrink-0 transition-colors shadow-sm ${isDone ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white/80 border-white text-transparent'}`}
                  >
                    {isDone && <span className="font-black text-sm">✔</span>}
                  </div>
                  
                  <div className={`flex-1 font-bold text-sm text-slate-800 ${isDone ? 'line-through text-slate-500' : ''}`}>
                    {t.task}
                  </div>
                  
                  <button 
                    onClick={() => cycleStatus(t)}
                    className={`border px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm ${statusClasses}`}
                  >
                    {statusLabel}
                  </button>

                  <button 
                    onClick={() => onDeleteTodo(t.id)}
                    className="glass-btn !bg-red-500/10 hover:!bg-red-500/20 text-red-600 !p-2 !rounded-lg"
                  >
                    <X size={16} />
                  </button>
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
