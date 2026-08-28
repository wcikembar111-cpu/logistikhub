import React, { useState, useMemo, useEffect, DragEvent } from 'react';
import { Search, Plus, Edit2, Trash2, ExternalLink, Move, ChevronLeft, ChevronRight, Check, LayoutGrid, Sparkles, X, Users, ShieldCheck } from 'lucide-react';
import { LinkData } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useMenuOrder } from '../hooks/useSupabase';

interface LinkGridProps {
  links: LinkData[];
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  onAdd: () => void;
  onEdit: (link: LinkData) => void;
  onDelete: (id: string) => void;
  onManageUsers?: () => void;
}

const NATIVE_ICON_STYLES = [
  'bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-900 text-white shadow-blue-600/35 ring-1 ring-blue-400/30',
  'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 text-white shadow-orange-500/35 ring-1 ring-orange-400/30',
  'bg-gradient-to-br from-emerald-400 via-teal-600 to-emerald-800 text-white shadow-emerald-600/35 ring-1 ring-emerald-400/30',
  'bg-gradient-to-br from-fuchsia-500 via-purple-600 to-indigo-900 text-white shadow-purple-600/35 ring-1 ring-purple-400/30',
  'bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-700 text-white shadow-sky-500/35 ring-1 ring-sky-400/30',
  'bg-gradient-to-br from-rose-400 via-pink-500 to-rose-700 text-white shadow-pink-500/35 ring-1 ring-pink-400/30',
  'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 text-amber-300 shadow-slate-900/35 ring-1 ring-slate-600/30',
  'bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-700 text-white shadow-cyan-500/35 ring-1 ring-cyan-400/30',
];

export function LinkGrid({ links, loading, isAdmin, isSuperAdmin = false, onAdd, onEdit, onDelete, onManageUsers }: LinkGridProps) {
  const { showConfirm, showToast } = useNotification();
  const { menuOrder, saveMenuOrder } = useMenuOrder();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isReordering, setIsReordering] = useState(false);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    links.forEach(l => {
      if (l.category) {
        // Format to Title Case
        const formatted = l.category.charAt(0).toUpperCase() + l.category.slice(1).toLowerCase();
        cats.add(formatted);
      }
    });
    return ['Semua', ...Array.from(cats)];
  }, [links]);

  const orderedLinks = useMemo(() => {
    if (menuOrder.length === 0) return links;
    const map = new Map(links.map(l => [l.id, l]));
    const result: LinkData[] = [];
    
    // Add links in custom order
    menuOrder.forEach(id => {
      if (map.has(id)) {
        result.push(map.get(id)!);
        map.delete(id);
      }
    });
    
    // Append any newly added links not yet in custom order
    map.forEach(l => result.push(l));
    return result;
  }, [links, menuOrder]);

  const filteredLinks = useMemo(() => {
    return orderedLinks.filter(l => {
      const catMatch = category === 'Semua' || category === 'All' || 
                       (l.category || '').toLowerCase() === category.toLowerCase();
      const searchMatch = l.title.toLowerCase().includes(search.toLowerCase()) || 
                          (l.category || '').toLowerCase().includes(search.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [orderedLinks, category, search]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const moveLinkPosition = (id: string, direction: 'prev' | 'next') => {
    const filteredIndex = filteredLinks.findIndex(l => l.id === id);
    if (filteredIndex === -1) return;

    const targetFilteredIndex = direction === 'prev' ? filteredIndex - 1 : filteredIndex + 1;
    if (targetFilteredIndex < 0 || targetFilteredIndex >= filteredLinks.length) return;

    const currentId = id;
    const targetId = filteredLinks[targetFilteredIndex].id;

    const currentFullOrder = orderedLinks.map(l => l.id);
    const idx1 = currentFullOrder.indexOf(currentId);
    const idx2 = currentFullOrder.indexOf(targetId);

    if (idx1 === -1 || idx2 === -1) return;

    // Swap items in full order
    const newFullOrder = [...currentFullOrder];
    newFullOrder[idx1] = targetId;
    newFullOrder[idx2] = currentId;

    saveMenuOrder(newFullOrder);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isReordering) return;
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isReordering || !draggedId || draggedId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    if (dragOverId === id) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverId(null);
    if (!isReordering || !draggedId || draggedId === targetId) return;

    const currentFullOrder = orderedLinks.map(l => l.id);
    const fromIdx = currentFullOrder.indexOf(draggedId);
    const toIdx = currentFullOrder.indexOf(targetId);

    if (fromIdx !== -1 && toIdx !== -1) {
      const newFullOrder = [...currentFullOrder];
      const [movedItem] = newFullOrder.splice(fromIdx, 1);
      newFullOrder.splice(toIdx, 0, movedItem);

      saveMenuOrder(newFullOrder);
      showToast('Posisi Dipindahkan', 'Tata letak baru telah disimpan secara permanen', 'success');
    }
    setDraggedId(null);
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-300/60">
      {/* Top Header Row matching ToolsGrid exactly */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center border border-blue-900/15 shadow-xs shrink-0">
            <LayoutGrid size={19} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 m-0 leading-tight">
              Daftar Aplikasi & Sistem
            </h2>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Akses cepat seluruh portal web dan sistem operasional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Search Input Box */}
          <div className="relative flex-1 md:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aplikasi atau sistem..." 
              className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Counter Badge */}
          <div className="bg-white border border-slate-200 shadow-2xs rounded-xl px-3 py-1.5 font-bold text-[11px] text-blue-900 tracking-wide flex items-center gap-1.5 shrink-0">
            <Sparkles size={13} className="text-amber-500" />
            <span>{filteredLinks.length} / {links.length} Aplikasi</span>
          </div>

          {/* Admin & Super Admin Actions */}
          {(isAdmin || isSuperAdmin) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {onManageUsers && (
                <button
                  type="button"
                  onClick={onManageUsers}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-300 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Kelola Akun User & PIN Login"
                >
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>User & PIN</span>
                </button>
              )}

              {/* Kelola Daftar Aplikasi & Sistem (Hanya Super Admin) */}
              {isSuperAdmin && (
                <>
                  <button 
                    onClick={() => {
                      const nextReordering = !isReordering;
                      setIsReordering(nextReordering);
                      if (nextReordering) {
                        showToast('Atur Tata Letak', 'Seret & lepas icon atau gunakan tombol panah kiri/kanan untuk menggeser posisi aplikasi', 'info');
                      } else {
                        showToast('Tersimpan', 'Tata letak menu aplikasi telah disimpan secara permanen', 'success');
                      }
                    }} 
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isReordering 
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm animate-pulse' 
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-2xs'
                    }`}
                    title="Atur Urutan Tata Letak Menu (Khusus Super Admin)"
                  >
                    {isReordering ? <Check size={14} /> : <Move size={14} />}
                    <span>{isReordering ? 'Selesai' : 'Atur Urutan'}</span>
                  </button>

                  <button 
                    onClick={onAdd} 
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
                    title="Tambah Aplikasi Baru (Khusus Super Admin)"
                  >
                    <Plus size={14} />
                    <span>Tambah</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 custom-scrollbar">
        {categories.map(cat => {
          const count = (cat === 'Semua' || cat === 'All') 
            ? links.length 
            : links.filter(l => (l.category || '').toLowerCase() === cat.toLowerCase()).length;
          const isActive = category === cat || (cat === 'Semua' && category === 'All');
          return (
            <button 
              key={cat} 
              onClick={() => setCategory(cat)} 
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-blue-900 text-white shadow-xs' 
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span>{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl font-bold text-slate-500 text-sm">
          Memuat Data...
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center my-2 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Search size={22} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Tidak ada aplikasi yang cocok
          </h4>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Tidak ditemukan aplikasi dengan kata kunci <span className="font-semibold text-slate-800">"{search}"</span>.
          </p>
          <button
            type="button"
            onClick={() => { setSearch(''); setCategory('Semua'); }}
            className="px-4 py-1.5 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-950 transition-colors shadow-xs cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-3.5 pb-2">
          {filteredLinks.map((l, index) => {
            const isEmoji = l.icon && !l.icon.startsWith('fa');
            const nativeStyle = NATIVE_ICON_STYLES[index % NATIVE_ICON_STYLES.length];
            const targetUrl = l.url ? (l.url.startsWith('http://') || l.url.startsWith('https://') ? l.url : `https://${l.url}`) : '#';
            
            const isDraggingThis = draggedId === l.id;
            const isDragOverThis = dragOverId === l.id;

            return (
              <a 
                key={l.id} 
                href={isReordering ? undefined : targetUrl}
                target={isReordering ? undefined : "_blank"}
                rel={isReordering ? undefined : "noopener noreferrer"}
                title={`${l.title} - ${l.category || ''}`}
                draggable={isReordering}
                onDragStart={(e) => handleDragStart(e, l.id)}
                onDragOver={(e) => handleDragOver(e, l.id)}
                onDragLeave={(e) => handleDragLeave(e, l.id)}
                onDrop={(e) => handleDrop(e, l.id)}
                onClick={(e) => {
                  if (isReordering) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className={`bg-white border border-slate-200 shadow-2xs p-3 sm:p-3.5 flex flex-col items-center justify-center relative min-h-[105px] sm:min-h-[118px] transition-all duration-200 ease-out group overflow-hidden no-underline text-slate-800 block rounded-xl sm:rounded-2xl ${
                  isReordering ? 'ring-2 ring-orange-400 bg-orange-50/50 cursor-grab active:cursor-grabbing' : 'hover:-translate-y-1 hover:shadow-md hover:border-blue-400 hover:bg-slate-50/70 cursor-pointer'
                } ${isDraggingThis ? 'opacity-40 scale-95' : ''} ${
                  isDragOverThis ? '!ring-4 !ring-blue-500 !bg-blue-100/50 scale-105 shadow-lg' : ''
                }`}
              >
                {/* Control bar for Reordering */}
                {isReordering && (
                  <div className="absolute top-1.5 left-1.5 right-1.5 z-30 flex justify-between items-center pointer-events-auto bg-slate-900 rounded-xl px-1 py-0.5 text-white shadow-md">
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveLinkPosition(l.id, 'prev'); }}
                      disabled={index === 0}
                      className="p-1 hover:bg-white/20 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                      title="Geser Kiri"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <span className="text-[9px] font-bold text-slate-200">Geser</span>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveLinkPosition(l.id, 'next'); }}
                      disabled={index === filteredLinks.length - 1}
                      className="p-1 hover:bg-white/20 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                      title="Geser Kanan"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                )}

                {/* Super Admin Actions or External Link Badge on Hover */}
                {!isReordering && (
                  <div className="absolute top-2 right-2 z-20 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!isSuperAdmin && (
                      <div className="w-6 h-6 rounded-lg bg-blue-900/10 text-blue-900 flex items-center justify-center">
                        <ExternalLink size={12} />
                      </div>
                    )}
                    
                    {isSuperAdmin && (
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(l); }} 
                          className="p-1 rounded-lg bg-blue-900/10 hover:bg-blue-900 hover:text-white text-blue-900 transition-all cursor-pointer"
                          title="Edit Aplikasi (Khusus Super Admin)"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.preventDefault(); 
                            e.stopPropagation(); 
                            showConfirm({
                              title: 'Hapus Aplikasi',
                              message: `Apakah Anda yakin ingin menghapus "${l.title}"?`,
                              confirmText: 'Hapus',
                              cancelText: 'Batal',
                              type: 'danger',
                              onConfirm: () => {
                                onDelete(l.id);
                                showToast('Dihapus', `Aplikasi "${l.title}" telah dihapus`, 'info');
                              }
                            });
                          }} 
                          className="p-1 rounded-lg bg-red-500/10 hover:bg-red-600 hover:text-white text-red-600 transition-all cursor-pointer"
                          title="Hapus Aplikasi (Khusus Super Admin)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Icon Tile (Sleek, Compact & Neat) */}
                <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-md ${nativeStyle} transition-all duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:shadow-lg border border-white/40 overflow-hidden ${
                  isReordering ? 'mt-3' : ''
                }`}>
                  {/* Glossy top-down glass shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none rounded-xl sm:rounded-2xl" />
                  <div className="absolute -top-4 -left-4 w-8 h-8 bg-white/35 rounded-full blur-sm pointer-events-none" />

                  <span className="relative z-10 drop-shadow-sm flex items-center justify-center">
                    {isEmoji ? (
                      <span className="text-xl sm:text-2xl">{l.icon || '📱'}</span>
                    ) : (
                      <i className={`${l.icon || 'fas fa-cubes'} text-white text-base sm:text-lg drop-shadow-xs`} />
                    )}
                  </span>
                </div>

                {/* Title Info */}
                <div className="w-full text-center mt-2 px-0.5 pointer-events-none">
                  <h4 className="font-bold text-xs text-slate-800 m-0 tracking-tight leading-snug break-words group-hover:text-blue-900 transition-colors line-clamp-2 capitalize">
                    {l.title}
                  </h4>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

