import React, { useState, useMemo } from 'react';
import { QrCode, Wrench, Sparkles, Layers, Calendar, Barcode, ArrowRightLeft, PackageCheck, FileText, ExternalLink, Search, X } from 'lucide-react';
import { MainToolTab } from './EmbeddedToolsWorkspace';

interface ToolsGridProps {
  activeTool?: MainToolTab | null;
  onSelectTool: (tool: MainToolTab) => void;
  onOpenModal: (tool: MainToolTab) => void;
}

export function ToolsGrid({ activeTool, onSelectTool, onOpenModal }: ToolsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const tools: {
    id: MainToolTab;
    title: string;
    category: string;
    keywords: string;
    icon: React.ReactNode;
    style: string;
  }[] = [
    {
      id: 'qr-generator',
      title: 'Generator QR Code',
      category: 'Satuan & Massal',
      keywords: 'qr code barcode generator cetak buat link scanner bulk export png pdf',
      icon: <QrCode size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-950 text-white shadow-indigo-600/35 ring-1 ring-indigo-400/30'
    },
    {
      id: 'ed-checker',
      title: 'Cek Expired Date',
      category: 'ED & DOY Calculator',
      keywords: 'expired date ed doy calculator kedaluwarsa tanggal sisa hari exp hitung',
      icon: <Calendar size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-950 text-white shadow-emerald-600/35 ring-1 ring-emerald-400/30'
    },
    {
      id: 'stock-opname',
      title: 'Stock Opname Suite',
      category: 'LARGO to SAP & BA SO',
      keywords: 'stock opname so suite largo sap ba berita acara selisih audit fisik gudang',
      icon: <Layers size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white shadow-blue-700/35 ring-1 ring-blue-400/30'
    },
    {
      id: 'sn-generator',
      title: 'Generator Serial No',
      category: 'Unique Anti-Duplicate',
      keywords: 'generator serial number sn no unique barcode anti duplicate acak urut',
      icon: <Barcode size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-purple-600 via-violet-800 to-slate-950 text-white shadow-purple-600/35 ring-1 ring-purple-400/30'
    },
    {
      id: 'batch-checker',
      title: 'Batch Checker',
      category: 'LARGO vs SAP Compare',
      keywords: 'batch checker largo vs sap compare cek selisih perbandingan data rekonsiliasi',
      icon: <ArrowRightLeft size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-amber-600 via-orange-700 to-amber-950 text-white shadow-amber-600/35 ring-1 ring-amber-400/30'
    },
    {
      id: 'promosi',
      title: 'Promosi',
      category: 'Penerimaan Barang Promosi',
      keywords: 'promosi promo penerimaan barang bonus merchandise hadiah receiving logistik',
      icon: <PackageCheck size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-orange-600 via-amber-600 to-slate-900 text-white shadow-orange-600/35 ring-1 ring-orange-400/30'
    },
    {
      id: 'surat-jalan',
      title: 'Surat Jalan',
      category: 'Buat, Cetak & Rekap SJ',
      keywords: 'surat jalan delivery order sj cetak rekap buat kirim expedisi driver pengiriman',
      icon: <FileText size={20} className="text-white drop-shadow-xs" />,
      style: 'bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 text-white shadow-blue-600/35 ring-1 ring-blue-400/30'
    }
  ];

  const filteredTools = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.keywords.toLowerCase().includes(q)
    );
  }, [tools, searchQuery]);

  return (
    <div className="mt-10 pt-6 border-t border-slate-300/60">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-900/10 text-blue-900 flex items-center justify-center border border-blue-900/15 shadow-xs">
            <Wrench size={19} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 m-0 leading-tight">
              Daftar Tools & Utilitas
            </h2>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Akses cepat seluruh alat kerja operasional logistik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {/* Search Input Box */}
          <div className="relative flex-1 md:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tool & utilitas..."
              className="w-full pl-9 pr-8 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-xl shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 shadow-2xs rounded-xl px-3 py-1.5 font-bold text-[11px] text-blue-900 tracking-wide flex items-center gap-1.5 shrink-0">
            <Sparkles size={13} className="text-amber-500" />
            <span>{filteredTools.length} / {tools.length} Tools</span>
          </div>
        </div>
      </div>

      {filteredTools.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center my-2 shadow-2xs">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <Search size={22} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Tidak ada tool yang cocok
          </h4>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            Tidak ditemukan tools dengan kata kunci <span className="font-semibold text-slate-800">"{searchQuery}"</span>. Coba kata kunci lain atau reset pencarian.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-4 py-1.5 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-950 transition-colors shadow-xs cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 sm:gap-3.5 pb-2">
          {filteredTools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTool(t.id);
                }}
                title={`${t.title} - Klik untuk Buka Halaman Tool`}
                className={`bg-white border border-slate-200 shadow-2xs p-3 sm:p-3.5 flex flex-col items-center justify-center relative min-h-[105px] sm:min-h-[118px] transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md hover:border-blue-400 hover:bg-slate-50/70 cursor-pointer group overflow-hidden text-slate-800 rounded-xl sm:rounded-2xl ${
                  isActive 
                    ? 'border-2 border-blue-600 ring-4 ring-blue-400/30 shadow-md' 
                    : ''
                }`}
              >
                {/* Active Badge Marker */}
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shadow-xs z-20">
                    AKTIF
                  </div>
                )}

                {/* Pop-Up Button on Hover (Top-Right overlay) */}
                {!isActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenModal(t.id);
                    }}
                    className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold text-blue-900 hover:text-white bg-blue-50 hover:bg-blue-900 px-1.5 py-0.5 rounded-lg border border-blue-200/60 shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Buka dalam Pop-Up Modal"
                  >
                    <span>Pop-Up</span>
                    <ExternalLink size={9} />
                  </button>
                )}

                {/* Visual shine gradient effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/0 via-white/30 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                {/* Main Icon Tile (Sleek, Compact & Neat) */}
                <div className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-md ${t.style} transition-all duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-0.5 group-hover:shadow-lg border border-white/40 overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none rounded-xl sm:rounded-2xl" />
                  <div className="absolute -top-4 -left-4 w-8 h-8 bg-white/35 rounded-full blur-sm pointer-events-none" />
                  <span className="relative z-10 flex items-center justify-center">{t.icon}</span>
                </div>

                {/* Title Info */}
                <div className="w-full text-center mt-2 px-0.5 pointer-events-none">
                  <h4 className="font-bold text-xs text-slate-800 m-0 tracking-tight leading-snug break-words group-hover:text-blue-900 transition-colors line-clamp-1 capitalize">
                    {t.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                    {t.category}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
