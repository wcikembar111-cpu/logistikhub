import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { LinkData } from '../types';

interface LinkGridProps {
  links: LinkData[];
  loading: boolean;
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (link: LinkData) => void;
  onDelete: (id: string) => void;
}

const BG_COLORS = ['bg-orange-500/20 text-orange-600', 'bg-blue-900/20 text-blue-900', 'bg-white/40 text-slate-700', 'bg-indigo-500/20 text-indigo-600'];

export function LinkGrid({ links, loading, isAdmin, onAdd, onEdit, onDelete }: LinkGridProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const categories = useMemo(() => {
    const cats = new Set<string>();
    links.forEach(l => {
      if (l.category) cats.add(l.category.toUpperCase());
    });
    return ['All', ...Array.from(cats)];
  }, [links]);

  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      const catMatch = category === 'All' || (l.category || '').toUpperCase() === category;
      const searchMatch = l.title.toLowerCase().includes(search.toLowerCase()) || 
                          (l.category || '').toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [links, category, search]);

  return (
    <>
      <div className="glass-box flex items-center mb-6 p-2 !rounded-full bg-white/40 border border-white/60 focus-within:border-blue-400 focus-within:bg-white/70 focus-within:shadow-lg transition-all duration-300">
        <div className="pl-4 pr-2 text-slate-500 flex items-center">
          <Search size={22} className="transition-transform duration-300 group-focus-within:scale-110" />
        </div>
        <input 
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="CARI APLIKASI ATAU SISTEM..." 
          className="flex-1 border-none bg-transparent py-3 px-2 text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 uppercase"
        />
      </div>

      <div className="flex justify-center gap-3 mb-8 flex-wrap">
        {categories.map(cat => {
          const count = cat === 'All' ? links.length : links.filter(l => (l.category || '').toUpperCase() === cat).length;
          const isActive = category === cat;
          return (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)} 
              className={`glass-btn !rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${isActive ? '!bg-blue-900 !text-white !border-blue-800 shadow-md' : 'hover:shadow-md'}`}
            >
              {cat === 'All' ? 'SEMUA' : cat} <span className={`glass-badge ml-2 ${isActive ? '!bg-white/20 !text-white !border-white/30' : ''}`}>{count}</span>
            </button>
          );
        })}
        {isAdmin && (
          <button onClick={onAdd} className="glass-btn !bg-orange-500/80 !text-white hover:!bg-orange-500 !border-orange-400 !px-5 !rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md">
            <Plus size={18} /> TAMBAH APLIKASI
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 m-0 uppercase drop-shadow-sm">
          {category === 'All' ? 'SEMUA APLIKASI' : `${category} APLIKASI`}
        </h2>
        <div className="bg-white/50 border border-white/60 shadow-sm rounded-full px-5 py-2 font-bold text-xs text-blue-900 uppercase tracking-widest backdrop-blur-sm">
          {filteredLinks.length} ITEM
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
        {loading ? (
          <div className="col-span-full text-center py-12 glass-box font-bold text-slate-500 uppercase text-lg">
            Memuat Data...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="col-span-full text-center py-12 glass-box font-bold text-slate-500 uppercase text-lg">
            Tidak Ditemukan
          </div>
        ) : (
          filteredLinks.map((l, index) => {
            const isEmoji = l.icon && !l.icon.startsWith('fa');
            const iconBg = BG_COLORS[index % BG_COLORS.length];
            
            return (
              <div 
                key={l.id} 
                className="glass-box p-6 flex flex-col relative transition-all duration-300 ease-out hover:-translate-y-2.5 hover:scale-[1.02] hover:shadow-2xl hover:bg-white/80 hover:border-blue-300/80 cursor-pointer group bg-white/30 overflow-hidden"
              >
                {/* Visual shine gradient effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/0 via-white/20 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0 shadow-sm backdrop-blur-md border border-white/60 ${iconBg} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md`}>
                    {isEmoji ? <span className="drop-shadow-sm transition-transform duration-300 group-hover:scale-110">{l.icon}</span> : <i className={`${l.icon || 'fas fa-link'} transition-transform duration-300 group-hover:scale-110`} />}
                  </div>

                  <div className="flex items-center gap-2">
                    {!isAdmin && (
                      <div className="w-9 h-9 rounded-xl bg-blue-900/10 text-blue-900 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center group-hover:translate-x-0 group-hover:translate-y-0 translate-x-1 -translate-y-1">
                        <ExternalLink size={18} />
                      </div>
                    )}
                    
                    {isAdmin && (
                      <div className="hidden group-hover:flex gap-2 z-10">
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(l); }} 
                          className="glass-btn !p-3 !rounded-xl !bg-blue-900/10 hover:!bg-blue-900/20 !text-blue-900 transition-transform duration-200 hover:scale-110"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(l.id); }} 
                          className="glass-btn !p-3 !rounded-xl !bg-red-500/10 hover:!bg-red-500/20 !text-red-600 transition-transform duration-200 hover:scale-110"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-w-0 relative z-10">
                  <h4 className="font-extrabold text-xl text-slate-800 m-0 mb-1 truncate uppercase transition-colors duration-300 group-hover:text-blue-900">
                    {l.title}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 m-0 mb-4 truncate uppercase transition-colors duration-300 group-hover:text-slate-700">
                    {l.category}
                  </p>
                  
                  <div className="mt-auto pt-2">
                    {l.subcategory && (
                      <span className="px-3 py-1.5 bg-white/60 border border-white/80 text-orange-600 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all duration-300 group-hover:bg-orange-500 group-hover:text-white group-hover:border-orange-400">
                        {l.subcategory}
                      </span>
                    )}
                  </div>
                </div>
                
                <a href={l.url} target="_blank" rel="noreferrer" className="absolute inset-0 z-0 rounded-3xl"></a>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
