import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  X, 
  Search, 
  ShieldCheck, 
  Layers, 
  LayoutGrid, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw,
  Sparkles,
  ExternalLink,
  Wrench,
  Radio
} from 'lucide-react';
import { LinkData } from '../../types';
import { TOOLS_LIST, ToolItemDef } from '../Sidebar';

interface MenuVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkData[];
  hiddenMenuIds: string[];
  onToggleMenu: (id: string, title: string, isCurrentlyHidden: boolean) => void;
  onUnhideAll: () => void;
  isRealtimeConnected: boolean;
}

type TabFilter = 'all' | 'sidebar' | 'grid';
type StatusFilter = 'all' | 'visible' | 'hidden';

export function MenuVisibilityModal({
  isOpen,
  onClose,
  links,
  hiddenMenuIds,
  onToggleMenu,
  onUnhideAll,
  isRealtimeConnected
}: MenuVisibilityModalProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Combine sidebar tools and grid links into unified menu items list
  const allMenuItems = useMemo(() => {
    const sidebarItems = TOOLS_LIST.map((tool) => ({
      id: tool.id,
      title: tool.title,
      category: tool.category,
      type: 'sidebar' as const,
      group: tool.group,
      hasDatabase: tool.hasDatabase,
      iconBg: tool.iconBg,
      icon: tool.icon
    }));

    const gridItems = links.map((link) => ({
      id: link.id,
      title: link.title,
      category: link.category || 'Aplikasi',
      type: 'grid' as const,
      group: 'grid',
      hasDatabase: true,
      url: link.url,
      iconEmoji: link.icon
    }));

    return { sidebarItems, gridItems, combined: [...sidebarItems, ...gridItems] };
  }, [links]);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    let list = allMenuItems.combined;

    if (activeTab === 'sidebar') {
      list = allMenuItems.sidebarItems;
    } else if (activeTab === 'grid') {
      list = allMenuItems.gridItems;
    }

    // Filter by status (visible vs hidden)
    if (statusFilter === 'visible') {
      list = list.filter(item => !hiddenMenuIds.includes(item.id));
    } else if (statusFilter === 'hidden') {
      list = list.filter(item => hiddenMenuIds.includes(item.id));
    }

    // Filter by search query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allMenuItems, activeTab, statusFilter, searchQuery, hiddenMenuIds]);

  const totalHidden = hiddenMenuIds.length;
  const totalMenus = allMenuItems.combined.length;
  const totalVisible = Math.max(0, totalMenus - totalHidden);

  const sidebarHiddenCount = allMenuItems.sidebarItems.filter(i => hiddenMenuIds.includes(i.id)).length;
  const gridHiddenCount = allMenuItems.gridItems.filter(i => hiddenMenuIds.includes(i.id)).length;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 relative overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Dark Gradient & Status */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
                <ShieldCheck size={22} className="text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest text-white/75">
                  <span>Sistem Visibilitas Menu &bull; PIN 399339</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white m-0 tracking-tight">
                  Kelola Hide & Unhide Menu
                </h3>
              </div>
            </div>

            <button 
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X size={16} />
            </button>
          </div>

          {/* Realtime Supabase Banner */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[11px] font-semibold text-slate-300">
                {isRealtimeConnected 
                  ? 'Supabase Realtime Terhubung (Sinkronisasi Otomatis Semua Perangkat)' 
                  : 'Supabase Siap (Sinkronisasi Database & Lokal Aktif)'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <span className="bg-white/10 px-2 py-0.5 rounded-md font-bold text-white">
                {totalVisible} Tampil
              </span>
              <span className={`px-2 py-0.5 rounded-md font-bold ${totalHidden > 0 ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40' : 'bg-white/10 text-white/60'}`}>
                {totalHidden} Tersembunyi
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80 space-y-3 shrink-0">
          {/* Search Input Box */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama menu, tool, atau aplikasi..."
              className="w-full pl-10 pr-9 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Tab Navigation: Semua, Sidebar, Grid */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Semua Menu</span>
                <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded-full font-black text-slate-600">
                  {totalMenus}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sidebar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'sidebar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={13} className="text-blue-600" />
                <span>Menu Sidebar</span>
                {sidebarHiddenCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-black">
                    {sidebarHiddenCount} hide
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={13} className="text-indigo-600" />
                <span>Menu Grid Aplikasi</span>
                {gridHiddenCount > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-black">
                    {gridHiddenCount} hide
                  </span>
                )}
              </button>
            </div>

            {/* Visibility Status Filter Pills */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('visible')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'visible'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <Eye size={12} />
                <span>Ditampilkan</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('hidden')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'hidden'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <EyeOff size={12} />
                <span>Disembunyikan ({totalHidden})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar min-h-[260px]">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                <Search size={20} />
              </div>
              <h4 className="text-sm font-bold text-slate-800 m-0">Tidak ada menu yang sesuai</h4>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? `Tidak ditemukan menu dengan kata kunci "${searchQuery}"` : 'Semua menu dalam kategori ini kosong'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isHidden = hiddenMenuIds.includes(item.id);
              const isSidebar = item.type === 'sidebar';

              return (
                <div
                  key={item.id}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-3 ${
                    isHidden
                      ? 'bg-slate-50/90 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200/90 shadow-2xs hover:border-blue-300'
                  }`}
                >
                  {/* Item Icon and Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Icon container */}
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      isSidebar 
                        ? (item.iconBg || 'bg-blue-600') 
                        : 'bg-gradient-to-br from-indigo-600 to-blue-800'
                    } text-white`}>
                      {isSidebar ? (
                        item.icon
                      ) : (
                        <span className="text-base">{item.iconEmoji || '📱'}</span>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs sm:text-sm font-bold truncate leading-tight m-0 ${
                          isHidden ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}>
                          {item.title}
                        </h4>
                        
                        {/* Type badge */}
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isSidebar 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {isSidebar ? 'Sidebar Tool' : 'Grid Aplikasi'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500 font-medium truncate">
                          {item.category}
                        </span>
                        {item.hasDatabase && (
                          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                            &bull; Database
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator & Hide/Unhide Action Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleMenu(item.id, item.title, isHidden)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs ${
                        isHidden
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 border border-slate-200 hover:border-rose-200'
                      }`}
                      title={isHidden ? `Tampilkan kembali menu "${item.title}"` : `Sembunyikan menu "${item.title}"`}
                    >
                      {isHidden ? (
                        <>
                          <Eye size={13} />
                          <span>Tampilkan (Unhide)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff size={13} />
                          <span>Sembunyikan (Hide)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {totalHidden > 0 && !showConfirmReset && (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                title="Tampilkan kembali seluruh menu yang disembunyikan"
              >
                <RotateCcw size={13} />
                <span>Tampilkan Semua ({totalHidden})</span>
              </button>
            )}

            {showConfirmReset && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 p-1.5 rounded-xl animate-in fade-in">
                <span className="text-[11px] font-bold text-amber-900 px-1">
                  Yakin unhide semua {totalHidden} menu?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUnhideAll();
                    setShowConfirmReset(false);
                  }}
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-lg cursor-pointer"
                >
                  Ya, Tampilkan Semua
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              Selesai & Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
