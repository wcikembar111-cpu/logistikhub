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
    iconBg: string;
  }[] = [
    {
      id: 'qr-generator',
      title: 'Generator QR Code',
      category: 'Satuan & Massal',
      keywords: 'qr code barcode generator cetak buat link scanner bulk export png pdf',
      icon: <QrCode size={20} className="text-white" />,
      iconBg: 'bg-blue-900'
    },
    {
      id: 'ed-checker',
      title: 'Cek Expired Date',
      category: 'ED & DOY Calculator',
      keywords: 'expired date ed doy calculator kedaluwarsa tanggal sisa hari exp hitung',
      icon: <Calendar size={20} className="text-white" />,
      iconBg: 'bg-orange-500'
    },
    {
      id: 'stock-opname',
      title: 'Stock Opname Suite',
      category: 'LARGO to SAP & BA SO',
      keywords: 'stock opname so suite largo sap ba berita acara selisih audit fisik gudang',
      icon: <Layers size={20} className="text-white" />,
      iconBg: 'bg-blue-900'
    },
    {
      id: 'sn-generator',
      title: 'Generator Serial No',
      category: 'Unique Anti-Duplicate',
      keywords: 'generator serial number sn no unique barcode anti duplicate acak urut',
      icon: <Barcode size={20} className="text-white" />,
      iconBg: 'bg-blue-800'
    },
    {
      id: 'batch-checker',
      title: 'Batch Checker',
      category: 'LARGO vs SAP Compare',
      keywords: 'batch checker largo vs sap compare cek selisih perbandingan data rekonsiliasi',
      icon: <ArrowRightLeft size={20} className="text-white" />,
      iconBg: 'bg-orange-500'
    },
    {
      id: 'promosi',
      title: 'Promosi',
      category: 'Penerimaan Barang Promosi',
      keywords: 'promosi promo penerimaan barang bonus merchandise hadiah receiving logistik',
      icon: <PackageCheck size={20} className="text-white" />,
      iconBg: 'bg-orange-500'
    },
    {
      id: 'surat-jalan',
      title: 'Surat Jalan',
      category: 'Buat, Cetak & Rekap SJ',
      keywords: 'surat jalan delivery order sj cetak rekap buat kirim expedisi driver pengiriman',
      icon: <FileText size={20} className="text-white" />,
      iconBg: 'bg-blue-900'
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
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-200 shadow-2xs">
            <Wrench size={16} />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 m-0 leading-tight">
              Daftar Tools & Utilitas
            </h2>
            <p className="text-xs text-slate-500 font-medium m-0 mt-0.5">
              Akses cepat seluruh alat kerja operasional logistik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Search Input Box */}
          <div className="relative flex-1 md:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tool & utilitas..."
              className="w-full pl-8 pr-7 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl shadow-2xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 shadow-2xs rounded-xl px-2.5 py-1.5 font-bold text-[11px] text-blue-900 tracking-wide flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span>{filteredTools.length} / {tools.length} Tools</span>
          </div>
        </div>
      </div>

      {filteredTools.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-7 text-center my-2 shadow-2xs">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
            <Search size={18} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">
            Tidak ada tool yang cocok
          </h4>
          <p className="text-xs text-slate-500 mb-3 max-w-sm mx-auto">
            Tidak ditemukan tools dengan kata kunci <span className="font-semibold text-slate-800">"{searchQuery}"</span>.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-3.5 py-1.5 rounded-xl bg-blue-900 text-white font-semibold text-xs hover:bg-blue-950 transition-colors shadow-2xs cursor-pointer"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 pb-2">
          {filteredTools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  onSelectTool(t.id);
                }}
                title={`${t.title} - Klik untuk Buka Halaman Tool`}
                className={`bg-white border p-3 flex flex-col items-center justify-center relative min-h-[105px] sm:min-h-[112px] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-xs hover:border-orange-400 cursor-pointer group rounded-xl text-slate-800 ${
                  isActive 
                    ? 'border-2 border-blue-900 ring-2 ring-blue-100 shadow-2xs' 
                    : 'border-slate-200 shadow-2xs'
                }`}
              >
                {/* Active Badge Marker */}
                {isActive && (
                  <div className="absolute top-1.5 right-1.5 bg-blue-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shadow-2xs z-20">
                    AKTIF
                  </div>
                )}

                {/* Pop-Up Button on Hover */}
                {!isActive && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenModal(t.id);
                    }}
                    className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold text-slate-700 hover:text-white bg-slate-100 hover:bg-blue-900 px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Buka dalam Pop-Up Modal"
                  >
                    <span>Pop-Up</span>
                    <ExternalLink size={9} />
                  </button>
                )}

                {/* Main Icon Container - Minimalist Blue / Orange / White */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.iconBg} text-white shadow-2xs transition-transform duration-200 group-hover:scale-105`}>
                  {t.icon}
                </div>

                {/* Title Info - Only title, never truncated */}
                <div className="w-full text-center mt-2.5 px-0.5 pointer-events-none flex items-center justify-center min-h-[32px]">
                  <h4 className="font-bold text-xs text-slate-900 m-0 tracking-tight leading-snug break-words group-hover:text-blue-900 transition-colors">
                    {t.title}
                  </h4>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
